import { Router } from "express";
import { db } from "../db";
import {
  verificationContacts,
  verificationLeadSubmissions,
  verificationCampaigns,
  accounts,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.post("/api/verification-campaigns/:campaignId/submission/prepare", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const batchSize = Number(req.body?.batchSize) || 500;
    
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, campaignId));
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    const cap = campaign.leadCapPerAccount;
    
    const result = await db.execute(sql`
      WITH eligible_contacts AS (
        SELECT 
          c.id as contact_id,
          c.account_id,
          ${campaignId} as campaign_id
        FROM verification_contacts c
        LEFT JOIN accounts a ON a.id = c.account_id
        WHERE c.campaign_id = ${campaignId}
          AND c.verification_status = 'Validated'
          AND c.eligibility_status = 'Eligible'
          AND c.suppressed = FALSE
          AND c.email_status = 'ok'
          AND c.in_submission_buffer = FALSE
          AND (
            SELECT COUNT(*) FROM verification_lead_submissions s
            WHERE s.account_id = c.account_id AND s.campaign_id = ${campaignId}
          ) < ${cap}
        ORDER BY c.account_id, c.priority_score DESC NULLS LAST
        LIMIT ${batchSize}
      )
      INSERT INTO verification_lead_submissions (contact_id, account_id, campaign_id)
      SELECT contact_id, account_id, campaign_id
      FROM eligible_contacts
      ON CONFLICT DO NOTHING
      RETURNING contact_id
    `);
    
    const contactIds = result.rows.map((r: any) => r.contact_id);
    
    if (contactIds.length > 0) {
      await db.execute(sql`
        UPDATE verification_contacts
        SET in_submission_buffer = TRUE, updated_at = NOW()
        WHERE id = ANY(${contactIds}::varchar[])
      `);
    }
    
    res.json({ buffered: contactIds.length });
  } catch (error) {
    console.error("Error preparing submission buffer:", error);
    res.status(500).json({ error: "Failed to prepare submission buffer" });
  }
});

router.get("/api/verification-campaigns/:campaignId/submission/export", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const templateType = req.query.template || 'enriched';
    
    const [campaign] = await db
      .select()
      .from(verificationCampaigns)
      .where(eq(verificationCampaigns.id, campaignId));
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    let whereClause = sql`
      c.campaign_id = ${campaignId}
      AND c.eligibility_status = 'Eligible'
      AND c.suppressed = FALSE
      AND c.deleted = FALSE
      AND c.email_status = 'ok'
      AND c.in_submission_buffer = TRUE
    `;
    
    if (templateType === 'client_cav') {
      whereClause = sql`${whereClause} AND c.cav_id IS NOT NULL`;
    }
    
    const exportData = await db.execute(sql`
      SELECT 
        c.*,
        a.name as account_name,
        a.hq_street_1 as hq_address_line1,
        a.hq_street_2 as hq_address_line2,
        a.hq_street_3 as hq_address_line3,
        a.hq_city,
        a.hq_state,
        a.hq_country,
        a.hq_postal_code,
        a.main_phone as account_phone,
        a.domain as account_domain,
        a.linkedin_url as account_linkedin
      FROM verification_contacts c
      LEFT JOIN accounts a ON a.id = c.account_id
      WHERE ${whereClause}
      ORDER BY a.name, c.last_name, c.first_name
    `);
    
    const mapped = exportData.rows.map((row: any) => {
      const city = row.contact_city || row.hq_city;
      const state = row.contact_state || row.hq_state;
      const country = row.contact_country || row.hq_country;
      const postal = row.contact_postal || row.hq_postal_code;
      
      if (templateType === 'client_cav') {
        return {
          "CAV-ID": row.cav_id,
          "CAV-User ID": row.cav_user_id,
          "CAV-Company": row.account_name,
          "CAV-Addr1": row.hq_address_line1 || "",
          "CAV-Addr2": row.hq_address_line2 || "",
          "CAV-Addr3": row.hq_address_line3 || "",
          "CAV-Town": city || "",
          "CAV-County": state || "",
          "CAV-Postcode": postal || "",
          "CAV-Country": country || "",
          "CAV-Tel": row.phone || row.account_phone || "",
          "CAV-Forename": row.first_name || "",
          "CAV-Surname": row.last_name || "",
          "CAV-Job Title": row.title || "",
          "CAV-Email": row.email || "",
          "Linkedin URL/Social Media Profile": row.linkedin_url || row.account_linkedin || "",
        };
      } else {
        return {
          "First Name": row.first_name || "",
          "Last Name": row.last_name || "",
          "Full Name": row.full_name || "",
          "Title": row.title || "",
          "Email": row.email || "",
          "Phone": row.phone || "",
          "Mobile": row.mobile || "",
          "LinkedIn URL": row.linkedin_url || "",
          "Company": row.account_name || "",
          "City": city || "",
          "State": state || "",
          "Country": country || "",
          "Postal Code": postal || "",
          "Domain": row.account_domain || "",
          "Account Phone": row.account_phone || "",
          "Source Type": row.source_type || "",
          "CAV ID": row.cav_id || "",
        };
      }
    });
    
    res.json({ data: mapped, count: mapped.length });
  } catch (error) {
    console.error("Error exporting data:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});

export default router;
