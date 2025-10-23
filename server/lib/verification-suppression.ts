import { db } from "../db";
import { verificationSuppressionList, verificationContacts } from "@shared/schema";
import { sql, eq, inArray } from "drizzle-orm";
import { normalize, computeNameCompanyHash } from "./verification-utils";

export async function applySuppressionForContacts(
  campaignId: string,
  contactIds: string[]
) {
  if (contactIds.length === 0) return;
  
  // STRICT suppression rules - only suppress if ANY of these match:
  // 1. Email matches
  // 2. CAV ID matches  
  // 3. CAV User ID matches
  // 4. BOTH full name AND company match (requires both to be non-empty)
  //
  // Explicitly NOT allowed: first-only, last-only, company-only, or name-only matches
  const result = await db
    .select({ id: verificationContacts.id })
    .from(verificationContacts)
    .leftJoin(verificationSuppressionList, 
      sql`(
        -- Rule 1: Email exact match
        (${verificationContacts.emailLower} = ${verificationSuppressionList.emailLower} 
         AND ${verificationSuppressionList.emailLower} IS NOT NULL 
         AND ${verificationSuppressionList.emailLower} != '')
        
        -- Rule 2: CAV ID exact match
        OR (${verificationContacts.cavId} = ${verificationSuppressionList.cavId} 
            AND ${verificationSuppressionList.cavId} IS NOT NULL 
            AND ${verificationSuppressionList.cavId} != '')
        
        -- Rule 3: CAV User ID exact match
        OR (${verificationContacts.cavUserId} = ${verificationSuppressionList.cavUserId} 
            AND ${verificationSuppressionList.cavUserId} IS NOT NULL 
            AND ${verificationSuppressionList.cavUserId} != '')
        
        -- Rule 4: Full Name AND Company match TOGETHER (both required, no partial matches)
        OR (
          -- Contact must have BOTH full name AND company (non-empty)
          ${verificationContacts.firstNameNorm} IS NOT NULL 
          AND ${verificationContacts.firstNameNorm} != ''
          AND ${verificationContacts.lastNameNorm} IS NOT NULL 
          AND ${verificationContacts.lastNameNorm} != ''
          AND ${verificationContacts.companyKey} IS NOT NULL 
          AND ${verificationContacts.companyKey} != ''
          
          -- Suppression entry must also have BOTH full name AND company (non-empty)
          AND ${verificationSuppressionList.nameCompanyHash} IS NOT NULL
          AND ${verificationSuppressionList.nameCompanyHash} != ''
          
          -- Hash match using SHA256 with separator to prevent collisions
          -- CRITICAL: Normalize EXACTLY the same as TypeScript side
          AND ENCODE(DIGEST(
            LOWER(TRIM(REGEXP_REPLACE(
              COALESCE(${verificationContacts.firstNameNorm}, '') || ' ' || COALESCE(${verificationContacts.lastNameNorm}, ''),
              '\s+', ' ', 'g'
            ))) || '|' || LOWER(TRIM(${verificationContacts.companyKey})),
            'sha256'
          ), 'hex') = ${verificationSuppressionList.nameCompanyHash}
        )
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
      
      // CRITICAL: Only compute hash when ALL three fields are present
      // This prevents company-only or name-only false positives
      // Use SHA256 with separator for collision resistance
      let nameCompanyHash = null;
      if (entry.firstName && entry.lastName && entry.companyKey) {
        // Normalize EXACTLY the same as SQL query for consistency
        const firstNorm = normalize.toKey(entry.firstName);
        const lastNorm = normalize.toKey(entry.lastName);
        const fullNameRaw = (firstNorm + ' ' + lastNorm).trim().replace(/\s+/g, ' ').toLowerCase();
        
        // companyKey is already normalized by normalize.companyKey(), just need to ensure lowercase
        const companyNorm = entry.companyKey.toLowerCase().trim();
        
        const hashInput = `${fullNameRaw}|${companyNorm}`;
        
        // Compute SHA256 hex (matching PostgreSQL ENCODE(DIGEST(...), 'hex'))
        const crypto = require('crypto');
        nameCompanyHash = crypto.createHash('sha256').update(hashInput).digest('hex');
      }
      
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
