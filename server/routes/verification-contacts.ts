import { Router } from "express";
import { db } from "../db";
import {
  verificationContacts,
  verificationCampaigns,
  verificationLeadSubmissions,
  verificationAuditLog,
  accounts,
  verificationEmailValidations,
  verificationEmailValidationJobs,
  insertVerificationContactSchema,
} from "@shared/schema";
import { eq, sql, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { evaluateEligibility, computeNormalizedKeys } from "../lib/verification-utils";
import { applySuppressionForContacts } from "../lib/verification-suppression";
import { requireAuth } from "../auth";
import { exportVerificationContactsToCsv, createCsvDownloadResponse } from "../lib/csv-export";

const router = Router();

router.get("/api/verification-campaigns/:campaignId/queue", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const limit = Number(req.query.limit) || 50;
    const contactSearch = req.query.contactSearch as string || "";
    const phoneSearch = req.query.phoneSearch as string || "";
    const companySearch = req.query.companySearch as string || "";
    const sourceType = req.query.sourceType as string || "";
    const country = req.query.country as string || "";
    const eligibilityStatus = req.query.eligibilityStatus as string || "";
    const emailStatus = req.query.emailStatus as string || "";
    const verificationStatus = req.query.verificationStatus as string || "";
    const hasPhone = req.query.hasPhone as string || "";
    const hasAddress = req.query.hasAddress as string || "";
    const hasCav = req.query.hasCav as string || "";
    
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, campaignId));
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    const cap = campaign.leadCapPerAccount;
    
    // Build dynamic filter conditions
    const filterConditions = [];
    
    if (contactSearch) {
      filterConditions.push(sql`(
        LOWER(c.full_name) LIKE ${`%${contactSearch.toLowerCase()}%`}
        OR LOWER(c.email) LIKE ${`%${contactSearch.toLowerCase()}%`}
        OR LOWER(c.phone) LIKE ${`%${contactSearch.toLowerCase()}%`}
        OR LOWER(c.mobile) LIKE ${`%${contactSearch.toLowerCase()}%`}
      )`);
    }
    
    if (phoneSearch) {
      filterConditions.push(sql`(
        LOWER(c.phone) LIKE ${`%${phoneSearch.toLowerCase()}%`}
        OR LOWER(c.mobile) LIKE ${`%${phoneSearch.toLowerCase()}%`}
      )`);
    }
    
    if (sourceType) {
      filterConditions.push(sql`c.source_type = ${sourceType}`);
    }
    
    if (country) {
      filterConditions.push(sql`LOWER(c.contact_country) LIKE ${`%${country.toLowerCase()}%`}`);
    }
    
    if (eligibilityStatus) {
      filterConditions.push(sql`c.eligibility_status = ${eligibilityStatus}`);
    }
    
    if (emailStatus) {
      filterConditions.push(sql`c.email_status = ${emailStatus}`);
    }
    
    if (verificationStatus) {
      filterConditions.push(sql`c.verification_status = ${verificationStatus}`);
    }
    
    if (hasPhone === 'yes') {
      filterConditions.push(sql`c.phone IS NOT NULL AND c.phone != ''`);
    } else if (hasPhone === 'no') {
      filterConditions.push(sql`(c.phone IS NULL OR c.phone = '')`);
    }
    
    if (hasAddress === 'yes') {
      filterConditions.push(sql`c.contact_address1 IS NOT NULL AND c.contact_address1 != '' AND c.contact_city IS NOT NULL AND c.contact_city != ''`);
    } else if (hasAddress === 'no') {
      filterConditions.push(sql`(c.contact_address1 IS NULL OR c.contact_address1 = '' OR c.contact_city IS NULL OR c.contact_city = '')`);
    }
    
    if (hasCav === 'yes') {
      filterConditions.push(sql`((c.cav_id IS NOT NULL AND c.cav_id != '') OR (c.cav_user_id IS NOT NULL AND c.cav_user_id != ''))`);
    } else if (hasCav === 'no') {
      filterConditions.push(sql`((c.cav_id IS NULL OR c.cav_id = '') AND (c.cav_user_id IS NULL OR c.cav_user_id = ''))`);
    }
    
    const filterSQL = filterConditions.length > 0 
      ? sql`AND ${sql.join(filterConditions, sql` AND `)}`
      : sql``;
    
    // Base WHERE conditions (can be overridden by filters)
    let baseConditions = sql`c.campaign_id = ${campaignId}
      AND c.suppressed = FALSE
      AND c.deleted = FALSE
      AND c.in_submission_buffer = FALSE`;
    
    // If no specific eligibility or verification filters, apply defaults
    if (!eligibilityStatus && !verificationStatus) {
      baseConditions = sql`${baseConditions}
        AND c.eligibility_status = 'Eligible'
        AND c.verification_status = 'Pending'`;
    }
    
    const queueItems = await db.execute(sql`
      WITH next_batch AS (
        SELECT c.id
        FROM verification_contacts c
        WHERE ${baseConditions}
          AND (
            SELECT COUNT(*) FROM verification_lead_submissions s
            WHERE s.account_id = c.account_id AND s.campaign_id = ${campaignId}
          ) < ${cap}
          ${filterSQL}
          ${companySearch ? sql`AND c.account_id IN (
            SELECT id FROM accounts WHERE LOWER(name) LIKE ${`%${companySearch.toLowerCase()}%`}
          )` : sql``}
        ORDER BY c.priority_score DESC NULLS LAST, c.updated_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      SELECT 
        c.*,
        a.name as account_name,
        a.hq_city,
        a.hq_country,
        a.custom_fields as account_custom_fields
      FROM verification_contacts c
      JOIN next_batch nb ON nb.id = c.id
      LEFT JOIN accounts a ON a.id = c.account_id
    `);
    
    res.json({ data: queueItems.rows, total: queueItems.rowCount || 0 });
  } catch (error) {
    console.error("Error fetching queue:", error);
    res.status(500).json({ error: "Failed to fetch queue" });
  }
});

