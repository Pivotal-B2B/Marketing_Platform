import { Router } from "express";
import { db } from "../db";
import {
  verificationContacts,
  verificationCampaigns,
  verificationLeadSubmissions,
  accounts,
  insertVerificationContactSchema,
} from "@shared/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { z } from "zod";
import { evaluateEligibility, computeNormalizedKeys } from "../lib/verification-utils";
import { applySuppressionForContacts } from "../lib/verification-suppression";

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

router.get("/api/verification-contacts/account/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params;
    const campaignId = req.query.campaignId as string;

    if (!campaignId) {
      return res.status(400).json({ error: "campaignId query parameter is required" });
    }

    const contacts = await db
      .select()
      .from(verificationContacts)
      .where(
        and(
          eq(verificationContacts.accountId, accountId),
          eq(verificationContacts.campaignId, campaignId)
        )
      )
      .orderBy(desc(verificationContacts.updatedAt))
      .limit(20);

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
        a.hq_city,
        a.hq_country,
        a.hq_state,
        a.domain
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
    
    if (validatedData.firstName || validatedData.lastName || validatedData.contactCountry) {
      const accountName = req.body.accountName;
      const normalizedKeys = computeNormalizedKeys({
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
        COUNT(*) FILTER (WHERE eligibility_status = 'Eligible') as eligible_count,
        COUNT(*) FILTER (WHERE verification_status = 'Validated') as validated_count,
        COUNT(*) FILTER (WHERE verification_status = 'Pending') as pending_count,
        COUNT(*) FILTER (WHERE suppressed = TRUE) as suppressed_count,
        COUNT(*) FILTER (WHERE email_status = 'ok') as ok_email_count,
        COUNT(*) FILTER (WHERE email_status = 'invalid') as invalid_email_count,
        COUNT(*) FILTER (WHERE email_status = 'risky') as risky_email_count,
        COUNT(*) FILTER (WHERE in_submission_buffer = TRUE) as in_buffer_count
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

export default router;
