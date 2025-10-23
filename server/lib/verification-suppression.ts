import { db } from "../db";
import { verificationSuppressionList, verificationContacts } from "@shared/schema";
import { sql, eq, inArray } from "drizzle-orm";
import * as crypto from "crypto";
import { normalize } from "./verification-utils";

/**
 * STRICT SUPPRESSION RULES - Only suppress when ONE of these matches:
 * 1. Email matches (exact, case-insensitive)
 * 2. CAV ID matches (exact)
 * 3. CAV User ID matches (exact)
 * 4. BOTH Full Name AND Company match (together - requires all fields non-empty)
 * 
 * EXPLICITLY FORBIDDEN:
 * - First name only
 * - Last name only
 * - Company only
 * - Full name only (without company)
 */

/**
 * Compute SHA256 hash for full name + company combination
 * Uses "|" separator to prevent collisions
 * Returns hex string for compatibility with PostgreSQL ENCODE(DIGEST(...), 'hex')
 * 
 * CRITICAL: Must use SAME normalization as contact storage (normalize.toKey, normalize.companyKey)
 */
function computeNameCompanyHash(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  company: string | null | undefined
): string | null {
  // CRITICAL: All three fields must be non-empty
  if (!firstName || !lastName || !company) {
    return null;
  }
  
  // Use SAME normalization as contact storage
  const firstNorm = normalize.toKey(firstName);
  const lastNorm = normalize.toKey(lastName);
  const companyNorm = normalize.companyKey(company);
  
  // Construct full name from normalized first/last
  const fullName = `${firstNorm} ${lastNorm}`.trim().replace(/\s+/g, ' ').toLowerCase();
  
  // Use separator to prevent collision: "John Smith|Acme" vs "John|SmithAcme"
  const hashInput = `${fullName}|${companyNorm.toLowerCase()}`;
  
  // SHA256 hex digest (matches PostgreSQL)
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Apply suppression logic to contacts after upload
 * Marks contacts as suppressed based on strict matching rules
 */
export async function applySuppressionForContacts(
  campaignId: string,
  contactIds: string[]
) {
  if (contactIds.length === 0) return;
  
  // STRICT suppression rules - only suppress if ANY of these match:
  // 1. Email matches (exact, case-insensitive)
  // 2. CAV ID matches (exact)
  // 3. CAV User ID matches (exact)
  // 4. BOTH full name AND company match (requires both non-empty)
  const result = await db
    .select({ id: verificationContacts.id })
    .from(verificationContacts)
    .leftJoin(verificationSuppressionList, 
      sql`(
        -- Rule 1: Email exact match (case-insensitive)
        (${verificationContacts.emailLower} = ${verificationSuppressionList.emailLower} 
         AND ${verificationSuppressionList.emailLower} IS NOT NULL 
         AND ${verificationSuppressionList.emailLower} != ''
         AND ${verificationContacts.emailLower} IS NOT NULL
         AND ${verificationContacts.emailLower} != '')
        
        -- Rule 2: CAV ID exact match
        OR (${verificationContacts.cavId} = ${verificationSuppressionList.cavId} 
            AND ${verificationSuppressionList.cavId} IS NOT NULL 
            AND ${verificationSuppressionList.cavId} != ''
            AND ${verificationContacts.cavId} IS NOT NULL
            AND ${verificationContacts.cavId} != '')
        
        -- Rule 3: CAV User ID exact match
        OR (${verificationContacts.cavUserId} = ${verificationSuppressionList.cavUserId} 
            AND ${verificationSuppressionList.cavUserId} IS NOT NULL 
            AND ${verificationSuppressionList.cavUserId} != ''
            AND ${verificationContacts.cavUserId} IS NOT NULL
            AND ${verificationContacts.cavUserId} != '')
        
        -- Rule 4: Full Name AND Company match TOGETHER (both required, no partial matches)
        OR (
          -- Contact MUST have ALL three fields (firstName, lastName, company) non-empty
          ${verificationContacts.firstNameNorm} IS NOT NULL 
          AND ${verificationContacts.firstNameNorm} != ''
          AND ${verificationContacts.lastNameNorm} IS NOT NULL 
          AND ${verificationContacts.lastNameNorm} != ''
          AND ${verificationContacts.companyKey} IS NOT NULL 
          AND ${verificationContacts.companyKey} != ''
          
          -- Suppression entry must also have hash (indicating it had all fields)
          AND ${verificationSuppressionList.nameCompanyHash} IS NOT NULL
          AND ${verificationSuppressionList.nameCompanyHash} != ''
          
          -- Hash match using SHA256 with separator to prevent collisions
          -- CRITICAL: Must normalize EXACTLY the same as TypeScript side
          AND ENCODE(DIGEST(
            LOWER(TRIM(REGEXP_REPLACE(
              COALESCE(${verificationContacts.firstNameNorm}, '') || ' ' || COALESCE(${verificationContacts.lastNameNorm}, ''),
              '\\s+', ' ', 'g'
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

/**
 * Add entries to suppression list
 * Computes normalized fields and hash for name+company matching
 */
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
      // Rule 1: Email normalization (MUST use same as contact storage)
      const emailLower = entry.email ? normalize.emailLower(entry.email) : null;
      
      // Rules 2 & 3: CAV IDs (exact match, trim)
      const cavId = entry.cavId?.trim() || null;
      const cavUserId = entry.cavUserId?.trim() || null;
      
      // Rule 4: Name+Company hash
      // CRITICAL: Only compute hash when ALL three fields are present
      // This prevents company-only or name-only false positives
      // Uses SAME normalization as contact storage
      const nameCompanyHash = computeNameCompanyHash(
        entry.firstName,
        entry.lastName,
        entry.companyKey
      );
      
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