router.get("/api/verification-campaigns/:campaignId/queue/all-ids", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const contactSearch = req.query.contactSearch as string || "";
    const phoneSearch = req.query.phoneSearch as string || "";
    const companySearch = req.query.companySearch as string || "";
    const sourceType = req.query.sourceType as string || "";
    const country = req.query.country as string || "";
    const eligibilityStatus = req.query.eligibilityStatus as string || "";
    const emailStatus = req.query.emailStatus as string || "";
    const verificationStatus = req.query.verificationStatus as string || "";
    const hasPhone = req.query.hasPhone as string || "";
    const hasAddress = req.query.hasAddress as string || "";
    const hasCav = req.query.hasCav as string || "";
    
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, campaignId));
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    const cap = campaign.leadCapPerAccount;
    
    // Build dynamic filter conditions
    const filterConditions = [];
    
    if (contactSearch) {
      filterConditions.push(sql`(
        LOWER(c.full_name) LIKE ${`%${contactSearch.toLowerCase()}%`}
        OR LOWER(c.email) LIKE ${`%${contactSearch.toLowerCase()}%`}
        OR LOWER(c.phone) LIKE ${`%${contactSearch.toLowerCase()}%`}
        OR LOWER(c.mobile) LIKE ${`%${contactSearch.toLowerCase()}%`}
      )`);
    }
    
    if (phoneSearch) {
      filterConditions.push(sql`(
        LOWER(c.phone) LIKE ${`%${phoneSearch.toLowerCase()}%`}
        OR LOWER(c.mobile) LIKE ${`%${phoneSearch.toLowerCase()}%`}
      )`);
    }
    
    if (sourceType) {
      filterConditions.push(sql`c.source_type = ${sourceType}`);
    }
    
    if (country) {
      filterConditions.push(sql`LOWER(c.contact_country) LIKE ${`%${country.toLowerCase()}%`}`);
    }
    
    if (eligibilityStatus) {
      filterConditions.push(sql`c.eligibility_status = ${eligibilityStatus}`);
    }
    
    if (emailStatus) {
      filterConditions.push(sql`c.email_status = ${emailStatus}`);
    }
    
    if (verificationStatus) {
      filterConditions.push(sql`c.verification_status = ${verificationStatus}`);
    }
    
    if (hasPhone === 'yes') {
      filterConditions.push(sql`c.phone IS NOT NULL AND c.phone != ''`);
    } else if (hasPhone === 'no') {
      filterConditions.push(sql`(c.phone IS NULL OR c.phone = '')`);
    }
    
    if (hasAddress === 'yes') {
      filterConditions.push(sql`c.contact_address1 IS NOT NULL AND c.contact_address1 != '' AND c.contact_city IS NOT NULL AND c.contact_city != ''`);
    } else if (hasAddress === 'no') {
      filterConditions.push(sql`(c.contact_address1 IS NULL OR c.contact_address1 = '' OR c.contact_city IS NULL OR c.contact_city = '')`);
    }
    
    if (hasCav === 'yes') {
      filterConditions.push(sql`((c.cav_id IS NOT NULL AND c.cav_id != '') OR (c.cav_user_id IS NOT NULL AND c.cav_user_id != ''))`);
    } else if (hasCav === 'no') {
      filterConditions.push(sql`((c.cav_id IS NULL OR c.cav_id = '') AND (c.cav_user_id IS NULL OR c.cav_user_id = ''))`);
    }
    
    const filterSQL = filterConditions.length > 0 
      ? sql`AND ${sql.join(filterConditions, sql` AND `)}`
      : sql``;
    
    // Base WHERE conditions (can be overridden by filters)
    let baseConditions = sql`c.campaign_id = ${campaignId}
      AND c.suppressed = FALSE
      AND c.deleted = FALSE
      AND c.in_submission_buffer = FALSE`;
    
    // If no specific eligibility or verification filters, apply defaults
    if (!eligibilityStatus && !verificationStatus) {
      baseConditions = sql`${baseConditions}
        AND c.eligibility_status = 'Eligible'
        AND c.verification_status = 'Pending'`;
    }
    
    // Enforce per-account cap: Only select up to 'cap' contacts per account
    // This ensures validation respects the lead cap setting
    const result = await db.execute(sql`
      WITH ranked_contacts AS (
        SELECT 
          c.id,
          c.account_id,
          c.priority_score,
          c.updated_at,
          ROW_NUMBER() OVER (
            PARTITION BY c.account_id 
            ORDER BY c.priority_score DESC NULLS LAST, c.updated_at ASC
          ) as account_rank,
          (
            SELECT COUNT(*) FROM verification_lead_submissions s
            WHERE s.account_id = c.account_id AND s.campaign_id = ${campaignId}
          ) as submitted_count
        FROM verification_contacts c
        WHERE ${baseConditions}
          ${filterSQL}
          ${companySearch ? sql`AND c.account_id IN (
            SELECT id FROM accounts WHERE LOWER(name) LIKE ${`%${companySearch.toLowerCase()}%`}
          )` : sql``}
      )
      SELECT id
      FROM ranked_contacts
      WHERE account_rank <= ${cap} - submitted_count
        AND submitted_count < ${cap}
      ORDER BY priority_score DESC NULLS LAST, updated_at ASC
    `);
    
    const ids = result.rows.map((r: any) => r.id);
    res.json({ ids, total: ids.length });
  } catch (error) {
    console.error("Error fetching all eligible IDs:", error);
    res.status(500).json({ error: "Failed to fetch eligible contact IDs" });
  }
});

router.delete("/api/verification-contacts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deletedContact] = await db
      .update(verificationContacts)
      .set({ 
        deleted: true,
        updatedAt: new Date()
      })
      .where(eq(verificationContacts.id, id))
      .returning();
    
    if (!deletedContact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    res.json({ success: true, id: deletedContact.id });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

router.get("/api/verification-contacts/account/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params;
    const campaignId = req.query.campaignId as string;
    const includeSuppressed = req.query.includeSuppressed === 'true';

    if (!campaignId) {
      return res.status(400).json({ error: "campaignId query parameter is required" });
    }

    const conditions = [
      eq(verificationContacts.accountId, accountId),
      eq(verificationContacts.campaignId, campaignId),
      eq(verificationContacts.deleted, false),
    ];

    if (!includeSuppressed) {
      conditions.push(eq(verificationContacts.suppressed, false));
    }

    const contacts = await db
      .select()
      .from(verificationContacts)
      .where(and(...conditions))
      .orderBy(desc(verificationContacts.verificationStatus), desc(verificationContacts.updatedAt))
      .limit(200);

    res.json(contacts);
  } catch (error) {
    console.error("Error fetching associated contacts:", error);
    res.status(500).json({ error: "Failed to fetch associated contacts" });
  }
});

