import { Router } from "express";
import { db } from "../db";
import { verificationSuppressionList, insertVerificationSuppressionListSchema } from "@shared/schema";
import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { addToSuppressionList } from "../lib/verification-suppression";

const router = Router();

router.get("/api/verification-campaigns/:campaignId/suppression", async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const items = await db
      .select()
      .from(verificationSuppressionList)
      .where(
        or(
          eq(verificationSuppressionList.campaignId, campaignId),
          sql`${verificationSuppressionList.campaignId} IS NULL`
        )
      );
    
    res.json(items);
  } catch (error) {
    console.error("Error fetching suppression list:", error);
    res.status(500).json({ error: "Failed to fetch suppression list" });
  }
});

router.post("/api/verification-campaigns/:campaignId/suppression", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { entries } = req.body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "entries must be a non-empty array" });
    }
    
    await addToSuppressionList(campaignId, entries);
    
    res.status(201).json({ added: entries.length });
  } catch (error) {
    console.error("Error adding to suppression list:", error);
    res.status(500).json({ error: "Failed to add to suppression list" });
  }
});

router.post("/api/verification-suppression/global", async (req, res) => {
  try {
    const { entries } = req.body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "entries must be a non-empty array" });
    }
    
    await addToSuppressionList(null, entries);
    
    res.status(201).json({ added: entries.length });
  } catch (error) {
    console.error("Error adding to global suppression list:", error);
    res.status(500).json({ error: "Failed to add to global suppression list" });
  }
});

export default router;
