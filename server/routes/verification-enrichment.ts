import { Router } from "express";
import { db } from "../db";
import { verificationContacts, accounts } from "@shared/schema";
import { eq, and, sql, isNull, or } from "drizzle-orm";
import { CompanyEnrichmentService } from "../lib/company-enrichment";

const router = Router();

// Helper: Sleep for specified milliseconds
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Retry with exponential backoff for 429/5xx errors
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error (429) or server error (5xx)
      const is429 = error.message?.includes('429') || error.status === 429;
      const is5xx = error.status >= 500 && error.status < 600;
      
      if (!is429 && !is5xx) {
        // Not a retryable error, throw immediately
        throw error;
      }
      
      if (attempt < maxAttempts) {
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.log(`[Retry] Attempt ${attempt} failed (${error.message}), retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

interface EnrichmentProgress {
  total: number;
  processed: number;
  addressEnriched: number;
  phoneEnriched: number;
  failed: number;
  errors: Array<{ contactId: string; name: string; error: string }>;
}

/**
 * POST /api/verification-campaigns/:campaignId/enrich
 * Trigger AI enrichment for eligible contacts in a campaign
 * Enriches both address and phone number in a single operation
 * 
 * Features:
 * - Separate confidence thresholds (≥0.7) for address and phone data
 * - Only enriches incomplete data (missing any required field)
 * - Preserves previously completed enrichments during errors
 * - force=true: Re-enriches even completed data (use for data refresh)
 */
router.post("/api/verification-campaigns/:campaignId/enrich", async (req, res) => {
  const { campaignId } = req.params;
  const { force = false, batchSize = 50, delayMs = 1500 } = req.body; // Configurable batch size and delay

  try {
    console.log(`[Enrichment] Starting enrichment for campaign ${campaignId} (batch: ${batchSize}, delay: ${delayMs}ms)`);

    // Get eligible contacts that need enrichment (only OK emails)
    const query = db
      .select({
        id: verificationContacts.id,
        fullName: verificationContacts.fullName,
        accountId: verificationContacts.accountId,
        accountName: accounts.name,
        contactCountry: verificationContacts.contactCountry,
        hqCountry: verificationContacts.hqCountry,
        aiEnrichedAddress1: verificationContacts.aiEnrichedAddress1,
        aiEnrichedAddress2: verificationContacts.aiEnrichedAddress2,
        aiEnrichedAddress3: verificationContacts.aiEnrichedAddress3,
        aiEnrichedCity: verificationContacts.aiEnrichedCity,
        aiEnrichedState: verificationContacts.aiEnrichedState,
        aiEnrichedPostal: verificationContacts.aiEnrichedPostal,
        aiEnrichedPhone: verificationContacts.aiEnrichedPhone,
        addressEnrichmentStatus: verificationContacts.addressEnrichmentStatus,
        phoneEnrichmentStatus: verificationContacts.phoneEnrichmentStatus,
      })
      .from(verificationContacts)
      .leftJoin(accounts, eq(verificationContacts.accountId, accounts.id))
      .where(
        and(
          eq(verificationContacts.campaignId, campaignId),
          eq(verificationContacts.eligibilityStatus, 'Eligible'),
          eq(verificationContacts.emailStatus, 'ok'), // Only enrich contacts with valid emails
          eq(verificationContacts.deleted, false),
          eq(verificationContacts.suppressed, false)
        )
      );

    const eligibleContacts = await query;

    // Filter contacts that need enrichment using service methods
    const contactsNeedingEnrichment = eligibleContacts.filter(contact => {
      const needsAddress = CompanyEnrichmentService.needsAddressEnrichment(contact);
      const needsPhone = CompanyEnrichmentService.needsPhoneEnrichment(contact);
      
      if (force) {
        return needsAddress || needsPhone;
      }
      
      const addressNotEnriched = contact.addressEnrichmentStatus !== 'completed';
      const phoneNotEnriched = contact.phoneEnrichmentStatus !== 'completed';
      
      return (needsAddress && addressNotEnriched) || (needsPhone && phoneNotEnriched);
    });

    if (contactsNeedingEnrichment.length === 0) {
      return res.json({
        message: "No eligible contacts need enrichment",
        progress: {
          total: 0,
          processed: 0,
          addressEnriched: 0,
          phoneEnriched: 0,
          failed: 0,
          errors: [],
        }
      });
    }

    // Limit batch to prevent overwhelming
    const effectiveBatchSize = Math.min(batchSize, contactsNeedingEnrichment.length);
    const contactsToEnrich = contactsNeedingEnrichment.slice(0, effectiveBatchSize);

    const progress: EnrichmentProgress = {
      total: contactsToEnrich.length, // Set to actual number being processed, not total eligible
      processed: 0,
      addressEnriched: 0,
      phoneEnriched: 0,
      failed: 0,
      errors: [],
    };

    console.log(`[Enrichment] Found ${contactsNeedingEnrichment.length} contacts needing enrichment, processing ${contactsToEnrich.length} in this batch`);

    // Circuit breaker: Stop if too many consecutive failures
    const CIRCUIT_BREAKER_THRESHOLD = 10;
    let consecutiveFailures = 0;
    let circuitBroken = false;

    console.log(`[Enrichment] Processing ${contactsToEnrich.length} contacts sequentially with ${delayMs}ms delay`);

    // Process contacts SEQUENTIALLY to avoid rate limits
    for (let i = 0; i < contactsToEnrich.length; i++) {
      if (circuitBroken) {
        console.log(`[Enrichment] Circuit breaker triggered - stopping enrichment`);
        progress.errors.push({
          contactId: 'CIRCUIT_BREAKER',
          name: 'System',
          error: `Stopped after ${consecutiveFailures} consecutive failures to prevent further rate limiting`,
        });
        break;
      }

      const contact = contactsToEnrich[i];
      
      try {
        if (!contact.accountName) {
          progress.failed++;
          consecutiveFailures++;
          progress.errors.push({
            contactId: contact.id,
            name: contact.fullName,
            error: "No company name available",
          });
          
          // Check circuit breaker
          if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
            circuitBroken = true;
          }
          continue;
        }

        // Mark as in progress
        await db.update(verificationContacts)
          .set({
            addressEnrichmentStatus: CompanyEnrichmentService.needsAddressEnrichment(contact) 
              ? 'in_progress' 
              : contact.addressEnrichmentStatus,
            phoneEnrichmentStatus: CompanyEnrichmentService.needsPhoneEnrichment(contact)
              ? 'in_progress'
              : contact.phoneEnrichmentStatus,
            updatedAt: new Date(),
          })
          .where(eq(verificationContacts.id, contact.id));

        // Call enrichment service with retry logic for 429/5xx errors
        const result = await retryWithBackoff(
          () => CompanyEnrichmentService.enrichCompanyData(contact, contact.accountName!),
          3, // max attempts
          1000 // base delay ms
        );

            const updateData: any = {
              updatedAt: new Date(),
            };

        const CONFIDENCE_THRESHOLD = 0.7;

        // Handle address enrichment result - only save if addressConfidence >= 0.7
        // Save to AI Enrichment fields (separate from contact/HQ fields, based on Contact Country only)
        if (result.address && result.addressConfidence !== undefined) {
          if (result.addressConfidence >= CONFIDENCE_THRESHOLD) {
            updateData.aiEnrichedAddress1 = result.address.address1;
            updateData.aiEnrichedAddress2 = result.address.address2 || null;
            updateData.aiEnrichedAddress3 = result.address.address3 || null;
            updateData.aiEnrichedCity = result.address.city;
            updateData.aiEnrichedState = result.address.state;
            updateData.aiEnrichedPostal = result.address.postalCode;
            updateData.aiEnrichedCountry = result.address.country;
            updateData.addressEnrichmentStatus = 'completed';
            updateData.addressEnrichedAt = new Date();
            updateData.addressEnrichmentError = null;
            progress.addressEnriched++;
            console.log(`[Enrichment] AI enriched address for ${contact.fullName} (confidence: ${result.addressConfidence})`);
          } else {
            updateData.addressEnrichmentStatus = 'failed';
            updateData.addressEnrichmentError = `Low confidence: ${result.addressConfidence.toFixed(2)} < ${CONFIDENCE_THRESHOLD}`;
            console.log(`[Enrichment] Rejected low-confidence address for ${contact.fullName} (confidence: ${result.addressConfidence})`);
          }
        } else if (result.addressError) {
          updateData.addressEnrichmentStatus = 'failed';
          updateData.addressEnrichmentError = result.addressError;
        }

        // Handle phone enrichment result - only save if phoneConfidence >= 0.7
        // Save to AI Enrichment phone field (separate from contact/HQ phone, based on Contact Country only)
        if (result.phone && result.phoneConfidence !== undefined) {
          if (result.phoneConfidence >= CONFIDENCE_THRESHOLD) {
            updateData.aiEnrichedPhone = result.phone;
            updateData.phoneEnrichmentStatus = 'completed';
            updateData.phoneEnrichedAt = new Date();
            updateData.phoneEnrichmentError = null;
            progress.phoneEnriched++;
            console.log(`[Enrichment] AI enriched phone for ${contact.fullName} (confidence: ${result.phoneConfidence})`);
          } else {
            updateData.phoneEnrichmentStatus = 'failed';
            updateData.phoneEnrichmentError = `Low confidence: ${result.phoneConfidence.toFixed(2)} < ${CONFIDENCE_THRESHOLD}`;
            console.log(`[Enrichment] Rejected low-confidence phone for ${contact.fullName} (confidence: ${result.phoneConfidence})`);
          }
        } else if (result.phoneError) {
          updateData.phoneEnrichmentStatus = 'failed';
          updateData.phoneEnrichmentError = result.phoneError;
        }

        // Update contact with enriched data
        await db.update(verificationContacts)
          .set(updateData)
          .where(eq(verificationContacts.id, contact.id));

        progress.processed++;
        consecutiveFailures = 0; // Reset on success

        console.log(`[Enrichment] Processed ${contact.fullName}: address=${!!result.address}, phone=${!!result.phone}`);

      } catch (error: any) {
        console.error(`[Enrichment] Error processing contact ${contact.id}:`, error);
        consecutiveFailures++;
        
        // Only mark as failed the enrichment types that were actually attempted
        // This preserves previously completed enrichments
        const errorUpdateData: any = {
          updatedAt: new Date(),
        };

        if (CompanyEnrichmentService.needsAddressEnrichment(contact)) {
          errorUpdateData.addressEnrichmentStatus = 'failed';
          errorUpdateData.addressEnrichmentError = error.message;
        }

        if (CompanyEnrichmentService.needsPhoneEnrichment(contact)) {
          errorUpdateData.phoneEnrichmentStatus = 'failed';
          errorUpdateData.phoneEnrichmentError = error.message;
        }

        await db.update(verificationContacts)
          .set(errorUpdateData)
          .where(eq(verificationContacts.id, contact.id));

        progress.failed++;
        progress.errors.push({
          contactId: contact.id,
          name: contact.fullName,
          error: error.message || "Unknown error",
        });

        // Check circuit breaker
        if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
          circuitBroken = true;
        }
      }

      // Delay between contacts to respect rate limits (except after last contact)
      if (i < contactsToEnrich.length - 1) {
        await sleep(delayMs);
      }
    }

    console.log(`[Enrichment] Completed: ${progress.processed}/${progress.total}, Address: ${progress.addressEnriched}, Phone: ${progress.phoneEnriched}, Failed: ${progress.failed}`);

    // Calculate remaining contacts after this batch (accounting for circuit breaker and early exits)
    const actualProcessed = progress.processed + progress.failed;
    const remainingInBatch = contactsToEnrich.length - actualProcessed;
    const remainingInQueue = contactsNeedingEnrichment.length - actualProcessed;
    const totalRemaining = remainingInQueue;

    const message = circuitBroken
      ? `Circuit breaker triggered after ${progress.failed} failures. ${totalRemaining} contacts still need enrichment. Please wait before retrying.`
      : totalRemaining > 0
        ? `Batch completed. ${totalRemaining} contacts still need enrichment - click "Enrich Company Data" again to continue.`
        : "All eligible contacts enriched";

    res.json({
      message,
      progress,
      remainingCount: totalRemaining,
      totalEligible: contactsNeedingEnrichment.length,
      circuitBroken,
    });
  } catch (error: any) {
    console.error("[Enrichment] Error:", error);
    res.status(500).json({ 
      error: "Failed to enrich contacts",
      details: error.message 
    });
  }
});

/**
 * POST /api/verification-contacts/:contactId/enrich
 * Trigger AI enrichment for a single contact
 */
router.post("/api/verification-contacts/:contactId/enrich", async (req, res) => {
  const { contactId } = req.params;
  const { force = false } = req.body;

  try {
    console.log(`[Enrichment] Starting single-contact enrichment for ${contactId}`);

    // Get the contact with account info
    const contactResult = await db
      .select({
        id: verificationContacts.id,
        fullName: verificationContacts.fullName,
        accountId: verificationContacts.accountId,
        accountName: accounts.name,
        contactCountry: verificationContacts.contactCountry,
        hqCountry: verificationContacts.hqCountry,
        hqAddress1: verificationContacts.hqAddress1,
        hqCity: verificationContacts.hqCity,
        hqState: verificationContacts.hqState,
        hqPostal: verificationContacts.hqPostal,
        hqPhone: verificationContacts.hqPhone,
        addressEnrichmentStatus: verificationContacts.addressEnrichmentStatus,
        phoneEnrichmentStatus: verificationContacts.phoneEnrichmentStatus,
        eligibilityStatus: verificationContacts.eligibilityStatus,
        emailStatus: verificationContacts.emailStatus,
        deleted: verificationContacts.deleted,
        suppressed: verificationContacts.suppressed,
      })
      .from(verificationContacts)
      .leftJoin(accounts, eq(verificationContacts.accountId, accounts.id))
      .where(eq(verificationContacts.id, contactId));

    if (contactResult.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const contact = contactResult[0];

    // Server-side guards: only enrich eligible, non-suppressed, non-deleted contacts with valid emails
    if (contact.deleted) {
      return res.status(400).json({ error: "Cannot enrich deleted contact" });
    }

    if (contact.suppressed) {
      return res.status(400).json({ error: "Cannot enrich suppressed contact" });
    }

    if (contact.eligibilityStatus !== 'Eligible' && !force) {
      return res.status(400).json({ error: "Contact must be eligible for enrichment" });
    }

    if (contact.emailStatus !== 'ok' && !force) {
      return res.status(400).json({ error: "Contact must have a valid email (OK status) for enrichment" });
    }

    // Check if contact needs enrichment
    const needsAddress = CompanyEnrichmentService.needsAddressEnrichment(contact);
    const needsPhone = CompanyEnrichmentService.needsPhoneEnrichment(contact);

    if (!force && !needsAddress && !needsPhone) {
      return res.json({
        message: "Contact does not need enrichment",
        addressEnriched: false,
        phoneEnriched: false,
      });
    }

    if (!contact.accountName) {
      return res.status(400).json({ error: "No company name available for enrichment" });
    }

    const CONFIDENCE_THRESHOLD = 0.7;

    // Perform enrichment
    const result = await CompanyEnrichmentService.enrichCompanyData(
      contact as any,
      contact.accountName
    );

    const updateData: any = {
      updatedAt: new Date(),
    };

    let addressEnriched = false;
    let phoneEnriched = false;

    // Handle address enrichment result
    if (result.address && result.addressConfidence !== undefined) {
      if (result.addressConfidence >= CONFIDENCE_THRESHOLD) {
        updateData.contactAddress1 = result.address.address1;
        updateData.contactAddress2 = result.address.address2 || null;
        updateData.contactAddress3 = result.address.address3 || null;
        updateData.contactCity = result.address.city;
        updateData.contactState = result.address.state;
        updateData.contactPostal = result.address.postalCode;
        updateData.contactCountry = result.address.country;
        updateData.addressEnrichmentStatus = 'completed';
        updateData.addressEnrichedAt = new Date();
        updateData.addressEnrichmentError = null;
        addressEnriched = true;
        console.log(`[Enrichment] Contact address enriched for ${contact.fullName} (confidence: ${result.addressConfidence})`);
      } else {
        updateData.addressEnrichmentStatus = 'failed';
        updateData.addressEnrichmentError = `Low confidence: ${result.addressConfidence.toFixed(2)} < ${CONFIDENCE_THRESHOLD}`;
        console.log(`[Enrichment] Rejected low-confidence address for ${contact.fullName} (confidence: ${result.addressConfidence})`);
      }
    } else if (result.addressError) {
      updateData.addressEnrichmentStatus = 'failed';
      updateData.addressEnrichmentError = result.addressError;
    }

    // Handle phone enrichment result
    if (result.phone && result.phoneConfidence !== undefined) {
      if (result.phoneConfidence >= CONFIDENCE_THRESHOLD) {
        updateData.hqPhone = result.phone; // Save to hqPhone field (LOCAL office phone)
        updateData.phoneEnrichmentStatus = 'completed';
        updateData.phoneEnrichedAt = new Date();
        updateData.phoneEnrichmentError = null;
        phoneEnriched = true;
        console.log(`[Enrichment] Contact phone enriched for ${contact.fullName} (confidence: ${result.phoneConfidence})`);
      } else {
        updateData.phoneEnrichmentStatus = 'failed';
        updateData.phoneEnrichmentError = `Low confidence: ${result.phoneConfidence.toFixed(2)} < ${CONFIDENCE_THRESHOLD}`;
        console.log(`[Enrichment] Rejected low-confidence phone for ${contact.fullName} (confidence: ${result.phoneConfidence})`);
      }
    } else if (result.phoneError) {
      updateData.phoneEnrichmentStatus = 'failed';
      updateData.phoneEnrichmentError = result.phoneError;
    }

    // Update contact with enriched data
    await db.update(verificationContacts)
      .set(updateData)
      .where(eq(verificationContacts.id, contactId));

    // CRITICAL: After updating contact, also update account fields if they're empty
    if (contact.accountId && (result.address || result.phone)) {
      // Fetch current account data to check which fields are empty
      const [account] = await db
        .select({
          id: accounts.id,
          hqStreet1: accounts.hqStreet1,
          hqCity: accounts.hqCity,
          hqState: accounts.hqState,
          hqPostalCode: accounts.hqPostalCode,
          hqCountry: accounts.hqCountry,
          mainPhone: accounts.mainPhone,
        })
        .from(accounts)
        .where(eq(accounts.id, contact.accountId));

      if (account) {
        const accountUpdates: any = {};

        // Update account address if empty and we got enriched address with sufficient confidence
        if (result.address && result.addressConfidence !== undefined && result.addressConfidence >= CONFIDENCE_THRESHOLD) {
          if (!account.hqStreet1 && result.address.address1) {
            accountUpdates.hqStreet1 = result.address.address1;
          }
          if (!account.hqCity && result.address.city) {
            accountUpdates.hqCity = result.address.city;
          }
          if (!account.hqState && result.address.state) {
            accountUpdates.hqState = result.address.state;
          }
          if (!account.hqPostalCode && result.address.postalCode) {
            accountUpdates.hqPostalCode = result.address.postalCode;
          }
          if (!account.hqCountry && result.address.country) {
            accountUpdates.hqCountry = result.address.country;
          }
        }

        // Update account phone if empty and we got enriched phone with sufficient confidence
        if (result.phone && result.phoneConfidence !== undefined && result.phoneConfidence >= CONFIDENCE_THRESHOLD && !account.mainPhone) {
          accountUpdates.mainPhone = result.phone;
        }

        // Apply updates if any
        if (Object.keys(accountUpdates).length > 0) {
          await db.update(accounts)
            .set({ ...accountUpdates, updatedAt: new Date() })
            .where(eq(accounts.id, contact.accountId));
          
          console.log(`[Enrichment] Updated account ${contact.accountId} with enriched data:`, Object.keys(accountUpdates));
        }
      }
    }

    console.log(`[Enrichment] Single contact enriched: ${contact.fullName}, address=${addressEnriched}, phone=${phoneEnriched}`);

    res.json({
      message: "Contact enriched successfully",
      addressEnriched,
      phoneEnriched,
      addressConfidence: result.addressConfidence,
      phoneConfidence: result.phoneConfidence,
    });

  } catch (error: any) {
    console.error(`[Enrichment] Error enriching contact ${contactId}:`, error);
    res.status(500).json({ 
      error: "Failed to enrich contact",
      details: error.message 
    });
  }
});

/**
 * GET /api/verification-campaigns/:campaignId/enrichment-stats
 * Get enrichment statistics for a campaign
 */
router.get("/api/verification-campaigns/:campaignId/enrichment-stats", async (req, res) => {
  const { campaignId } = req.params;

  try {
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE eligibility_status = 'Eligible' AND deleted = FALSE AND suppressed = FALSE) as eligible_count,
        COUNT(*) FILTER (WHERE address_enrichment_status = 'completed') as address_enriched_count,
        COUNT(*) FILTER (WHERE phone_enrichment_status = 'completed') as phone_enriched_count,
        COUNT(*) FILTER (WHERE address_enrichment_status = 'failed') as address_failed_count,
        COUNT(*) FILTER (WHERE phone_enrichment_status = 'failed') as phone_failed_count,
        COUNT(*) FILTER (WHERE (hq_address_1 IS NULL OR hq_city IS NULL) AND address_enrichment_status != 'completed') as needs_address_count,
        COUNT(*) FILTER (WHERE hq_phone IS NULL AND phone_enrichment_status != 'completed') as needs_phone_count
      FROM verification_contacts
      WHERE campaign_id = ${campaignId}
        AND eligibility_status = 'Eligible'
        AND deleted = FALSE
        AND suppressed = FALSE
    `);

    const row = stats.rows[0] as any;

    res.json({
      eligibleCount: Number(row.eligible_count || 0),
      addressEnriched: Number(row.address_enriched_count || 0),
      phoneEnriched: Number(row.phone_enriched_count || 0),
      addressFailed: Number(row.address_failed_count || 0),
      phoneFailed: Number(row.phone_failed_count || 0),
      needsAddress: Number(row.needs_address_count || 0),
      needsPhone: Number(row.needs_phone_count || 0),
    });
  } catch (error: any) {
    console.error("[Enrichment] Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch enrichment stats" });
  }
});

export default router;
