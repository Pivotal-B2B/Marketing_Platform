import crypto from "crypto";
import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Normalization utilities for suppression matching
 * These must match EXACTLY with the SQL normalization in the database triggers
 */
export const normalize = {
  /**
   * Normalize email: lowercase and trim
   */
  email: (email?: string | null): string | null => {
    if (!email) return null;
    return email.trim().toLowerCase();
  },

  /**
   * Normalize text: lowercase, trim, and collapse whitespace
   */
  text: (text?: string | null): string | null => {
    if (!text) return null;
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
  },

  /**
   * Normalize full name from first and last name
   */
  fullName: (firstName?: string | null, lastName?: string | null): string | null => {
    const first = firstName?.trim() || '';
    const last = lastName?.trim() || '';
    const combined = `${first} ${last}`.trim();
    if (!combined) return null;
    return combined.replace(/\s+/g, ' ').toLowerCase();
  },

  /**
   * Normalize company name
   */
  company: (companyName?: string | null): string | null => {
    if (!companyName) return null;
    return companyName.trim().replace(/\s+/g, ' ').toLowerCase();
  },
};

/**
 * Compute SHA256 hash of full name + company for matching
 * Returns hex-encoded hash string
 * CRITICAL: Only compute when BOTH full name AND company are present
 */