router.get("/api/verification-contacts/:id", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT 
        c.*,
        a.name as account_name,
        a.domain,
        a.custom_fields as account_custom_fields
      FROM verification_contacts c
      LEFT JOIN accounts a ON a.id = c.account_id
      WHERE c.id = ${req.params.id}
    `);
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

router.post("/api/verification-contacts", async (req, res) => {
  try {
    const validatedData = insertVerificationContactSchema.parse(req.body);
    
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, validatedData.campaignId));
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    const accountName = req.body.accountName;
    const normalizedKeys = computeNormalizedKeys({
      email: validatedData.email,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      contactCountry: validatedData.contactCountry,
      accountName,
    });
    
    const eligibility = evaluateEligibility(
      validatedData.title,
      validatedData.contactCountry,
      campaign
    );
    
    const [contact] = await db
      .insert(verificationContacts)
      .values({
        ...validatedData,
        ...normalizedKeys,
        eligibilityStatus: eligibility.status,
        eligibilityReason: eligibility.reason,
      })
      .returning();
    
    await applySuppressionForContacts(campaign.id, [contact.id]);
    
    const [updatedContact] = await db
      .select()
      .from(verificationContacts)
      .where(eq(verificationContacts.id, contact.id));
    
    res.status(201).json(updatedContact);
  } catch (error) {
    console.error("Error creating contact:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create contact" });
  }
});

router.put("/api/verification-contacts/:id", async (req, res) => {
  try {
    const updateSchema = insertVerificationContactSchema.partial();
    const validatedData = updateSchema.parse(req.body);
    
    const [existingContact] = await db
      .select()
      .from(verificationContacts)
      .where(eq(verificationContacts.id, req.params.id));
    
    if (!existingContact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, existingContact.campaignId));
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    let updates: any = { ...validatedData, updatedAt: new Date() };
    
    if (validatedData.title !== undefined || validatedData.contactCountry !== undefined) {
      const title = validatedData.title ?? existingContact.title;
      const country = validatedData.contactCountry ?? existingContact.contactCountry;
      
      const eligibility = evaluateEligibility(title, country, campaign);
      updates.eligibilityStatus = eligibility.status;
      updates.eligibilityReason = eligibility.reason;
    }
    
    if (validatedData.email || validatedData.firstName || validatedData.lastName || validatedData.contactCountry) {
      const accountName = req.body.accountName;
      const normalizedKeys = computeNormalizedKeys({
        email: validatedData.email ?? existingContact.email,
        firstName: validatedData.firstName ?? existingContact.firstName,
        lastName: validatedData.lastName ?? existingContact.lastName,
        contactCountry: validatedData.contactCountry ?? existingContact.contactCountry,
        accountName,
      });
      updates = { ...updates, ...normalizedKeys };
    }
    
    const [contact] = await db
      .update(verificationContacts)
      .set(updates)
      .where(eq(verificationContacts.id, req.params.id))
      .returning();
    
    await applySuppressionForContacts(campaign.id, [contact.id]);
    
    const [updatedContact] = await db
      .select()
      .from(verificationContacts)
      .where(eq(verificationContacts.id, req.params.id));
    
    res.json(updatedContact);
  } catch (error) {
    console.error("Error updating contact:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update contact" });
  }
});

router.post("/api/verification-contacts/:id/qa", async (req, res) => {
  try {
    const { action, resolution } = req.body;
    
    let qaStatus = 'Unreviewed';
    if (action === 'flag') qaStatus = 'Flagged';
    else if (resolution) qaStatus = resolution;
    
    const [contact] = await db
      .update(verificationContacts)
      .set({ qaStatus: qaStatus as any, updatedAt: new Date() })
      .where(eq(verificationContacts.id, req.params.id))
      .returning();
    
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    res.json({ qaStatus: contact.qaStatus });
  } catch (error) {
    console.error("Error updating QA status:", error);
    res.status(500).json({ error: "Failed to update QA status" });
  }
});

// Removed duplicate /stats endpoint - now handled by verification-campaigns.ts

router.post("/api/verification-contacts/:id/validate-email", async (req, res) => {
  try {
    const { validateAndStoreEmail } = await import("../lib/email-validation-engine");
    
    const [contact] = await db
      .select()
      .from(verificationContacts)
      .where(eq(verificationContacts.id, req.params.id));
    
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    // Preconditions: Manual validation only for contacts with email
    if (!contact.email) {
      return res.status(409).json({ 
        error: "Preconditions not met",
        details: { hasEmail: false }
      });
    }
    
    // Use built-in validator
    const validation = await validateAndStoreEmail(
      contact.id,
      contact.email,
      'api_free',
      { skipSmtp: process.env.SKIP_SMTP_VALIDATION === 'true' }
    );
    
    res.json({
      emailStatus: validation.status,
      checkedAt: validation.validatedAt,
    });
  } catch (error) {
    console.error("Error validating email:", error);
    res.status(500).json({ error: "Failed to validate email" });
  }
});

router.post("/api/verification-contacts/:id/verify", async (req, res) => {
  try {
    const [contact] = await db
      .update(verificationContacts)
      .set({ 
        verificationStatus: 'Validated' as any, 
        updatedAt: new Date() 
      })
      .where(eq(verificationContacts.id, req.params.id))
      .returning();
    
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    res.json({ verificationStatus: contact.verificationStatus });
  } catch (error) {
    console.error("Error verifying contact:", error);
    res.status(500).json({ error: "Failed to verify contact" });
  }
});

router.post("/api/verification-contacts/:id/submit", async (req, res) => {
  try {
    const [contact] = await db
      .select()
      .from(verificationContacts)
      .where(eq(verificationContacts.id, req.params.id));
    
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    if (contact.verificationStatus !== 'Validated') {
      return res.status(400).json({ error: "Contact must be validated before submission" });
    }
    
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, contact.campaignId));
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    const result = await db.transaction(async (tx) => {
      const lockKey = Math.abs(
        parseInt(contact.campaignId.replace(/-/g, '').slice(0, 8), 16) ^
        parseInt((contact.accountId || '00000000').replace(/-/g, '').slice(0, 8), 16)
      ) % 2147483647;
      
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);
      
      const existingSubmission = await tx.execute(sql`
        SELECT id FROM verification_lead_submissions
        WHERE contact_id = ${contact.id}
        LIMIT 1
      `);
      
      if (existingSubmission.rowCount && existingSubmission.rowCount > 0) {
        return { 
          success: true, 
          submissionId: existingSubmission.rows[0].id,
          alreadySubmitted: true 
        };
      }
      
      const submissionCount = await tx.execute(sql`
        SELECT COUNT(*) as count
        FROM verification_lead_submissions
        WHERE account_id = ${contact.accountId} AND campaign_id = ${contact.campaignId}
      `);
      
      const currentCount = Number(submissionCount.rows[0]?.count || 0);
      const cap = campaign.leadCapPerAccount || 10;
      if (currentCount >= cap) {
        // Fetch account name for better error message
        const accountInfo = await tx.execute(sql`
          SELECT name, domain FROM accounts WHERE id = ${contact.accountId}
        `);
        const accountName = accountInfo.rows[0]?.name || contact.accountId;
        throw new Error(JSON.stringify({ 
          type: "cap_reached", 
          accountName, 
          currentCount, 
          cap 
        }));
      }
      
      const [submission] = await tx
        .insert(verificationLeadSubmissions)
        .values({
          campaignId: contact.campaignId,
          contactId: contact.id,
          accountId: contact.accountId,
        })
        .returning();
      
      await tx
        .update(verificationContacts)
        .set({ inSubmissionBuffer: true, updatedAt: new Date() })
        .where(eq(verificationContacts.id, contact.id));
      
      return { success: true, submissionId: submission.id, alreadySubmitted: false };
    });
    
    res.json(result);
  } catch (error: any) {
    console.error("Error submitting contact:", error);
    
    // Handle cap reached error with detailed information
    try {
      const errorData = JSON.parse(error.message);
      if (errorData.type === "cap_reached") {
        return res.status(400).json({ 
          error: "Account cap reached",
          details: {
            accountName: errorData.accountName,
            currentCount: errorData.currentCount,
            cap: errorData.cap,
            message: `Account "${errorData.accountName}" has reached its submission limit (${errorData.currentCount}/${errorData.cap})`
          }
        });
      }
    } catch (parseError) {
      // Not a JSON error, check for old-style error
      if (error.message === "Account cap reached") {
        return res.status(400).json({ error: "Account cap reached" });
      }
    }
    
    res.status(500).json({ error: "Failed to submit contact" });
  }
});

router.post("/api/verification-campaigns/:campaignId/flush", async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const flushedContacts = await db
      .update(verificationContacts)
      .set({ inSubmissionBuffer: false, updatedAt: new Date() })
      .where(
        and(
          eq(verificationContacts.campaignId, campaignId),
          eq(verificationContacts.inSubmissionBuffer, true)
        )
      )
      .returning();
    
    res.json({ 
      success: true, 
      flushedCount: flushedContacts.length 
    });
  } catch (error) {
    console.error("Error flushing buffer:", error);
    res.status(500).json({ error: "Failed to flush buffer" });
  }
});

router.post("/api/verification-campaigns/:campaignId/contacts/bulk-delete", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const bulkDeleteSchema = z.object({
      contactIds: z.array(z.string().uuid()).nonempty(),
      reason: z.string().optional(),
    });
    
    const { contactIds, reason } = bulkDeleteSchema.parse(req.body);
    
    console.log('[BULK DELETE] Request received:', { 
      campaignId, 
      contactCount: contactIds.length,
      user: req.user,
      userRole: req.user?.role,
      userRoles: req.user?.roles
    });
    
    const isAdmin = req.user?.role === 'admin' || req.user?.roles?.includes('admin');
    const allowClientProvidedDelete = process.env.ALLOW_CLIENT_PROVIDED_DELETE === 'true' || isAdmin;
    
    console.log('[BULK DELETE] Permission check:', { isAdmin, allowClientProvidedDelete });
    
    // Filter out contacts that are already submitted
    const submittedContactIds = contactIds.length > 0
      ? await db
          .select({ contactId: verificationLeadSubmissions.contactId })
          .from(verificationLeadSubmissions)
          .where(
            and(
              eq(verificationLeadSubmissions.campaignId, campaignId),
              inArray(verificationLeadSubmissions.contactId, contactIds)
            )
          )
          .then(rows => (rows || []).map(r => r.contactId))
      : [];
    
    const eligibleContactIds = contactIds.filter(id => !submittedContactIds.includes(id));
    
    if (eligibleContactIds.length === 0) {
      return res.json({
        success: true,
        deletedCount: 0,
        deletedIds: [],
        skippedCount: contactIds.length,
        message: "All contacts have already been submitted"
      });
    }
    
    // Use Drizzle ORM for safe, parameterized updates
    const conditions = [
      inArray(verificationContacts.id, eligibleContactIds),
      eq(verificationContacts.campaignId, campaignId),
      eq(verificationContacts.deleted, false),
      eq(verificationContacts.inSubmissionBuffer, false),
    ];
    
    // Only filter out Client_Provided if not allowed
    if (!allowClientProvidedDelete) {
      conditions.push(sql`${verificationContacts.sourceType} <> 'Client_Provided'`);
    }
    
    const result = await db
      .update(verificationContacts)
      .set({ deleted: true, updatedAt: new Date() })
      .where(and(...conditions))
      .returning({ id: verificationContacts.id });
    
    const deletedIds = (result || []).map(r => r.id);
    
    console.log('[BULK DELETE] Result:', { 
      requested: contactIds.length, 
      deleted: deletedIds.length, 
      skipped: contactIds.length - deletedIds.length 
    });
    
    if (deletedIds.length > 0 && req.user?.userId) {
      await db.insert(verificationAuditLog).values({
        actorId: req.user.userId,
        entityType: 'contact',
        action: 'bulk_delete',
        entityId: campaignId,
        before: null,
        after: { contactIds: deletedIds, reason, requestedIds: contactIds },
      });
    }
    
    res.json({ 
      success: true, 
      deletedCount: deletedIds.length,
      deletedIds,
      skippedCount: contactIds.length - deletedIds.length,
    });
  } catch (error) {
    console.error("Error bulk deleting contacts:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to bulk delete contacts" });
  }
});

// Bulk Email Validation endpoint
router.post("/api/verification-campaigns/:campaignId/contacts/bulk-validate-email", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const bulkValidateSchema = z.object({
      contactIds: z.array(z.string().uuid()).nonempty(),
    });
    
    const { contactIds } = bulkValidateSchema.parse(req.body);
    
    console.log('[BULK EMAIL VALIDATION] Request received:', { 
      campaignId, 
      contactCount: contactIds.length 
    });
    
    let validatedCount = 0;
    const results = [];
    
    for (const contactId of contactIds) {
      try {
        const contact = await db.query.verificationContacts.findFirst({
          where: and(
            eq(verificationContacts.id, contactId),
            eq(verificationContacts.campaignId, campaignId)
          ),
        });
        
        if (!contact || !contact.email) {
          console.log(`[BULK EMAIL VALIDATION] Skipping contact ${contactId} - no email`);
          continue;
        }
        
        // Skip if already validated (has a status other than 'unknown')
        if (contact.emailStatus && contact.emailStatus !== 'unknown') {
          console.log(`[BULK EMAIL VALIDATION] Skipping contact ${contactId} - already validated (${contact.emailStatus})`);
          continue;
        }
        
        // Use built-in email validator
        const { validateAndStoreEmail } = await import('../lib/email-validation-engine');
        const validation = await validateAndStoreEmail(
          contactId,
          contact.email,
          'api_free',
          { skipSmtp: process.env.SKIP_SMTP_VALIDATION === 'true' }
        );
        
        validatedCount++;
        results.push({ contactId, email: contact.email, status: validation.status });
        
        console.log(`[BULK EMAIL VALIDATION] Validated ${contact.email} - Status: ${validation.status}`);
      } catch (error) {
        console.error(`[BULK EMAIL VALIDATION] Error validating contact ${contactId}:`, error);
      }
    }
    
    res.json({ 
      success: true, 
      validatedCount,
      results,
    });
  } catch (error) {
    console.error("Error bulk validating emails:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to bulk validate emails" });
  }
});

// Bulk Mark as Validated endpoint
router.post("/api/verification-campaigns/:campaignId/contacts/bulk-mark-validated", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const bulkMarkSchema = z.object({
      contactIds: z.array(z.string().uuid()).nonempty(),
    });
    
    const { contactIds } = bulkMarkSchema.parse(req.body);
    
    console.log('[BULK MARK VALIDATED] Request received:', { 
      campaignId, 
      contactCount: contactIds.length 
    });
    
    const result = await db
      .update(verificationContacts)
      .set({ 
        verificationStatus: 'Validated',
        updatedAt: new Date() 
      })
      .where(
        and(
          inArray(verificationContacts.id, contactIds),
          eq(verificationContacts.campaignId, campaignId),
          eq(verificationContacts.deleted, false)
        )
      )
      .returning({ id: verificationContacts.id });
    
    const updatedIds = result.map(r => r.id);
    
    console.log('[BULK MARK VALIDATED] Updated:', { 
      updated: updatedIds.length, 
      skipped: contactIds.length - updatedIds.length 
    });
    
    if (updatedIds.length > 0 && req.user?.userId) {
      await db.insert(verificationAuditLog).values({
        actorId: req.user.userId,
        entityType: 'contact',
        action: 'bulk_mark_validated',
        entityId: campaignId,
        before: null,
        after: { contactIds: updatedIds, requestedIds: contactIds },
      });
    }
    
    res.json({ 
      success: true, 
      updatedCount: updatedIds.length,
      updatedIds,
      skippedCount: contactIds.length - updatedIds.length,
    });
  } catch (error) {
    console.error("Error bulk marking as validated:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to bulk mark as validated" });
  }
});

// Run Email Validation on Validated Contacts
router.post("/api/verification-campaigns/:campaignId/contacts/run-email-validation", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    console.log('[RUN EMAIL VALIDATION] Starting validation for campaign:', campaignId);
    
    // Find all validated contacts without email_status set
    const contactsToValidate = await db
      .select({
        id: verificationContacts.id,
        email: verificationContacts.email,
      })
      .from(verificationContacts)
      .where(
        and(
          eq(verificationContacts.campaignId, campaignId),
          eq(verificationContacts.deleted, false),
          eq(verificationContacts.verificationStatus, 'Validated'),
          sql`${verificationContacts.email} IS NOT NULL`,
          sql`(${verificationContacts.emailStatus} IS NULL OR ${verificationContacts.emailStatus} = 'unknown')`
        )
      )
      .limit(500); // Process in batches to avoid timeout
    
    if (contactsToValidate.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No contacts need email validation',
        validated: 0 
      });
    }
    
    console.log(`[RUN EMAIL VALIDATION] Found ${contactsToValidate.length} contacts to validate`);
    
    // Import validation function
    const { validateAndStoreEmail } = await import('../lib/email-validation-engine');
    
    let validated = 0;
    let failed = 0;
    
    // Group by domain for rate limiting
    const byDomain = new Map<string, typeof contactsToValidate>();
    for (const contact of contactsToValidate) {
      if (!contact.email) continue;
      const domain = contact.email.split('@')[1]?.toLowerCase();
      if (!domain) continue;
      if (!byDomain.has(domain)) {
        byDomain.set(domain, []);
      }
      byDomain.get(domain)!.push(contact);
    }
    
    // Process each domain sequentially (rate limiting)
    for (const [domain, domainContacts] of Array.from(byDomain.entries())) {
      console.log(`[RUN EMAIL VALIDATION] Processing ${domainContacts.length} contacts for domain: ${domain}`);
      
      for (const contact of domainContacts) {
        if (!contact.email) continue;
        
        try {
          // Validate email
          const validation = await validateAndStoreEmail(
            contact.id,
            contact.email,
            'api_free',
            { skipSmtp: process.env.SKIP_SMTP_VALIDATION === 'true' }
          );
          
          // Update contact with email_status
          await db
            .update(verificationContacts)
            .set({
              emailStatus: validation.status,
              updatedAt: new Date(),
            })
            .where(eq(verificationContacts.id, contact.id));
          
          validated++;
          console.log(`[RUN EMAIL VALIDATION] Validated ${contact.email}: ${validation.status}`);
          
        } catch (error) {
          failed++;
          console.error(`[RUN EMAIL VALIDATION] Error validating ${contact.email}:`, error);
        }
      }
      
      // Rate limiting: small delay between domains
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`[RUN EMAIL VALIDATION] Complete: ${validated} validated, ${failed} failed`);
    
    res.json({ 
      success: true, 
      validated,
      failed,
      total: contactsToValidate.length
    });
  } catch (error) {
    console.error("[RUN EMAIL VALIDATION] Error:", error);
    res.status(500).json({ error: "Failed to run email validation" });
  }
});

// Bulk Field Update endpoint
router.post("/api/verification-campaigns/:campaignId/contacts/bulk-field-update", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const bulkFieldUpdateSchema = z.object({
      contactIds: z.array(z.string().uuid()).nonempty(),
      fieldName: z.string().min(1),
      fieldValue: z.string(), // Only allow strings for safety
    });
    
    const { contactIds, fieldName, fieldValue } = bulkFieldUpdateSchema.parse(req.body);
    
    console.log('[BULK FIELD UPDATE] Request received:', { 
      campaignId, 
      contactCount: contactIds.length,
      fieldName,
      fieldValue
    });
    
    // Strict allowlist: maps frontend field names to Drizzle camelCase property names
    // Only these fields can be bulk updated
    const FIELD_ALLOWLIST: Record<string, keyof typeof verificationContacts.$inferSelect> = {
      'contactCountry': 'contactCountry',
      'contactCity': 'contactCity',
      'contactState': 'contactState',
      'contactPostal': 'contactPostal',
      'contactAddress1': 'contactAddress1',
      'contactAddress2': 'contactAddress2',
      'contactAddress3': 'contactAddress3',
      'hqCountry': 'hqCountry',
      'hqCity': 'hqCity',
      'hqState': 'hqState',
      'hqPostal': 'hqPostal',
      'hqAddress1': 'hqAddress1',
      'hqAddress2': 'hqAddress2',
      'hqAddress3': 'hqAddress3',
      'title': 'title',
      'phone': 'phone',
      'mobile': 'mobile',
      'linkedinUrl': 'linkedinUrl',
      'formerPosition': 'formerPosition',
      'timeInCurrentPosition': 'timeInCurrentPosition',
      'timeInCurrentCompany': 'timeInCurrentCompany',
    };
    
    // Validate field name against allowlist
    const drizzlePropertyName = FIELD_ALLOWLIST[fieldName];
    if (!drizzlePropertyName) {
      return res.status(400).json({ 
        error: "Invalid field name", 
        allowedFields: Object.keys(FIELD_ALLOWLIST)
      });
    }
    
    // Sanitize and validate field value
    const sanitizedValue = fieldValue.trim();
    if (sanitizedValue.length > 500) {
      return res.status(400).json({ 
        error: "Field value too long (max 500 characters)" 
      });
    }
    
    // Build update object using Drizzle property name (type-safe)
    const updateData: any = {
      [drizzlePropertyName]: sanitizedValue || null, // Empty string becomes null
      updatedAt: new Date()
    };
    
    const result = await db
      .update(verificationContacts)
      .set(updateData)
      .where(
        and(
          inArray(verificationContacts.id, contactIds),
          eq(verificationContacts.campaignId, campaignId),
          eq(verificationContacts.deleted, false)
        )
      )
      .returning({ id: verificationContacts.id });
    
    const updatedIds = result.map(r => r.id);
    
    console.log('[BULK FIELD UPDATE] Updated:', { 
      updated: updatedIds.length, 
      skipped: contactIds.length - updatedIds.length 
    });
    
    if (updatedIds.length > 0 && req.user?.userId) {
      await db.insert(verificationAuditLog).values({
        actorId: req.user.userId,
        entityType: 'contact',
        action: 'bulk_field_update',
        entityId: campaignId,
        before: null,
        after: { 
          fieldName,
          fieldValue,
          contactIds: updatedIds, 
          requestedIds: contactIds 
        },
      });
    }
    
    res.json({ 
      success: true, 
      updatedCount: updatedIds.length,
      updatedIds,
      skippedCount: contactIds.length - updatedIds.length,
    });
  } catch (error) {
    console.error("Error bulk field update:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to bulk update field" });
  }
});

// Bulk Enrichment endpoint
router.post("/api/verification-campaigns/:campaignId/contacts/bulk-enrich", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const bulkEnrichSchema = z.object({
      contactIds: z.array(z.string().uuid()).nonempty(),
    });
    
    const { contactIds } = bulkEnrichSchema.parse(req.body);
    
    console.log('[BULK ENRICHMENT] Request received:', { 
      campaignId, 
      contactCount: contactIds.length 
    });
    
    // Track detailed results
    let addressEnriched = 0;
    let phoneEnriched = 0;
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    const skippedReasons: Record<string, number> = {
      noAccount: 0,
      noOkEmail: 0,
      alreadyEnriched: 0,
    };
    
    console.log(`[BULK ENRICHMENT] Processing ${contactIds.length} contacts with OK emails`);
    
    for (let i = 0; i < contactIds.length; i++) {
      const contactId = contactIds[i];
      
      try {
        const contact = await db.query.verificationContacts.findFirst({
          where: and(
            eq(verificationContacts.id, contactId),
            eq(verificationContacts.campaignId, campaignId)
          ),
          with: {
            account: true,
          },
        });
        
        if (!contact || !contact.account) {
          console.log(`[BULK ENRICHMENT] Skipping contact ${contactId} - no account`);
          skipped++;
          skippedReasons.noAccount++;
          continue;
        }
        
        // CRITICAL: Filter for valid emails only
        if (contact.emailStatus !== 'valid' && contact.emailStatus !== 'safe_to_send') {
          console.log(`[BULK ENRICHMENT] Skipping contact ${contactId} - email status is ${contact.emailStatus}, not valid or safe_to_send`);
          skipped++;
          skippedReasons.noOkEmail++;
          continue;
        }
        
        // Only enrich if contact is missing address or phone
        const needsAddress = !contact.contactAddress1 || !contact.contactCity;
        const needsPhone = !contact.phone;
        
        if (!needsAddress && !needsPhone) {
          console.log(`[BULK ENRICHMENT] Skipping contact ${contactId} - already has address and phone`);
          skipped++;
          skippedReasons.alreadyEnriched++;
          continue;
        }
        
        // Call the enrichment service (correct endpoint)
        const response = await fetch(`http://localhost:5000/api/verification-contacts/${contactId}/enrich`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization || '',
          },
          body: JSON.stringify({}),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.addressEnriched) addressEnriched++;
          if (result.phoneEnriched) phoneEnriched++;
          processed++;
          
          // Real-time progress logging
          if ((i + 1) % 10 === 0 || i === contactIds.length - 1) {
            console.log(`[BULK ENRICHMENT] Progress: ${processed}/${contactIds.length} | Address: ${addressEnriched} | Phone: ${phoneEnriched} | Skipped: ${skipped} | Failed: ${failed}`);
          }
        } else {
          console.error(`[BULK ENRICHMENT] Failed to enrich contact ${contactId}: ${response.status}`);
          failed++;
        }
      } catch (error) {
        console.error(`[BULK ENRICHMENT] Error enriching contact ${contactId}:`, error);
        failed++;
      }
    }
    
    console.log(`[BULK ENRICHMENT] Complete: ${addressEnriched} addresses, ${phoneEnriched} phones enriched | Processed: ${processed} | Skipped: ${skipped} (No account: ${skippedReasons.noAccount}, No OK email: ${skippedReasons.noOkEmail}, Already enriched: ${skippedReasons.alreadyEnriched}) | Failed: ${failed}`);
    
    res.json({ 
      success: true, 
      addressEnriched,
      phoneEnriched,
      processed,
      skipped,
      failed,
      skippedReasons,
      total: contactIds.length,
    });
  } catch (error) {
    console.error("Error bulk enriching contacts:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to bulk enrich contacts" });
  }
});

