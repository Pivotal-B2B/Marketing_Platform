import { Router } from "express";
import { verifyApiKey, verifyHmac } from "../lib/webhookVerify";
import { db } from "../db";
import { contentEvents, insertContentEventSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Webhook event payload schema
const webhookEventSchema = z.object({
  api_key: z.string(),
  event: z.enum(["page_view", "form_submission"]),
  data: z.object({
    content_type: z.string().optional(),
    content_id: z.string().optional(),
    slug: z.string().optional(),
    title: z.string().optional(),
    community: z.string().optional(),
    contact_id: z.string().optional(),
    email: z.string().optional(),
    url: z.string().optional(),
    form_id: z.string().optional(),
    fields: z.record(z.any()).optional(),
    ts: z.string()
  })
});

/**
 * Webhook receiver for Resources Centre events (page_view, form_submission)
 * Security: HMAC-SHA256 signature validation + API key
 * Deduplication: unique constraint on uniq_key
 */
router.post("/resources-centre", async (req, res) => {
  try {
    const {
      WEBHOOK_API_KEY,
      WEBHOOK_SHARED_SECRET,
      SIG_TTL_SECONDS = "300"
    } = process.env;

    if (!WEBHOOK_API_KEY || !WEBHOOK_SHARED_SECRET) {
      console.error("Missing webhook configuration");
      return res.status(500).json({ status: "error", message: "Webhook not configured" });
    }

    // Verify API key
    if (!verifyApiKey(req, WEBHOOK_API_KEY)) {
      console.warn("Webhook: Invalid API key");
      return res.status(401).json({ status: "error", message: "Invalid API key" });
    }

    // Verify HMAC signature
    if (!verifyHmac(req, WEBHOOK_SHARED_SECRET, Number(SIG_TTL_SECONDS))) {
      console.warn("Webhook: Invalid signature or expired timestamp");
      return res.status(401).json({ status: "error", message: "Invalid signature" });
    }

    // Validate payload
    const validation = webhookEventSchema.safeParse(req.body);
    if (!validation.success) {
      console.warn("Webhook: Invalid payload", validation.error);
      return res.status(400).json({ status: "error", message: "Invalid payload" });
    }

    const { event, data } = validation.data;

    // Build deduplication key
    const now = new Date(data.ts || Date.now());
    const dayBucket = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
    const minuteBucket = `${dayBucket}-${now.getUTCHours()}-${now.getUTCMinutes()}`;

    let uniqKey = event;
    if (event === "page_view") {
      // Dedupe: same content + same contact + same day
      uniqKey += `|${data.content_id || ""}|${data.contact_id || ""}|${dayBucket}`;
    } else if (event === "form_submission") {
      // Dedupe: same form + same contact/email + same minute
      uniqKey += `|${data.form_id || ""}|${data.contact_id || data.email || ""}|${minuteBucket}`;
    } else {
      uniqKey += `|${minuteBucket}`;
    }

    // Insert event (ON CONFLICT DO NOTHING via unique constraint)
    try {
      await db.insert(contentEvents).values({
        eventName: event,
        contentType: data.content_type || null,
        contentId: data.content_id || null,
        slug: data.slug || null,
        title: data.title || null,
        community: data.community || null,
        contactId: data.contact_id || null,
        email: data.email || null,
        url: data.url || null,
        payloadJson: data,
        ts: new Date(data.ts),
        uniqKey
      });

      console.log(`Webhook: Stored ${event} event for ${data.contact_id || data.email || "anonymous"}`);
    } catch (e: any) {
      // If duplicate key, silently succeed (deduplication working)
      if (e.code === "23505" || e.message?.includes("unique constraint")) {
        console.log(`Webhook: Duplicate ${event} event ignored (dedupe)`);
      } else {
        throw e;
      }
    }

    return res.json({ status: "ok" });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return res.status(500).json({ status: "error", message: e.message });
  }
});

export default router;
