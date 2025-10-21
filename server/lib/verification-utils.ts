import type { VerificationCampaign } from "@shared/schema";
import crypto from 'crypto';

export const normalize = {
  toKey: (s?: string | null) =>
    (s ?? "").toLowerCase().trim().replace(/\s+/g, " "),
  countryKey: (s?: string | null) =>
    (s ?? "").toLowerCase().replace(/\./g, "").trim(),
  emailLower: (s?: string | null) =>
    (s ?? "").toLowerCase().trim(),
  
  /**
   * Smart company name normalization that handles:
   * - Legal suffixes (Ltd, Inc, LLC, Corp, etc.)
   * - Punctuation and special characters
   * - Common abbreviations
   * - Extra words (The, Group, Holdings)
   * - International variations
   */
  companyKey: (s?: string | null): string => {
    if (!s) return "";
    
    let normalized = s.toLowerCase().trim();
    
    // Remove common legal suffixes (must be at end of string)
    const legalSuffixes = [
      'limited', 'ltd', 'llc', 'inc', 'incorporated', 'corp', 'corporation',
      'plc', 'sa', 'gmbh', 'ag', 'nv', 'bv', 'spa', 'srl', 'kg', 'oy',
      'co', 'company', 'group', 'holdings', 'holding', 'international',
      'intl', 'global', 'worldwide', 'pvt', 'pte', 'pty', 'sdn bhd',
      'public company', 'joint stock company', 'jsc', 'ojsc', 'pjsc'
    ];
    
    // Remove suffixes at the end (with optional period/comma)
    for (const suffix of legalSuffixes) {
      const patterns = [
        new RegExp(`[,.]?\\s+${suffix}[,.]?$`, 'gi'),
        new RegExp(`\\s+${suffix}[,.]?$`, 'gi'),
      ];
      for (const pattern of patterns) {
        normalized = normalized.replace(pattern, '');
      }
    }
    
    // Remove "The" at the beginning
    normalized = normalized.replace(/^the\s+/i, '');
    
    // Remove all punctuation and special characters (keep spaces, letters, numbers)
    normalized = normalized.replace(/[^\w\s]/g, '');
    
    // Normalize common company name patterns
    const abbreviations: Record<string, string> = {
      'airways': 'air',
      'airline': 'air',
      'airlines': 'air',
      'international': 'intl',
      'aviation': 'avia',
      'technologies': 'tech',
      'technology': 'tech',
      'systems': 'sys',
      'solutions': 'sol',
      'services': 'svc',
      'manufacturing': 'mfg',
    };
    
    // Apply abbreviation normalization (optional - can make matching more aggressive)
    for (const [full, abbr] of Object.entries(abbreviations)) {
      normalized = normalized.replace(new RegExp(`\\b${full}\\b`, 'g'), abbr);
      normalized = normalized.replace(new RegExp(`\\b${abbr}\\b`, 'g'), abbr);
    }
    
    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }
};

export function evaluateEligibility(
  title: string | null | undefined,
  contactCountry: string | null | undefined,
  campaign: VerificationCampaign,
  email?: string | null
) {
  // CRITICAL: Email is required for verification campaigns
  if (!email || email.trim() === '') {
    return { status: 'Out_of_Scope' as const, reason: 'missing_email_address' };
  }
  
  const t = (title ?? "").toLowerCase();
  const c = normalize.countryKey(contactCountry);
  
  const eligibilityConfig = campaign.eligibilityConfig || {};
  const { geoAllow = [], titleKeywords = [], seniorDmFallback = [] } = eligibilityConfig;
  
  if (geoAllow.length === 0 && titleKeywords.length === 0 && seniorDmFallback.length === 0) {
    return { status: 'Eligible' as const, reason: 'no_restrictions' };
  }
  
  const countryOk = geoAllow.length === 0 || geoAllow.some(allowed => 
    c.includes(allowed.toLowerCase()) || allowed.toLowerCase().includes(c)
  );
  
  const titleMatch = titleKeywords.length === 0 || titleKeywords.some(keyword => 
    t.includes(keyword.toLowerCase())
  );
  
  const seniorMatch = seniorDmFallback.length > 0 && seniorDmFallback.some(senior => 
    t.includes(senior.toLowerCase())
  );
  
  if (!countryOk) {
    return { status: 'Out_of_Scope' as const, reason: 'country_not_in_geo_allow_list' };
  }
  
  if (titleKeywords.length > 0 && !(titleMatch || seniorMatch)) {
    return { status: 'Out_of_Scope' as const, reason: 'title_not_matching_keywords' };
  }
  
  return { status: 'Eligible' as const, reason: 'eligible' };
}

export function computeNameCompanyHash(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  companyKey: string | null | undefined
): string {
  const normalized = [
    normalize.toKey(firstName),
    normalize.toKey(lastName),
    normalize.companyKey(companyKey) // Use smart company normalization
  ].join('');
  
  return crypto.createHash('md5').update(normalized).digest('hex');
}

export function computeNormalizedKeys(contact: {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  contactCountry?: string | null;
  accountName?: string | null;
}) {
  return {
    emailLower: normalize.emailLower(contact.email),
    firstNameNorm: normalize.toKey(contact.firstName),
    lastNameNorm: normalize.toKey(contact.lastName),
    contactCountryKey: normalize.countryKey(contact.contactCountry),
    companyKey: normalize.companyKey(contact.accountName), // Use smart company normalization
  };
}

export async function checkSuppression(
  campaignId: string,
  contact: {
    email?: string | null;
    cavId?: string | null;
    cavUserId?: string | null;
    fullName?: string | null;
    account_name?: string | null;
  }
): Promise<boolean> {
  const { db } = await import('../db');
  const { verificationSuppressionList } = await import('@shared/schema');
  const { eq, or, and, sql } = await import('drizzle-orm');
  
  const checks = [];
  
  if (contact.email) {
    checks.push(eq(verificationSuppressionList.emailLower, contact.email.toLowerCase()));
  }
  
  if (contact.cavId) {
    checks.push(eq(verificationSuppressionList.cavId, contact.cavId));
  }
  
  if (contact.cavUserId) {
    checks.push(eq(verificationSuppressionList.cavUserId, contact.cavUserId));
  }
  
  if (contact.fullName && contact.account_name) {
    const hash = computeNameCompanyHash(
      contact.fullName.split(' ')[0],
      contact.fullName.split(' ').slice(1).join(' '),
      contact.account_name
    );
    checks.push(eq(verificationSuppressionList.nameCompanyHash, hash));
  }
  
  if (checks.length === 0) {
    return false;
  }
  
  const suppressed = await db
    .select()
    .from(verificationSuppressionList)
    .where(
      and(
        or(
          eq(verificationSuppressionList.campaignId, campaignId),
          sql`${verificationSuppressionList.campaignId} IS NULL`
        ),
        or(...checks)
      )
    )
    .limit(1);
  
  return suppressed.length > 0;
}