// Background processing function for email validation jobs
// Export for job recovery module
export async function processEmailValidationJob(jobId: string) {
  console.log(`[EMAIL VALIDATION JOB] ===== STARTING JOB ${jobId} =====`);
  console.log(`[EMAIL VALIDATION JOB] Function called at: ${new Date().toISOString()}`);
  
  try {
    console.log(`[EMAIL VALIDATION JOB] Fetching job ${jobId} from database...`);
    
    // Fetch the job details
    const [job] = await db
      .select()
      .from(verificationEmailValidationJobs)
      .where(eq(verificationEmailValidationJobs.id, jobId));
    
    if (!job) {
      console.error(`[EMAIL VALIDATION JOB] Job ${jobId} not found in database`);
      return;
    }
    
    console.log(`[EMAIL VALIDATION JOB] Job ${jobId} fetched successfully:`, {
      status: job.status,
      totalContacts: job.totalContacts,
      processedContacts: job.processedContacts,
      contactIdsLength: job.contactIds?.length || 0,
    });
    
    const { campaignId, contactIds: allContactIds } = job;
    
    if (!allContactIds || allContactIds.length === 0) {
      console.log(`[EMAIL VALIDATION JOB] Job ${jobId} has no contacts to process`);
      await db
        .update(verificationEmailValidationJobs)
        .set({
          status: 'completed',
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(verificationEmailValidationJobs.id, jobId));
      return;
    }
    
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(allContactIds.length / BATCH_SIZE);
    
    let totalSuccessCount = 0;
    let totalFailureCount = 0;
    const totalStatusCounts = {
      ok: 0,
      invalid: 0,
      risky: 0,
      disposable: 0,
      accept_all: 0,
      unknown: 0,
    };
    
    console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: Processing ${allContactIds.length} contacts in ${totalBatches} batches`);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, allContactIds.length);
      const batchContactIds = allContactIds.slice(batchStart, batchEnd);
      
      console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: Processing batch ${batchIndex + 1}/${totalBatches} (${batchContactIds.length} contact IDs)`);
      
      // Fetch contacts with valid emails for this batch - SKIP already verified contacts
      const contacts = await db
        .select()
        .from(verificationContacts)
        .where(and(
          eq(verificationContacts.campaignId, campaignId),
          inArray(verificationContacts.id, batchContactIds),
          sql`${verificationContacts.email} IS NOT NULL AND ${verificationContacts.email} != ''`,
          eq(verificationContacts.emailStatus, 'unknown') // ONLY process unknown status (resume capability)
        ));
      
      if (contacts.length === 0) {
        console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: Batch ${batchIndex + 1} has no contacts needing verification, skipping`);
        
        // Update progress even for skipped batches
        await db
          .update(verificationEmailValidationJobs)
          .set({
            currentBatch: batchIndex + 1,
            processedContacts: batchEnd,
            updatedAt: new Date(),
          })
          .where(eq(verificationEmailValidationJobs.id, jobId));
        
        continue;
      }
      
      // Extract unique emails for this batch (filter out null/empty)
      const emailsToVerify = Array.from(new Set(
        contacts
          .map(c => c.emailLower || c.email?.toLowerCase())
          .filter((email): email is string => Boolean(email && email.trim()))
          .map(email => email.trim())
      ));
      
      if (emailsToVerify.length === 0) {
        console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: Batch ${batchIndex + 1} has no valid emails to verify, skipping`);
        
        // Update progress
        await db
          .update(verificationEmailValidationJobs)
          .set({
            currentBatch: batchIndex + 1,
            processedContacts: batchEnd,
            updatedAt: new Date(),
          })
          .where(eq(verificationEmailValidationJobs.id, jobId));
        
        continue;
      }
      
      console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: Batch ${batchIndex + 1}: Processing ${emailsToVerify.length} unique emails for ${contacts.length} contacts`);
      
      // CACHE CHECK: Query recent validations (60-day window) to avoid redundant API calls
      // Chunk emails into smaller batches to avoid SQL ANY/ALL array issues
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const cacheMap = new Map<string, any>();
      const CACHE_QUERY_CHUNK_SIZE = 100; // Query cache in chunks of 100 emails at a time
      
      for (let i = 0; i < emailsToVerify.length; i += CACHE_QUERY_CHUNK_SIZE) {
        const emailChunk = emailsToVerify.slice(i, i + CACHE_QUERY_CHUNK_SIZE);
        
        const cachedValidationsChunk = await db
          .select({
            email_lower: verificationEmailValidations.emailLower,
            status: verificationEmailValidations.status,
            provider: verificationEmailValidations.provider,
            raw_json: verificationEmailValidations.rawJson,
            checked_at: verificationEmailValidations.checkedAt,
          })
          .from(verificationEmailValidations)
          .where(
            and(
              inArray(verificationEmailValidations.emailLower, emailChunk),
              sql`${verificationEmailValidations.checkedAt} > ${sixtyDaysAgo}`
            )
          );
        
        // Add to cache map
        for (const row of cachedValidationsChunk) {
          cacheMap.set(row.email_lower, row);
        }
      }
      
      // Split emails into cached vs uncached
      const emailsNeedingApi: string[] = [];
      const verificationResults = new Map<string, EmailVerificationResult>();
      
      for (const email of emailsToVerify) {
        const cached = cacheMap.get(email);
        if (cached) {
          // Use cached result
          verificationResults.set(email, {
            email: email,
            status: cached.status as any,
            details: cached.raw_json?.details || {
              syntax: true,
              domain: true,
              smtp: cached.status === 'ok',
              catch_all: cached.status === 'accept_all',
              disposable: cached.status === 'disposable',
              free: false,
              role: false,
            },
            reason: cached.raw_json?.reason || cached.status,
            provider: cached.provider || 'emaillistverify',
            rawResponse: cached.raw_json || {},
            checkedAt: new Date(cached.checked_at),
          });
        } else {
          emailsNeedingApi.push(email);
        }
      }
      
      const cachedCount = verificationResults.size;
      const apiCallCount = emailsNeedingApi.length;
      
      console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: Batch ${batchIndex + 1}: Cache hits: ${cachedCount}, API calls needed: ${apiCallCount}`);
      
      // Only call API for uncached emails
      if (emailsNeedingApi.length > 0) {
        console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: Batch ${batchIndex + 1}: Calling API for ${emailsNeedingApi.length} emails`);
        
        const apiResults = await verifyEmailsBulk(emailsNeedingApi, {
          delayMs: 200, // 5 requests per second
          onProgress: (completed, total, currentEmail) => {
            if (completed % 10 === 0 || completed === total) {
              console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: Batch ${batchIndex + 1} API Progress: ${completed}/${total} (${currentEmail})`);
            }
          },
        });
        
        // Merge API results with cached results
        for (const [email, result] of Array.from(apiResults.entries())) {
          verificationResults.set(email, result);
        }
      } else {
        console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: Batch ${batchIndex + 1}: All emails found in cache, skipping API calls (saved ${cachedCount} API credits)`);
      }
      
      // Update contacts and cache validation results for this batch
      let batchSuccessCount = 0;
      let batchFailureCount = 0;
      
      for (const contact of contacts) {
        // Get email key for this contact
        const emailRaw = contact.emailLower || contact.email?.toLowerCase();
        if (!emailRaw || !emailRaw.trim()) {
          console.warn(`[EMAIL VALIDATION JOB] Job ${jobId}: Contact ${contact.id} has no valid email, skipping`);
          batchFailureCount++;
          continue;
        }
        
        const emailKey = emailRaw.trim();
        const result = verificationResults.get(emailKey);
        
        if (!result) {
          console.warn(`[EMAIL VALIDATION JOB] Job ${jobId}: No verification result for ${emailKey} (contact ${contact.id})`);
          batchFailureCount++;
          continue;
        }
        
        try {
          // Update contact email status
          await db
            .update(verificationContacts)
            .set({
              emailStatus: result.status,
              updatedAt: new Date(),
            })
            .where(eq(verificationContacts.id, contact.id));
          
          // Cache the validation result
          await db
            .insert(verificationEmailValidations)
            .values({
              contactId: contact.id,
              emailLower: emailKey,
              provider: result.provider,
              status: result.status,
              rawJson: result.rawResponse || {},
              checkedAt: result.checkedAt,
            })
            .onConflictDoNothing();
          
          // Track status counts ONLY after successful update
          const statusKey = result.status as keyof typeof totalStatusCounts;
          if (statusKey in totalStatusCounts) {
            totalStatusCounts[statusKey]++;
          } else {
            console.warn(`[EMAIL VALIDATION JOB] Job ${jobId}: Unknown status '${result.status}' for ${emailKey}, counting as unknown`);
            totalStatusCounts.unknown++;
          }
          
          batchSuccessCount++;
        } catch (error) {
          console.error(`[EMAIL VALIDATION JOB] Job ${jobId}: Error updating contact ${contact.id} (${emailKey}):`, error);
          batchFailureCount++;
        }
      }
      
      totalSuccessCount += batchSuccessCount;
      totalFailureCount += batchFailureCount;
      
      console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: Batch ${batchIndex + 1} Complete: ${batchSuccessCount} success, ${batchFailureCount} failures`);
      
      // Update job progress after EACH batch
      await db
        .update(verificationEmailValidationJobs)
        .set({
          currentBatch: batchIndex + 1,
          processedContacts: batchEnd,
          successCount: totalSuccessCount,
          failureCount: totalFailureCount,
          statusCounts: totalStatusCounts,
          updatedAt: new Date(),
        })
        .where(eq(verificationEmailValidationJobs.id, jobId));
      
      console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: Updated progress - Batch ${batchIndex + 1}/${totalBatches}, Processed ${batchEnd}/${allContactIds.length}`);
    }
    
    // Mark job as completed
    await db
      .update(verificationEmailValidationJobs)
      .set({
        status: 'completed',
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(verificationEmailValidationJobs.id, jobId));
    
    console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: COMPLETED - ${totalSuccessCount} success, ${totalFailureCount} failures`);
    console.log(`[EMAIL VALIDATION JOB] Job ${jobId}: Status breakdown: OK=${totalStatusCounts.ok}, Invalid=${totalStatusCounts.invalid}, Risky=${totalStatusCounts.risky}, Disposable=${totalStatusCounts.disposable}, Accept-All=${totalStatusCounts.accept_all}, Unknown=${totalStatusCounts.unknown}`);
    
  } catch (error) {
    console.error(`[EMAIL VALIDATION JOB] Job ${jobId}: FATAL ERROR:`, error);
    
    // Mark job as failed
    await db
      .update(verificationEmailValidationJobs)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(verificationEmailValidationJobs.id, jobId));
  }
}

