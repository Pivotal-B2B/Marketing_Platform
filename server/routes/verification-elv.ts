import { Router } from "express";
import { db } from "../db";
import {
  verificationContacts,
  verificationEmailValidations,
  verificationCampaigns,
} from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { runELV } from "../lib/verification-elv";

const router = Router();

const ELV_API_KEY = process.env.EMAIL_LIST_VERIFY_API_KEY || "";
const CACHE_DAYS = 60;

router.post("/api/verification-contacts/:id/email/verify", async (req, res) => {
  try {
    if (!ELV_API_KEY) {
      return res.status(500).json({ error: "ELV API key not configured" });
    }
    
    const [contact] = await db
      .select()
      .from(verificationContacts)
      .where(eq(verificationContacts.id, req.params.id));
    
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    if (
      contact.eligibilityStatus !== 'Eligible' ||
      contact.verificationStatus !== 'Validated' ||
      contact.suppressed === true ||
      !contact.email
    ) {
      return res.status(409).json({
        error: "Preconditions not met",
        details: "Contact must be Eligible, Validated, not suppressed, and have an email",
      });
    }
    
    const cacheThreshold = new Date(Date.now() - CACHE_DAYS * 24 * 3600 * 1000);
    const [cached] = await db
      .select()
      .from(verificationEmailValidations)
      .where(
        and(
          eq(verificationEmailValidations.contactId, contact.id),
          gt(verificationEmailValidations.checkedAt, cacheThreshold)
        )
      );
    
    if (cached) {
      return res.json({
        contactId: contact.id,
        cached: true,
        emailStatus: cached.status,
      });
    }
    
    const { status, raw } = await runELV(contact.email, ELV_API_KEY);
    
    await db
      .insert(verificationEmailValidations)
      .values({
        contactId: contact.id,
        status,
        rawJson: raw,
        checkedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: verificationEmailValidations.contactId,
        set: {
          status,
          rawJson: raw,
          checkedAt: new Date(),
        },
      });
    
    await db
      .update(verificationContacts)
      .set({ emailStatus: status, updatedAt: new Date() })
      .where(eq(verificationContacts.id, contact.id));
    
    res.json({
      contactId: contact.id,
      elv: { status, raw },
      emailStatus: status,
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ error: "Failed to verify email" });
  }
});

router.post("/api/verification-campaigns/:campaignId/email/verify/batch", async (req, res) => {
  try {
    if (!ELV_API_KEY) {
      return res.status(500).json({ error: "ELV API key not configured" });
    }
    
    const { campaignId } = req.params;
    const { contactIds } = req.body;
    
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: "contactIds must be a non-empty array" });
    }
    
    const results = {
      ok: [] as string[],
      risky: [] as Array<{ id: string; reason: string }>,
      invalid: [] as Array<{ id: string; reason: string }>,
      skipped: [] as Array<{ id: string; reason: string }>,
    };
    
    for (const contactId of contactIds) {
      const [contact] = await db
        .select()
        .from(verificationContacts)
        .where(eq(verificationContacts.id, contactId));
      
      if (
        !contact ||
        contact.campaignId !== campaignId ||
        contact.eligibilityStatus !== 'Eligible' ||
        contact.verificationStatus !== 'Validated' ||
        contact.suppressed === true ||
        !contact.email
      ) {
        results.skipped.push({ id: contactId, reason: 'precondition' });
        continue;
      }
      
      const cacheThreshold = new Date(Date.now() - CACHE_DAYS * 24 * 3600 * 1000);
      const [cached] = await db
        .select()
        .from(verificationEmailValidations)
        .where(
          and(
            eq(verificationEmailValidations.contactId, contactId),
            gt(verificationEmailValidations.checkedAt, cacheThreshold)
          )
        );
      
      if (cached) {
        results.skipped.push({ id: contactId, reason: 'cached' });
        continue;
      }
      
      const { status, raw } = await runELV(contact.email, ELV_API_KEY);
      
      await db
        .insert(verificationEmailValidations)
        .values({
          contactId,
          status,
          rawJson: raw,
          checkedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: verificationEmailValidations.contactId,
          set: {
            status,
            rawJson: raw,
            checkedAt: new Date(),
          },
        });
      
      await db
        .update(verificationContacts)
        .set({ emailStatus: status, updatedAt: new Date() })
        .where(eq(verificationContacts.id, contactId));
      
      if (status === 'ok') {
        results.ok.push(contactId);
      } else if (status === 'risky') {
        results.risky.push({ id: contactId, reason: 'risky' });
      } else {
        results.invalid.push({ id: contactId, reason: 'invalid' });
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error("Error batch verifying emails:", error);
    res.status(500).json({ error: "Failed to batch verify emails" });
  }
});

export default router;
