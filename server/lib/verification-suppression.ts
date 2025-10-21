import { db } from "../db";
import { verificationSuppressionList, verificationContacts } from "@shared/schema";
import { sql, eq, inArray } from "drizzle-orm";
import { normalize, computeNameCompanyHash } from "./verification-utils";

export async function applySuppressionForContacts(
  campaignId: string,
  contactIds: string[]
) {
  if (contactIds.length === 0) return;
  
  await db.execute(sql`
    UPDATE verification_contacts c
    SET suppressed = TRUE
    WHERE c.id = ANY(${contactIds}::varchar[])
      AND c.campaign_id = ${campaignId}
      AND (
        c.email_lower IN (
          SELECT email_lower FROM verification_suppression_list
          WHERE (campaign_id = ${campaignId} OR campaign_id IS NULL) AND email_lower IS NOT NULL
        )
        OR c.cav_id IN (
          SELECT cav_id FROM verification_suppression_list
          WHERE (campaign_id = ${campaignId} OR campaign_id IS NULL) AND cav_id IS NOT NULL
        )
        OR c.cav_user_id IN (
          SELECT cav_user_id FROM verification_suppression_list
          WHERE (campaign_id = ${campaignId} OR campaign_id IS NULL) AND cav_user_id IS NOT NULL
        )
        OR MD5(LOWER(COALESCE(c.first_name, '')) || LOWER(COALESCE(c.last_name, '')) || LOWER(COALESCE(c.company_key, ''))) IN (
          SELECT name_company_hash FROM verification_suppression_list
          WHERE (campaign_id = ${campaignId} OR campaign_id IS NULL) AND name_company_hash IS NOT NULL
        )
      )
  `);
}

export async function addToSuppressionList(
  campaignId: string | null,
  entries: {
    email?: string;
    cavId?: string;
    cavUserId?: string;
    firstName?: string;
    lastName?: string;
    companyKey?: string;
  }[]
) {
  if (entries.length === 0) return;

  // Use raw SQL to avoid Drizzle stack overflow on large inserts
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    
    const values = batch.map(entry => {
      const emailLower = entry.email ? normalize.emailLower(entry.email) : null;
      const cavId = entry.cavId || null;
      const cavUserId = entry.cavUserId || null;
      const nameCompanyHash = (entry.firstName || entry.lastName || entry.companyKey)
        ? computeNameCompanyHash(entry.firstName, entry.lastName, entry.companyKey)
        : null;
      
      return sql`(
        ${campaignId},
        ${emailLower},
        ${cavId},
        ${cavUserId},
        ${nameCompanyHash}
      )`;
    });
    
    await db.execute(sql`
      INSERT INTO verification_suppression_list 
        (campaign_id, email_lower, cav_id, cav_user_id, name_company_hash)
      VALUES ${sql.join(values, sql`, `)}
    `);
  }
}
