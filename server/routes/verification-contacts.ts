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
    
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, campaignId));
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    const cap = campaign.leadCapPerAccount;
    
    const queueItems = await db.execute(sql`
      WITH next_batch AS (
        SELECT c.id
        FROM verification_contacts c
        LEFT JOIN accounts a ON a.id = c.account_id
        WHERE c.campaign_id = ${campaignId}
          AND c.eligibility_status = 'Eligible'
          AND c.verification_status = 'Pending'
          AND c.suppressed = FALSE
          AND c.in_submission_buffer = FALSE
          AND (
            SELECT COUNT(*) FROM verification_lead_submissions s
            WHERE s.account_id = c.account_id AND s.campaign_id = ${campaignId}
          ) < ${cap}
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

router.get("/api/verification-contacts/:id", async (req, res) => {
  try {
    const [contact] = await db.execute(sql`
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
    
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    res.json(contact);
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

export default router;
