import { Router } from "express";
import { db } from "../db";
import { verificationContacts, accounts } from "@shared/schema";
import { eq, and, sql, isNull, or } from "drizzle-orm";
import { CompanyEnrichmentService } from "../lib/company-enrichment";

const router = Router();

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
  const { force = false } = req.body; // Force re-enrichment even if already enriched

  try {
    console.log(`[Enrichment] Starting enrichment for campaign ${campaignId}`);

    // Get eligible contacts that need enrichment
    const query = db
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
      })
      .from(verificationContacts)
      .leftJoin(accounts, eq(verificationContacts.accountId, accounts.id))
      .where(
        and(
          eq(verificationContacts.campaignId, campaignId),
          eq(verificationContacts.eligibilityStatus, 'Eligible'),
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

    const progress: EnrichmentProgress = {
      total: contactsNeedingEnrichment.length,
      processed: 0,
      addressEnriched: 0,
      phoneEnriched: 0,
      failed: 0,
      errors: [],
    };

    console.log(`[Enrichment] Found ${contactsNeedingEnrichment.length} contacts needing enrichment`);

    // Process contacts in batches to avoid overwhelming the API
    const BATCH_SIZE = 5;
    const DELAY_MS = 1000; // 1 second delay between batches

    for (let i = 0; i < contactsNeedingEnrichment.length; i += BATCH_SIZE) {
      const batch = contactsNeedingEnrichment.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (contact) => {
          try {
            if (!contact.accountName) {
              progress.failed++;
              progress.errors.push({
                contactId: contact.id,
                name: contact.fullName,
                error: "No company name available",
              });
              return;
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

            // Call enrichment service
            const result = await CompanyEnrichmentService.enrichCompanyData(
              contact,
              contact.accountName
            );

            const updateData: any = {
              updatedAt: new Date(),
            };

            const CONFIDENCE_THRESHOLD = 0.7;

            // Handle address enrichment result - only save if addressConfidence >= 0.7
            // Save to CONTACT-level fields (local office address where the contact works)
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
                progress.addressEnriched++;
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

            // Handle phone enrichment result - only save if phoneConfidence >= 0.7
            // Save to contact's direct phone (local office phone where the contact works)
            if (result.phone && result.phoneConfidence !== undefined) {
              if (result.phoneConfidence >= CONFIDENCE_THRESHOLD) {
                updateData.directPhone = result.phone;
                updateData.phoneEnrichmentStatus = 'completed';
                updateData.phoneEnrichedAt = new Date();
                updateData.phoneEnrichmentError = null;
                progress.phoneEnriched++;
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
              .where(eq(verificationContacts.id, contact.id));

            progress.processed++;

            console.log(`[Enrichment] Processed ${contact.fullName}: address=${!!result.address}, phone=${!!result.phone}`);

          } catch (error: any) {
            console.error(`[Enrichment] Error processing contact ${contact.id}:`, error);
            
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
          }
        })
      );

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < contactsNeedingEnrichment.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log(`[Enrichment] Completed: ${progress.processed}/${progress.total}, Address: ${progress.addressEnriched}, Phone: ${progress.phoneEnriched}, Failed: ${progress.failed}`);

    res.json({
      message: "Enrichment completed",
      progress,
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
