import { Router } from "express";
import { db } from "../db";
import {
  verificationContacts,
  verificationCampaigns,
  verificationLeadSubmissions,
  verificationAuditLog,
  accounts,
  insertVerificationContactSchema,
} from "@shared/schema";
import { eq, sql, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { evaluateEligibility, computeNormalizedKeys } from "../lib/verification-utils";
import { applySuppressionForContacts } from "../lib/verification-suppression";
import { requireAuth } from "../auth";

const router = Router();

router.get("/api/verification-campaigns/:campaignId/queue", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const limit = Number(req.query.limit) || 50;
    const contactSearch = req.query.contactSearch as string || "";
    const companySearch = req.query.companySearch as string || "";
    const sourceType = req.query.sourceType as string || "";
    
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
      )`);
    }
    
    if (sourceType) {
      filterConditions.push(sql`c.source_type = ${sourceType}`);
    }
    
    const filterSQL = filterConditions.length > 0 
      ? sql`AND ${sql.join(filterConditions, sql` AND `)}`
      : sql``;
    
    const queueItems = await db.execute(sql`
      WITH next_batch AS (
        SELECT c.id
        FROM verification_contacts c
        WHERE c.campaign_id = ${campaignId}
          AND c.eligibility_status = 'Eligible'
          AND c.verification_status = 'Pending'
          AND c.suppressed = FALSE
          AND c.deleted = FALSE
          AND c.in_submission_buffer = FALSE
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
        a.hq_country
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
    const companySearch = req.query.companySearch as string || "";
    const sourceType = req.query.sourceType as string || "";
    
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
      )`);
    }
    
    if (sourceType) {
      filterConditions.push(sql`c.source_type = ${sourceType}`);
    }
    
    const filterSQL = filterConditions.length > 0 
      ? sql`AND ${sql.join(filterConditions, sql` AND `)}`
      : sql``;
    
    const result = await db.execute(sql`
      SELECT c.id
      FROM verification_contacts c
      WHERE c.campaign_id = ${campaignId}
        AND c.eligibility_status = 'Eligible'
        AND c.verification_status = 'Pending'
        AND c.suppressed = FALSE
        AND c.deleted = FALSE
        AND c.in_submission_buffer = FALSE
        AND (
          SELECT COUNT(*) FROM verification_lead_submissions s
          WHERE s.account_id = c.account_id AND s.campaign_id = ${campaignId}
        ) < ${cap}
        ${filterSQL}
        ${companySearch ? sql`AND c.account_id IN (
          SELECT id FROM accounts WHERE LOWER(name) LIKE ${`%${companySearch.toLowerCase()}%`}
        )` : sql``}
      ORDER BY c.priority_score DESC NULLS LAST, c.updated_at ASC
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
        -- Use enriched data from verification_contacts table (from AI enrichment)
        -- Falls back to account table data if not enriched
        COALESCE(c.hq_address_1, a.hq_street_1) as hq_address_1,
        COALESCE(c.hq_address_2, a.hq_street_2) as hq_address_2,
        COALESCE(c.hq_address_3, a.hq_street_3) as hq_address_3,
        COALESCE(c.hq_city, a.hq_city) as hq_city,
        COALESCE(c.hq_state, a.hq_state) as hq_state,
        COALESCE(c.hq_postal, a.hq_postal_code) as hq_postal,
        COALESCE(c.hq_country, a.hq_country) as hq_country,
        c.hq_phone as hq_phone
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

router.get("/api/verification-campaigns/:campaignId/stats", async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE eligibility_status = 'Eligible' AND deleted = FALSE) as eligible_count,
        COUNT(*) FILTER (WHERE eligibility_status = 'Eligible' AND suppressed = FALSE AND deleted = FALSE) as eligible_unsuppressed_count,
        COUNT(*) FILTER (WHERE eligibility_status = 'Eligible' AND suppressed = TRUE AND deleted = FALSE) as eligible_suppressed_count,
        COUNT(*) FILTER (WHERE verification_status = 'Validated' AND deleted = FALSE) as validated_count,
        COUNT(*) FILTER (WHERE verification_status = 'Pending' AND deleted = FALSE) as pending_count,
        COUNT(*) FILTER (WHERE suppressed = TRUE AND deleted = FALSE) as suppressed_count,
        COUNT(*) FILTER (WHERE email_status = 'ok' AND deleted = FALSE) as ok_email_count,
        COUNT(*) FILTER (WHERE email_status = 'invalid' AND deleted = FALSE) as invalid_email_count,
        COUNT(*) FILTER (WHERE email_status = 'risky' AND deleted = FALSE) as risky_email_count,
        COUNT(*) FILTER (WHERE in_submission_buffer = TRUE AND deleted = FALSE) as in_buffer_count,
        COUNT(*) FILTER (WHERE deleted = TRUE) as deleted_count
      FROM verification_contacts
      WHERE campaign_id = ${campaignId}
    `);
    
    const submissions = await db.execute(sql`
      SELECT COUNT(*) as submission_count
      FROM verification_lead_submissions
      WHERE campaign_id = ${campaignId}
    `);
    
    res.json({
      ...stats.rows[0],
      submission_count: submissions.rows[0]?.submission_count || 0,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.post("/api/verification-contacts/:id/validate-email", async (req, res) => {
  try {
    const { runELV } = await import("../lib/verification-elv");
    const { verificationEmailValidations } = await import("@shared/schema");
    
    const [contact] = await db
      .select()
      .from(verificationContacts)
      .where(eq(verificationContacts.id, req.params.id));
    
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    // CAT62542 Preconditions: Manual ELV only for Eligible + Validated + Not Suppressed
    if (
      contact.eligibilityStatus !== 'Eligible' ||
      contact.verificationStatus !== 'Validated' ||
      contact.suppressed === true ||
      !contact.email
    ) {
      return res.status(409).json({ 
        error: "Preconditions not met",
        details: {
          eligible: contact.eligibilityStatus === 'Eligible',
          validated: contact.verificationStatus === 'Validated',
          notSuppressed: contact.suppressed !== true,
          hasEmail: !!contact.email
        }
      });
    }
    
    const emailLower = contact.email.toLowerCase();
    
    const existingValidation = await db.execute(sql`
      SELECT * FROM verification_email_validations
      WHERE email_lower = ${emailLower}
        AND checked_at > NOW() - INTERVAL '60 days'
      ORDER BY checked_at DESC
      LIMIT 1
    `);
    
    if (existingValidation.rowCount && existingValidation.rowCount > 0) {
      const cached = existingValidation.rows[0];
      
      await db
        .update(verificationContacts)
        .set({ emailStatus: cached.status as any, updatedAt: new Date() })
        .where(eq(verificationContacts.id, contact.id));
      
      return res.json({
        cached: true,
        status: cached.status,
        checkedAt: cached.checked_at,
      });
    }
    
    const apiKey = process.env.ELV_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Email validation not configured" });
    }
    
    const result = await runELV(contact.email, apiKey);
    
    await db.insert(verificationEmailValidations).values({
      contactId: contact.id,
      emailLower: emailLower,
      provider: "ELV",
      status: result.status,
      rawJson: result.raw,
    }).onConflictDoUpdate({
      target: [verificationEmailValidations.contactId, verificationEmailValidations.emailLower],
      set: {
        status: result.status,
        rawJson: result.raw,
        checkedAt: new Date(),
      },
    });
    
    await db
      .update(verificationContacts)
      .set({ emailStatus: result.status, updatedAt: new Date() })
      .where(eq(verificationContacts.id, contact.id));
    
    res.json({
      cached: false,
      status: result.status,
      checkedAt: new Date(),
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
        throw new Error("Account cap reached");
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
    if (error.message === "Account cap reached") {
      return res.status(400).json({ error: "Account cap reached" });
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

export default router;