// Bulk Email Verification using Email List Verify - Now uses job persistence
router.post("/api/verification-campaigns/:campaignId/contacts/bulk-verify-emails", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = (req.user as any)?.id;
    const { contactIds } = z.object({
      contactIds: z.array(z.string()).min(1),
    }).parse(req.body);
    
    console.log(`[BULK EMAIL VERIFY] Creating job for ${contactIds.length} contacts in campaign ${campaignId}`);
    
    // Calculate total batches
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(contactIds.length / BATCH_SIZE);
    
    // Create job record BEFORE starting background processing
    const [job] = await db
      .insert(verificationEmailValidationJobs)
      .values({
        campaignId,
        status: 'processing',
        totalContacts: contactIds.length,
        totalBatches,
        contactIds,
        createdBy: userId,
        startedAt: new Date(),
      })
      .returning();
    
    console.log(`[BULK EMAIL VERIFY] Job ${job.id} created, starting background processing`);
    
    // Start background processing using setImmediate (more reliable than Promise)
    // setImmediate ensures the function executes in the next event loop tick
    setImmediate(async () => {
      try {
        console.log(`[BULK EMAIL VERIFY] setImmediate triggered for job ${job.id}`);
        await processEmailValidationJob(job.id);
      } catch (error) {
        console.error(`[BULK EMAIL VERIFY] Background processing failed for job ${job.id}:`, error);
        // Update job status to failed
        await db.update(verificationEmailValidationJobs)
          .set({
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            finishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(verificationEmailValidationJobs.id, job.id))
          .catch(err => console.error(`[BULK EMAIL VERIFY] Failed to update job status:`, err));
      }
    });
    
    // Return immediately with job ID
    res.json({
      jobId: job.id,
      message: "Email validation started",
      totalContacts: contactIds.length,
      totalBatches,
    });
    
  } catch (error) {
    console.error("[BULK EMAIL VERIFY] Error creating job:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to start email validation", message: error instanceof Error ? error.message : String(error) });
  }
});

