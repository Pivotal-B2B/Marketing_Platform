import { db } from "../db";
import { verificationSuppressionList, verificationContacts } from "@shared/schema";
import { sql, eq, inArray } from "drizzle-orm";
import { normalize, computeNameCompanyHash } from "./verification-utils";

export async function applySuppressionForContacts(
  campaignId: string,
  contactIds: string[]
) {
  if (contactIds.length === 0) return;
  
  // Get suppressed contacts matching the criteria
  const result = await db
    .select({ id: verificationContacts.id })
    .from(verificationContacts)
    .leftJoin(verificationSuppressionList, 
      sql`(
        (${verificationContacts.emailLower} = ${verificationSuppressionList.emailLower} AND ${verificationSuppressionList.emailLower} IS NOT NULL)
        OR (${verificationContacts.cavId} = ${verificationSuppressionList.cavId} AND ${verificationSuppressionList.cavId} IS NOT NULL)
        OR (${verificationContacts.cavUserId} = ${verificationSuppressionList.cavUserId} AND ${verificationSuppressionList.cavUserId} IS NOT NULL)
        OR (MD5(LOWER(COALESCE(${verificationContacts.firstName}, '')) || LOWER(COALESCE(${verificationContacts.lastName}, '')) || LOWER(COALESCE(${verificationContacts.companyKey}, ''))) = ${verificationSuppressionList.nameCompanyHash} AND ${verificationSuppressionList.nameCompanyHash} IS NOT NULL)
      ) AND (${verificationSuppressionList.campaignId} = ${campaignId} OR ${verificationSuppressionList.campaignId} IS NULL)`
    )
    .where(
      sql`${inArray(verificationContacts.id, contactIds)} 
        AND ${eq(verificationContacts.campaignId, campaignId)}
        AND ${eq(verificationContacts.deleted, false)}
        AND ${verificationSuppressionList.id} IS NOT NULL`
    );
  
  // Update only the contacts that matched suppression criteria
  if (result.length > 0) {
    const suppressedIds = result.map(r => r.id);
    await db
      .update(verificationContacts)
      .set({ suppressed: true })
      .where(inArray(verificationContacts.id, suppressedIds));
  }
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

  // Batch insert using Drizzle insert API for performance
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    
    // Prepare values for batch insert
    const values = batch.map(entry => {
      const emailLower = entry.email ? normalize.emailLower(entry.email) : null;
      const cavId = entry.cavId || null;
      const cavUserId = entry.cavUserId || null;
      const nameCompanyHash = (entry.firstName || entry.lastName || entry.companyKey)
        ? computeNameCompanyHash(entry.firstName, entry.lastName, entry.companyKey)
        : null;
      
      return {
        campaignId,
        emailLower,
        cavId,
        cavUserId,
        nameCompanyHash,
      };
    });
    
    await db.insert(verificationSuppressionList).values(values);
  }
}