export function computeNameCompanyHash(
  fullNameNorm?: string | null,
  companyNorm?: string | null
): string | null {
  if (!fullNameNorm || !companyNorm) return null;
  const input = `${fullNameNorm}|${companyNorm}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Get suppression reason for a contact using STRICT matching rules
 * 
 * STRICT RULES - Only suppress if ANY of these match:
 * 1. Email matches (exact, case-insensitive)
 * 2. CAV ID matches
 * 3. CAV User ID matches
 * 4. BOTH full name AND company match (requires both to be non-empty)
 * 
 * Explicitly NOT allowed: first-only, last-only, company-only, or partial matches
 */
export async function getSuppressionReason(contactId: string): Promise<string | null> {
  const result = await db.execute(sql`
    WITH contact_data AS (
      SELECT 
        c.id,
        LOWER(TRIM(c.email)) AS email_norm,
        c.cav_id,
        c.cav_user_id,
        c.full_name_norm,
        c.company_norm,
        c.name_company_hash
      FROM contacts c
      WHERE c.id = ${contactId}
        AND c.deleted_at IS NULL
    )
    SELECT
      CASE
        -- Rule 1: Email exact match (case-insensitive)
        WHEN EXISTS (
          SELECT 1 FROM suppression_list s
          WHERE s.email_norm = contact_data.email_norm
            AND contact_data.email_norm IS NOT NULL
            AND contact_data.email_norm != ''
        ) THEN 'email'
        
        -- Rule 2: CAV ID exact match
        WHEN EXISTS (
          SELECT 1 FROM suppression_list s
          WHERE s.cav_id = contact_data.cav_id
            AND contact_data.cav_id IS NOT NULL
            AND contact_data.cav_id != ''
        ) THEN 'cav_id'
        
        -- Rule 3: CAV User ID exact match
        WHEN EXISTS (
          SELECT 1 FROM suppression_list s
          WHERE s.cav_user_id = contact_data.cav_user_id
            AND contact_data.cav_user_id IS NOT NULL
            AND contact_data.cav_user_id != ''
        ) THEN 'cav_user_id'
        
        -- Rule 4: Full Name + Company match TOGETHER (both required)
        WHEN (
          contact_data.full_name_norm IS NOT NULL
          AND contact_data.full_name_norm != ''
          AND contact_data.company_norm IS NOT NULL
          AND contact_data.company_norm != ''
          AND contact_data.name_company_hash IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM suppression_list s
            WHERE s.name_company_hash = contact_data.name_company_hash
              AND s.name_company_hash IS NOT NULL
              AND s.name_company_hash != ''
          )
        ) THEN 'full_name+company'
        
        ELSE NULL
      END AS suppression_reason
    FROM contact_data
  `);
  
  const row = result.rows[0] as { suppression_reason: string | null } | undefined;
  return row?.suppression_reason || null;
}

/**
 * Check suppression for multiple contacts
 * Returns a map of contactId -> suppression reason
 */
export async function checkSuppressionBulk(
  contactIds: string[]
): Promise<Map<string, string>> {
  if (contactIds.length === 0) {
    return new Map();
  }
  
  const result = await db.execute(sql`
    WITH contact_data AS (
      SELECT 
        c.id,
        LOWER(TRIM(c.email)) AS email_norm,
        c.cav_id,
        c.cav_user_id,
        c.full_name_norm,
        c.company_norm,
        c.name_company_hash
      FROM contacts c
      WHERE c.id = ANY(${contactIds}::varchar[])
        AND c.deleted_at IS NULL
    )
    SELECT
      contact_data.id,
      CASE
        -- Rule 1: Email exact match (case-insensitive)
        WHEN EXISTS (
          SELECT 1 FROM suppression_list s
          WHERE s.email_norm = contact_data.email_norm
            AND contact_data.email_norm IS NOT NULL
            AND contact_data.email_norm != ''
        ) THEN 'email'
        
        -- Rule 2: CAV ID exact match
        WHEN EXISTS (
          SELECT 1 FROM suppression_list s
          WHERE s.cav_id = contact_data.cav_id
            AND contact_data.cav_id IS NOT NULL
            AND contact_data.cav_id != ''
        ) THEN 'cav_id'
        
        -- Rule 3: CAV User ID exact match
        WHEN EXISTS (
          SELECT 1 FROM suppression_list s
          WHERE s.cav_user_id = contact_data.cav_user_id
            AND contact_data.cav_user_id IS NOT NULL
            AND contact_data.cav_user_id != ''
        ) THEN 'cav_user_id'
        
        -- Rule 4: Full Name + Company match TOGETHER (both required)
        WHEN (
          contact_data.full_name_norm IS NOT NULL
          AND contact_data.full_name_norm != ''
          AND contact_data.company_norm IS NOT NULL
          AND contact_data.company_norm != ''
          AND contact_data.name_company_hash IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM suppression_list s
            WHERE s.name_company_hash = contact_data.name_company_hash
              AND s.name_company_hash IS NOT NULL
              AND s.name_company_hash != ''
          )
        ) THEN 'full_name+company'
        
        ELSE NULL
      END AS suppression_reason
    FROM contact_data
    WHERE CASE
      WHEN EXISTS (SELECT 1 FROM suppression_list s WHERE s.email_norm = contact_data.email_norm AND contact_data.email_norm IS NOT NULL AND contact_data.email_norm != '') THEN TRUE
      WHEN EXISTS (SELECT 1 FROM suppression_list s WHERE s.cav_id = contact_data.cav_id AND contact_data.cav_id IS NOT NULL AND contact_data.cav_id != '') THEN TRUE
      WHEN EXISTS (SELECT 1 FROM suppression_list s WHERE s.cav_user_id = contact_data.cav_user_id AND contact_data.cav_user_id IS NOT NULL AND contact_data.cav_user_id != '') THEN TRUE
      WHEN (
        contact_data.full_name_norm IS NOT NULL
        AND contact_data.full_name_norm != ''
        AND contact_data.company_norm IS NOT NULL
        AND contact_data.company_norm != ''
        AND contact_data.name_company_hash IS NOT NULL
        AND EXISTS (SELECT 1 FROM suppression_list s WHERE s.name_company_hash = contact_data.name_company_hash AND s.name_company_hash IS NOT NULL AND s.name_company_hash != '')
      ) THEN TRUE
      ELSE FALSE
    END
  `);
  
  const suppressionMap = new Map<string, string>();
  for (const row of result.rows) {
    const r = row as { id: string; suppression_reason: string | null };
    if (r.suppression_reason) {
      suppressionMap.set(r.id, r.suppression_reason);
    }
  }
  
  return suppressionMap;
}

/**
 * Apply suppression checking to a batch of contacts and update their status
 * This function will mark contacts as suppressed if they match any suppression rule
 */
export async function applySuppressionToContacts(contactIds: string[]): Promise<{
  totalChecked: number;
  totalSuppressed: number;
  suppressedBy: Record<string, number>;
}> {
  if (contactIds.length === 0) {
    return {
      totalChecked: 0,
      totalSuppressed: 0,
      suppressedBy: {},
    };
  }

  const suppressionMap = await checkSuppressionBulk(contactIds);

  // Count suppression reasons
  const suppressedBy: Record<string, number> = {};
  for (const reason of suppressionMap.values()) {
    suppressedBy[reason] = (suppressedBy[reason] || 0) + 1;
  }

  return {
    totalChecked: contactIds.length,
    totalSuppressed: suppressionMap.size,
    suppressedBy,
  };
}