// Get email validation job status
router.get("/api/verification-campaigns/:campaignId/email-validation-jobs/:jobId", requireAuth, async (req, res) => {
  try {
    const { campaignId, jobId } = req.params;
    
    const [job] = await db
      .select()
      .from(verificationEmailValidationJobs)
      .where(and(
        eq(verificationEmailValidationJobs.id, jobId),
        eq(verificationEmailValidationJobs.campaignId, campaignId)
      ));
    
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    
    // Calculate progress percentage
    const progressPercent = job.totalContacts > 0 
      ? Math.round((job.processedContacts / job.totalContacts) * 100)
      : 0;
    
    res.json({
      ...job,
      progressPercent,
    });
  } catch (error) {
    console.error("[EMAIL VALIDATION JOB STATUS] Error:", error);
    res.status(500).json({ error: "Failed to fetch job status" });
  }
});

// List all email validation jobs for a campaign
router.get("/api/verification-campaigns/:campaignId/email-validation-jobs", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;
    
    const jobs = await db
      .select()
      .from(verificationEmailValidationJobs)
      .where(eq(verificationEmailValidationJobs.campaignId, campaignId))
      .orderBy(desc(verificationEmailValidationJobs.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Calculate progress for each job
    const jobsWithProgress = jobs.map(job => ({
      ...job,
      progressPercent: job.totalContacts > 0 
        ? Math.round((job.processedContacts / job.totalContacts) * 100)
        : 0,
    }));
    
    res.json(jobsWithProgress);
  } catch (error) {
    console.error("[EMAIL VALIDATION JOBS LIST] Error:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// CSV Export endpoint (all contacts)
router.get("/api/verification-campaigns/:campaignId/contacts/export/csv", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const includeCompanyFields = req.query.includeCompany !== 'false';
    
    // Fetch all contacts for the campaign with account data
    const contactsData = await db
      .select({
        contact: verificationContacts,
        account: accounts,
      })
      .from(verificationContacts)
      .leftJoin(accounts, eq(verificationContacts.accountId, accounts.id))
      .where(eq(verificationContacts.campaignId, campaignId))
      .orderBy(desc(verificationContacts.createdAt));
    
    // Transform data to include account info
    const contacts = contactsData.map(row => ({
      ...row.contact,
      account: row.account || undefined,
    }));
    
    // Generate CSV with UTF-8 BOM and proper formatting
    // Default to US country code (+1) for phone number formatting
    const csvContent = exportVerificationContactsToCsv(contacts, includeCompanyFields, {
      includeBOM: true,
      defaultCountryCode: '1',
    });
    
    // Create download response with proper headers
    const { content, headers } = createCsvDownloadResponse(
      csvContent,
      `verification-contacts-${campaignId}-${new Date().toISOString().split('T')[0]}.csv`
    );
    
    // Set headers
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Send the file
    res.send(content);
  } catch (error) {
    console.error("Error exporting contacts to CSV:", error);
    res.status(500).json({ error: "Failed to export contacts" });
  }
});

// CSV Export endpoint (filtered: Validated + Email Verified contacts only)
router.get("/api/verification-campaigns/:campaignId/contacts/export/validated-verified", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const includeCompanyFields = req.query.includeCompany !== 'false';
    
    console.log(`[EXPORT VALIDATED+VERIFIED] Starting export for campaign ${campaignId}`);
    
    // Fetch only contacts that are:
    // 1. verificationStatus = 'Validated'
    // 2. emailStatus = 'valid' or 'safe_to_send' (verified and deliverable)
    const contactsData = await db
      .select({
        contact: verificationContacts,
        account: accounts,
      })
      .from(verificationContacts)
      .leftJoin(accounts, eq(verificationContacts.accountId, accounts.id))
      .where(and(
        eq(verificationContacts.campaignId, campaignId),
        eq(verificationContacts.verificationStatus, 'Validated'),
        sql`${verificationContacts.emailStatus} IN ('valid', 'safe_to_send')`,
        eq(verificationContacts.deleted, false),
      ))
      .orderBy(desc(verificationContacts.createdAt));
    
    console.log(`[EXPORT VALIDATED+VERIFIED] Found ${contactsData.length} qualified contacts`);
    
    // Transform data to include account info
    const contacts = contactsData.map(row => ({
      ...row.contact,
      account: row.account || undefined,
    }));
    
    if (contacts.length === 0) {
      // Return empty CSV with headers
      const emptyContent = exportVerificationContactsToCsv([], includeCompanyFields, {
        includeBOM: true,
        defaultCountryCode: '1',
      });
      const { content, headers } = createCsvDownloadResponse(
        emptyContent,
        `validated-verified-contacts-${campaignId}-${new Date().toISOString().split('T')[0]}.csv`
      );
      
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      return res.send(content);
    }
    
    // Generate CSV with UTF-8 BOM and proper formatting
    // Default to US country code (+1) for phone number formatting
    const csvContent = exportVerificationContactsToCsv(contacts, includeCompanyFields, {
      includeBOM: true,
      defaultCountryCode: '1',
    });
    
    // Create download response with proper headers
    const { content, headers } = createCsvDownloadResponse(
      csvContent,
      `validated-verified-contacts-${campaignId}-${new Date().toISOString().split('T')[0]}.csv`
    );
    
    // Set headers
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    console.log(`[EXPORT VALIDATED+VERIFIED] Export completed successfully`);
    
    // Send the file
    res.send(content);
  } catch (error) {
    console.error("[EXPORT VALIDATED+VERIFIED] Error:", error);
    res.status(500).json({ error: "Failed to export validated and verified contacts" });
  }
});

