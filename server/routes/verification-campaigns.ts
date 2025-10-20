import { Router } from "express";
import { db } from "../db";
import { verificationCampaigns, insertVerificationCampaignSchema, verificationLeadSubmissions, verificationContacts } from "@shared/schema";
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
      .values(validatedData)
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

router.get("/api/verification-campaigns/:campaignId/accounts/:accountName/cap", async (req, res) => {
  try {
    const { campaignId, accountName } = req.params;
    
    const [result] = await db
      .select({
        submitted: sql<number>`count(*)`
      })
      .from(verificationLeadSubmissions)
      .innerJoin(verificationContacts, eq(verificationLeadSubmissions.contactId, verificationContacts.id))
      .where(
        and(
          eq(verificationLeadSubmissions.campaignId, campaignId),
          eq(verificationContacts.account_name, accountName)
        )
      );
    
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
