import { Router } from "express";
import { db } from "../db";
import { verificationCampaigns, insertVerificationCampaignSchema, verificationLeadSubmissions, verificationContacts, accounts } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/api/verification-campaigns", async (req, res) => {
  try {
    const campaigns = await db.select().from(verificationCampaigns);
    res.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

router.get("/api/verification-campaigns/:id", async (req, res) => {
  try {
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, req.params.id));
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

router.post("/api/verification-campaigns", async (req, res) => {
  try {
    const validatedData = insertVerificationCampaignSchema.parse(req.body);
    
    const [campaign] = await db
      .insert(verificationCampaigns)
      .values([validatedData])
      .returning();
    
    res.status(201).json(campaign);
  } catch (error) {
    console.error("Error creating campaign:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

router.put("/api/verification-campaigns/:id", async (req, res) => {
  try {
    const updateSchema = insertVerificationCampaignSchema.partial();
    const validatedData = updateSchema.parse(req.body);
    
    const [campaign] = await db
      .update(verificationCampaigns)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(verificationCampaigns.id, req.params.id))
      .returning();
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

router.delete("/api/verification-campaigns/:id", async (req, res) => {
  try {
    await db
      .delete(verificationCampaigns)
      .where(eq(verificationCampaigns.id, req.params.id));
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

router.get("/api/verification-campaigns/:campaignId/stats", async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Get all counts in a single query for efficiency
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE deleted = FALSE) as total_contacts,
        COUNT(*) FILTER (WHERE deleted = FALSE AND suppressed = TRUE) as suppressed_count,
        COUNT(*) FILTER (WHERE deleted = FALSE AND suppressed = FALSE) as active_count,
        COUNT(*) FILTER (WHERE deleted = FALSE AND suppressed = FALSE AND eligibility_status = 'Eligible') as eligible_count,
        COUNT(*) FILTER (WHERE deleted = FALSE AND suppressed = FALSE AND eligibility_status = 'Eligible' AND verification_status = 'Validated') as validated_count,
        COUNT(*) FILTER (WHERE deleted = FALSE AND suppressed = FALSE AND eligibility_status = 'Eligible' AND verification_status = 'Validated' AND email_status = 'ok') as ok_email_count,
        COUNT(*) FILTER (WHERE deleted = FALSE AND suppressed = FALSE AND eligibility_status = 'Eligible' AND verification_status = 'Invalid') as invalid_email_count,
        COUNT(*) FILTER (WHERE in_submission_buffer = TRUE) as in_buffer_count
      FROM verification_contacts
      WHERE campaign_id = ${campaignId}
    `);
    
    // Get submitted count separately
    const [submittedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(verificationLeadSubmissions)
      .where(eq(verificationLeadSubmissions.campaignId, campaignId));
    
    const row = stats.rows[0] as any;
    
    res.json({
      totalContacts: Number(row.total_contacts || 0),
      suppressedCount: Number(row.suppressed_count || 0),
      activeCount: Number(row.active_count || 0),
      eligibleCount: Number(row.eligible_count || 0),
      validatedCount: Number(row.validated_count || 0),
      okEmailCount: Number(row.ok_email_count || 0),
      invalidEmailCount: Number(row.invalid_email_count || 0),
      submittedCount: Number(submittedResult?.count || 0),
      inBufferCount: Number(row.in_buffer_count || 0),
    });
  } catch (error) {
    console.error("Error fetching campaign stats:", error);
    res.status(500).json({ error: "Failed to fetch campaign stats" });
  }
});

router.get("/api/verification-campaigns/:campaignId/contacts", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const filter = req.query.filter as string;
    
    if (!filter) {
      return res.status(400).json({ error: "filter query parameter is required" });
    }
    
    let filterCondition = sql`1=1`;
    
    switch (filter) {
      case 'all':
        filterCondition = sql`c.deleted = FALSE`;
        break;
      case 'eligible':
        filterCondition = sql`c.deleted = FALSE AND c.suppressed = FALSE AND c.eligibility_status = 'Eligible'`;
        break;
      case 'suppressed':
        filterCondition = sql`c.deleted = FALSE AND c.suppressed = TRUE`;
        break;
      case 'validated':
        filterCondition = sql`c.deleted = FALSE AND c.suppressed = FALSE AND c.verification_status = 'Validated'`;
        break;
      case 'ok_email':
        filterCondition = sql`c.deleted = FALSE AND c.suppressed = FALSE AND c.email_status = 'ok'`;
        break;
      case 'invalid_email':
        filterCondition = sql`c.deleted = FALSE AND c.suppressed = FALSE AND c.verification_status = 'Invalid'`;
        break;
      case 'submitted':
        // Get submitted lead contact IDs
        const submittedLeads = await db
          .select({ contactId: verificationLeadSubmissions.contactId })
          .from(verificationLeadSubmissions)
          .where(eq(verificationLeadSubmissions.campaignId, campaignId));
        
        const submittedIds = submittedLeads.map(l => l.contactId).filter(Boolean);
        
        if (submittedIds.length === 0) {
          return res.json([]);
        }
        
        filterCondition = sql`c.id IN (${sql.join(submittedIds.map(id => sql`${id}`), sql`, `)})`;
        break;
      default:
        return res.status(400).json({ error: "Invalid filter" });
    }
    
    const contacts = await db.execute(sql`
      SELECT 
        c.id,
        c.full_name as "fullName",
        c.email,
        c.title,
        c.verification_status as "verificationStatus",
        c.email_status as "emailStatus",
        c.suppressed,
        c.eligibility_status as "eligibilityStatus",
        c.eligibility_reason as "eligibilityReason",
        a.name as "accountName"
      FROM verification_contacts c
      LEFT JOIN accounts a ON a.id = c.account_id
      WHERE c.campaign_id = ${campaignId}
        AND ${filterCondition}
      ORDER BY c.updated_at DESC
      LIMIT 500
    `);
    
    res.json(contacts.rows);
  } catch (error) {
    console.error("Error fetching filtered contacts:", error);
    res.status(500).json({ error: "Failed to fetch filtered contacts" });
  }
});

router.get("/api/verification-campaigns/:campaignId/accounts/:accountName/cap", async (req, res) => {
  try {
    const { campaignId, accountName } = req.params;
    
    // Resolve accountId by case-insensitive name
    const [acct] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(sql`LOWER(${accounts.name}) = LOWER(${accountName})`)
      .limit(1);

    if (!acct) {
      return res.json({ accountName, submitted: 0 });
    }

    const [result] = await db
      .select({ submitted: sql<number>`count(*)` })
      .from(verificationLeadSubmissions)
      .where(and(
        eq(verificationLeadSubmissions.campaignId, campaignId),
        eq(verificationLeadSubmissions.accountId, acct.id)
      ));
    
    res.json({
      accountName,
      submitted: Number(result?.submitted || 0)
    });
  } catch (error) {
    console.error("Error fetching account cap:", error);
    res.status(500).json({ error: "Failed to fetch account cap" });
  }
});

export default router;