// Re-validate all eligible contacts endpoint
router.post("/api/verification-campaigns/:campaignId/contacts/revalidate-emails", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    console.log(`[RE-VALIDATE] Starting email re-validation for campaign ${campaignId}`);
    
    // Get campaign to ensure it exists
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, campaignId));
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    // Find eligible contacts that need email validation
    // Only validate potentially eligible contacts (passed geo/title checks)
    const contactsToRevalidate = await db
      .select({
        id: verificationContacts.id,
        email: verificationContacts.email,
        eligibilityStatus: verificationContacts.eligibilityStatus,
      })
      .from(verificationContacts)
      .where(
        and(
          eq(verificationContacts.campaignId, campaignId),
          eq(verificationContacts.deleted, false),
          sql`${verificationContacts.email} IS NOT NULL AND ${verificationContacts.email} != ''`,
          // Only validate Eligible contacts (not Out_of_Scope)
          sql`${verificationContacts.eligibilityStatus} = 'Eligible'`
        )
      );
    
    console.log(`[RE-VALIDATE] Found ${contactsToRevalidate.length} contacts to re-validate`);
    
    if (contactsToRevalidate.length === 0) {
      return res.json({ 
        message: "No contacts found to re-validate",
        count: 0
      });
    }
    
    // Delete existing validation records for these contacts
    const contactIds = contactsToRevalidate.map(c => c.id);
    
    await db
      .delete(verificationEmailValidations)
      .where(inArray(verificationEmailValidations.contactId, contactIds));
    
    console.log(`[RE-VALIDATE] Deleted existing validation records for ${contactIds.length} contacts`);
    
    // Reset contacts to Pending_Email_Validation status
    const updateResult = await db
      .update(verificationContacts)
      .set({
        eligibilityStatus: 'Pending_Email_Validation',
        emailStatus: null,
        updatedAt: new Date(),
      })
      .where(inArray(verificationContacts.id, contactIds));
    
    console.log(`[RE-VALIDATE] Reset ${contactIds.length} contacts to Pending_Email_Validation status`);
    
    // Log the re-validation action
    await db.insert(verificationAuditLog).values({
      campaignId,
      userId: (req as any).user?.id || null,
      action: 'contacts_email_revalidation',
      details: {
        contactCount: contactIds.length,
        timestamp: new Date().toISOString(),
      },
    });
    
    res.json({ 
      message: `Successfully queued ${contactIds.length} contacts for email re-validation`,
      count: contactIds.length
    });
    
  } catch (error) {
    console.error("[RE-VALIDATE] Error:", error);
    res.status(500).json({ error: "Failed to re-validate contacts" });
  }
});

export default router;
