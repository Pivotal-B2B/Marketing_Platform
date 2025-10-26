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
   * Extract domain from email address
   */
  extractDomain: (email?: string | null): string => {
    if (!email) return "";
    const match = email.toLowerCase().trim().match(/@(.+)$/);
    return match ? match[1] : "";
  },
  
  /**
   * Normalize domain for company matching
   * Removes www, common TLDs, and applies company normalization
   */
  domainToCompanyKey: (domain?: string | null): string => {
    if (!domain) return "";
    
    let normalized = domain.toLowerCase().trim();
    
    // Remove www prefix
    normalized = normalized.replace(/^www\./, '');
    
    // Remove common TLDs (order matters - longer patterns first)
    normalized = normalized.replace(/\.(co\.\w{2}|com\.\w{2}|aero|travel)$/, '');
    normalized = normalized.replace(/\.(com|org|net|co|io|ai|app|dev|qa)$/, '');
    
    // Replace hyphens with spaces before applying company normalization
    // e.g., "singapore-airlines" becomes "singapore airlines"
    normalized = normalized.replace(/-/g, ' ');
    
    // Split compound words: insert space before known company words
    // e.g., "vietnamairlines" becomes "vietnam airlines"
    const compoundWords = [
      'airlines', 'airline', 'airways', 'air',
      'aviation', 'international', 'global',
      'technologies', 'technology', 'tech',
      'systems', 'solutions', 'services',
      'group', 'holdings', 'corporation', 'company'
    ];
    
    compoundWords.forEach(word => {
      // Insert space before the word if it's preceded by other letters
      const pattern = new RegExp(`([a-z])(${word})`, 'g');
      normalized = normalized.replace(pattern, '$1 $2');
    });
    
    // Apply company normalization rules (handles suffixes, abbreviations, etc.)
    return normalize.companyKey(normalized);
  },
  
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

/**
 * Two-Stage Eligibility Evaluation
 * Stage 1: Geo/Title criteria (synchronous, fast)
 * Stage 2: Email validation (async, runs only on potential eligibles)
 * 
 * IMPORTANT: All campaigns use two-stage validation with built-in API-free validation.
 * Contacts passing geo/title checks receive 'Pending_Email_Validation' status.
 */
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
  
  // Check geographic restrictions
  const countryOk = geoAllow.length === 0 || geoAllow.some(allowed => 
    c.includes(allowed.toLowerCase()) || allowed.toLowerCase().includes(c)
  );
  
  if (!countryOk) {
    return { status: 'Out_of_Scope' as const, reason: 'country_not_in_geo_allow_list' };
  }
  
  // Check title restrictions
  const titleMatch = titleKeywords.length === 0 || titleKeywords.some(keyword => 
    t.includes(keyword.toLowerCase())
  );
  
  const seniorMatch = seniorDmFallback.length > 0 && seniorDmFallback.some(senior => 
    t.includes(senior.toLowerCase())
  );
  
  if (titleKeywords.length > 0 && !(titleMatch || seniorMatch)) {
    return { status: 'Out_of_Scope' as const, reason: 'title_not_matching_keywords' };
  }
  
  // At this point, contact passed geo/title checks → "potential eligible"
  // All campaigns use built-in API-free email validation
  return { status: 'Pending_Email_Validation' as const, reason: 'awaiting_email_validation' };
}

/**
 * Finalize eligibility status after email validation completes
 * Updates contact from 'Pending_Email_Validation' to 'Eligible' or 'Ineligible_Email_Invalid'
 * 
 * 10-Status Email Validation System:
 * - safe_to_send: Best quality, verified deliverable → Eligible
 * - valid: High quality, DNS verified → Eligible
 * - send_with_caution: Lower confidence (free providers) → Eligible
 * - risky: Role accounts, may have issues → Eligible
 * - accept_all: Catch-all domain → Eligible
 * - unknown: Cannot verify → Eligible (cautious acceptance)
 * - invalid: Syntax/DNS errors → Ineligible
 * - disabled: Mailbox disabled/full → Ineligible
 * - disposable: Temporary email service → Ineligible
 * - spam_trap: Known spam trap → Ineligible
 */
export function finalizeEligibilityAfterEmailValidation(
  emailStatus: 'unknown' | 'valid' | 'safe_to_send' | 'risky' | 'send_with_caution' | 'accept_all' | 'invalid' | 'disabled' | 'disposable' | 'spam_trap' | 'ok',
  currentEligibilityStatus: string
): { eligibilityStatus: 'Eligible' | 'Ineligible_Email_Invalid'; reason: string } {
  // Only finalize if currently pending
  if (currentEligibilityStatus !== 'Pending_Email_Validation') {
    return { 
      eligibilityStatus: currentEligibilityStatus as any, 
      reason: 'not_pending_validation' 
    };
  }
  
  // Determine final eligibility based on comprehensive email validation result
  switch (emailStatus) {
    case 'safe_to_send':
    case 'valid':
    case 'ok': // LEGACY: EmailListVerify 'ok' status (treat as high quality)
      return { eligibilityStatus: 'Eligible', reason: 'email_verified_deliverable' };
    
    case 'send_with_caution':
    case 'risky':
    case 'accept_all':
      return { eligibilityStatus: 'Eligible', reason: 'email_deliverable_with_risks' };
    
    case 'invalid':
    case 'disabled':
      return { eligibilityStatus: 'Ineligible_Email_Invalid', reason: `email_${emailStatus}` };
    
    case 'disposable':
    case 'spam_trap':
      return { eligibilityStatus: 'Ineligible_Email_Invalid', reason: `email_${emailStatus}` };
    
    case 'unknown':
    default:
      // Log unexpected statuses for debugging
      if (emailStatus && !['unknown', 'valid', 'safe_to_send', 'risky', 'send_with_caution', 'accept_all', 'invalid', 'disabled', 'disposable', 'spam_trap', 'ok'].includes(emailStatus)) {
        console.warn(`[EmailValidation] Unexpected email status encountered: ${emailStatus}`);
      }
      // If we can't determine validity, accept with caution (prevents blocking entire workflow)
      return { eligibilityStatus: 'Eligible', reason: 'email_status_unknown' };
  }
}

/**
 * Compute SHA256 hash for full name + company combination
 * Uses "|" separator to prevent collisions
 * Returns hex string for compatibility with PostgreSQL ENCODE(DIGEST(...), 'hex')
 * 
 * CRITICAL: Must use SAME normalization and hash algorithm as verification-suppression.ts
 * MUST match the SQL: ENCODE(DIGEST(LOWER(TRIM(...)) || '|' || LOWER(TRIM(...)), 'sha256'), 'hex')
 */
export function computeNameCompanyHash(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  companyKey: string | null | undefined
): string | null {
  // CRITICAL: All three fields must be non-empty
  if (!firstName || !lastName || !companyKey) {
    return null;
  }
  
  // Use SAME normalization as contact storage
  const firstNorm = normalize.toKey(firstName);
  const lastNorm = normalize.toKey(lastName);
  const companyNorm = normalize.companyKey(companyKey);
  
  // Construct full name from normalized first/last
  const fullName = `${firstNorm} ${lastNorm}`.trim().replace(/\s+/g, ' ').toLowerCase();
  
  // Use separator to prevent collision: "John Smith|Acme" vs "John|SmithAcme"
  const hashInput = `${fullName}|${companyNorm.toLowerCase()}`;
  
  // SHA256 hex digest (matches PostgreSQL and verification-suppression.ts)
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

export function computeNormalizedKeys(contact: {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  contactCountry?: string | null;
  accountName?: string | null;
}) {
  const firstNameNorm = normalize.toKey(contact.firstName);
  const lastNameNorm = normalize.toKey(contact.lastName);
  const companyKey = normalize.companyKey(contact.accountName);
  
  // Compute hash for name+company matching (returns null if any field is missing)
  const nameCompanyHash = computeNameCompanyHash(
    contact.firstName,
    contact.lastName,
    contact.accountName
  );
  
  return {
    emailLower: normalize.emailLower(contact.email),
    firstNameNorm,
    lastNameNorm,
    contactCountryKey: normalize.countryKey(contact.contactCountry),
    companyKey,
    nameCompanyHash, // Include the hash for suppression matching
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
  
  // Name+Company Hash matching removed per user request
  // Only check: Email, CAV ID, CAV User ID
  
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

/**
 * Check if a contact was submitted in the last 2 years (730 days)
 * Submitted contacts should be excluded from eligibility for 2 years
 * 
 * @param contactId - The contact ID to check
 * @returns true if submitted within last 2 years, false otherwise
 */
export async function wasSubmittedRecently(
  contactId: string
): Promise<{ submitted: boolean; submittedAt?: Date }> {
  const { db } = await import('../db');
  const { verificationLeadSubmissions } = await import('@shared/schema');
  const { eq, gte, and } = await import('drizzle-orm');
  
  // Calculate date 2 years ago (730 days)
  const twoYearsAgo = new Date();
  twoYearsAgo.setDate(twoYearsAgo.getDate() - 730);
  
  const [submission] = await db
    .select()
    .from(verificationLeadSubmissions)
    .where(
      and(
        eq(verificationLeadSubmissions.contactId, contactId),
        gte(verificationLeadSubmissions.createdAt, twoYearsAgo)
      )
    )
    .limit(1);
  
  if (submission) {
    return { submitted: true, submittedAt: submission.createdAt };
  }
  
  return { submitted: false };
}

/**
 * Extract seniority level from job title
 * Maps C-suite → executive, VP → vp, Director → director, Manager → manager, IC → ic
 */
export function extractSeniorityLevel(title?: string | null): 'executive' | 'vp' | 'director' | 'manager' | 'ic' | 'unknown' {
  if (!title) return 'unknown';
  
  const normalized = title.toLowerCase().trim();
  
  // C-suite and executive patterns
  const executivePatterns = [
    /\b(ceo|chief executive|president|chairman|chairwoman|chairperson)\b/i,
    /\bc[a-z]o\b/i, // CTO, CFO, COO, CMO, CIO, etc.
    /\bfounder\b/i,
    /\bowner\b/i,
    /\bmanaging director\b/i,
    /\bgeneral manager\b/i, // Often C-level in many orgs
  ];
  
  // VP patterns
  const vpPatterns = [
    /\b(vp|vice president|v\.p\.)\b/i,
    /\bevp\b/i, // Executive VP
    /\bavp\b/i, // Assistant VP
    /\bsvp\b/i, // Senior VP
  ];
  
  // Director patterns
  const directorPatterns = [
    /\bdirector\b/i,
    /\bhead of\b/i,
  ];
  
  // Manager patterns
  const managerPatterns = [
    /\bmanager\b/i,
    /\bsupervisor\b/i,
    /\blead\b/i,
    /\bteam lead\b/i,
  ];
  
  // Check in order of seniority (highest to lowest)
  for (const pattern of executivePatterns) {
    if (pattern.test(normalized)) return 'executive';
  }
  
  for (const pattern of vpPatterns) {
    if (pattern.test(normalized)) return 'vp';
  }
  
  for (const pattern of directorPatterns) {
    if (pattern.test(normalized)) return 'director';
  }
  
  for (const pattern of managerPatterns) {
    if (pattern.test(normalized)) return 'manager';
  }
  
  // Default to IC (Individual Contributor)
  return 'ic';
}

/**
 * Convert seniority level to numeric score
 * executive: 5, vp: 4, director: 3, manager: 2, ic: 1, unknown: 0
 */
export function getSeniorityScore(level: string): number {
  const scoreMap: Record<string, number> = {
    executive: 5,
    vp: 4,
    director: 3,
    manager: 2,
    ic: 1,
    unknown: 0,
  };
  return scoreMap[level] || 0;
}

/**
 * Calculate title alignment score based on campaign target job titles
 * Returns a score between 0 and 1
 * - 1.0: Exact match
 * - 0.75: Contains keyword
 * - 0.5: Fuzzy match
 * - 0.0: No match
 */
export function calculateTitleAlignment(
  title?: string | null,
  targetTitles?: string[]
): number {
  if (!title || !targetTitles || targetTitles.length === 0) {
    return 0.5; // Neutral score if no targets specified
  }
  
  const normalized = title.toLowerCase().trim();
  let bestScore = 0;
  
  for (const target of targetTitles) {
    const targetNorm = target.toLowerCase().trim();
    
    // Exact match
    if (normalized === targetNorm) {
      bestScore = Math.max(bestScore, 1.0);
      continue;
    }
    
    // Contains keyword
    if (normalized.includes(targetNorm) || targetNorm.includes(normalized)) {
      bestScore = Math.max(bestScore, 0.75);
      continue;
    }
    
    // Fuzzy match: check if individual words match
    const titleWords = normalized.split(/\s+/);
    const targetWords = targetNorm.split(/\s+/);
    const matchedWords = titleWords.filter(word => 
      targetWords.some(tw => word.includes(tw) || tw.includes(word))
    );
    
    if (matchedWords.length > 0) {
      const fuzzyScore = 0.5 * (matchedWords.length / Math.max(titleWords.length, targetWords.length));
      bestScore = Math.max(bestScore, fuzzyScore);
    }
  }
  
  return bestScore;
}

/**
 * Calculate overall priority score combining seniority and title alignment
 * Formula: seniorityWeight * seniorityScore + titleWeight * titleAlignment
 * Default weights: 0.7 seniority, 0.3 title alignment
 */
export function calculatePriorityScore(
  seniorityLevel: string,
  titleAlignmentScore: number,
  seniorityWeight: number = 0.7,
  titleAlignmentWeight: number = 0.3
): number {
  const seniorityScore = getSeniorityScore(seniorityLevel);
  
  // Normalize seniority score to 0-1 range (divide by max score of 5)
  const normalizedSeniority = seniorityScore / 5;
  
  return (seniorityWeight * normalizedSeniority) + (titleAlignmentWeight * titleAlignmentScore);
}

/**
 * Get or create account cap status for a campaign-account pair
 */
export async function getOrCreateAccountCapStatus(
  campaignId: string,
  accountId: string,
  cap: number
) {
  const { db } = await import('../db');
  const { verificationAccountCapStatus } = await import('@shared/schema');
  const { eq, and } = await import('drizzle-orm');
  
  const [existing] = await db
    .select()
    .from(verificationAccountCapStatus)
    .where(
      and(
        eq(verificationAccountCapStatus.campaignId, campaignId),
        eq(verificationAccountCapStatus.accountId, accountId)
      )
    )
    .limit(1);
  
  if (existing) {
    return existing;
  }
  
  // Create new status record
  const [newStatus] = await db
    .insert(verificationAccountCapStatus)
    .values({
      campaignId,
      accountId,
      cap,
      submittedCount: 0,
      reservedCount: 0,
      eligibleCount: 0,
    })
    .returning();
  
  return newStatus;
}

/**
 * Update account cap status counts
 */
export async function updateAccountCapStatus(
  campaignId: string,
  accountId: string,
  updates: {
    submittedCount?: number;
    reservedCount?: number;
    eligibleCount?: number;
  }
) {
  const { db } = await import('../db');
  const { verificationAccountCapStatus } = await import('@shared/schema');
  const { eq, and, sql } = await import('drizzle-orm');
  
  await db
    .update(verificationAccountCapStatus)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(verificationAccountCapStatus.campaignId, campaignId),
        eq(verificationAccountCapStatus.accountId, accountId)
      )
    );
}

/**
 * Recalculate account cap status counts from actual contact data
 */
export async function recalculateAccountCapStatus(
  campaignId: string,
  accountId: string
) {
  const { db } = await import('../db');
  const { verificationContacts, verificationLeadSubmissions, verificationAccountCapStatus } = await import('@shared/schema');
  const { eq, and, count, sql } = await import('drizzle-orm');
  
  // Count submitted contacts
  const [submittedResult] = await db
    .select({ count: count() })
    .from(verificationLeadSubmissions)
    .where(
      and(
        eq(verificationLeadSubmissions.campaignId, campaignId),
        eq(verificationLeadSubmissions.accountId, accountId)
      )
    );
  
  // Count reserved contacts
  const [reservedResult] = await db
    .select({ count: count() })
    .from(verificationContacts)
    .where(
      and(
        eq(verificationContacts.campaignId, campaignId),
        eq(verificationContacts.accountId, accountId),
        eq(verificationContacts.reservedSlot, true)
      )
    );
  
  // Count eligible contacts
  const [eligibleResult] = await db
    .select({ count: count() })
    .from(verificationContacts)
    .where(
      and(
        eq(verificationContacts.campaignId, campaignId),
        eq(verificationContacts.accountId, accountId),
        eq(verificationContacts.eligibilityStatus, 'Eligible')
      )
    );
  
  // Update the cap status
  await db
    .update(verificationAccountCapStatus)
    .set({
      submittedCount: submittedResult.count,
      reservedCount: reservedResult.count,
      eligibleCount: eligibleResult.count,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(verificationAccountCapStatus.campaignId, campaignId),
        eq(verificationAccountCapStatus.accountId, accountId)
      )
    );
}

/**
 * Comprehensive eligibility evaluation with cap enforcement and priority scoring
 * This function:
 * 1. Evaluates basic eligibility (geo, title, email)
 * 2. Checks if account has reached cap
 * 3. Calculates priority scores (seniority + title alignment)
 * 4. Returns comprehensive result for contact update
 * 
 * Now supports two-stage validation with 'Pending_Email_Validation' status
 */
export async function evaluateEligibilityWithCap(
  contact: {
    title?: string | null;
    contactCountry?: string | null;
    email?: string | null;
    accountId?: string | null;
  },
  campaign: VerificationCampaign
): Promise<{
  eligibilityStatus: 'Eligible' | 'Out_of_Scope' | 'Ineligible_Cap_Reached' | 'Pending_Email_Validation';
  eligibilityReason: string;
  seniorityLevel: 'executive' | 'vp' | 'director' | 'manager' | 'ic' | 'unknown';
  titleAlignmentScore: number;
  priorityScore: number;
}> {
  // First, evaluate basic eligibility (geo, title, email)
  const basicEligibility = evaluateEligibility(
    contact.title,
    contact.contactCountry,
    campaign,
    contact.email
  );
  
  // Calculate priority scores regardless of eligibility status (needed for sorting)
  const seniorityLevel = extractSeniorityLevel(contact.title);
  const titleAlignmentScore = calculateTitleAlignment(
    contact.title,
    campaign.priorityConfig?.targetJobTitles
  );
  const priorityScore = calculatePriorityScore(
    seniorityLevel,
    titleAlignmentScore,
    campaign.priorityConfig?.seniorityWeight,
    campaign.priorityConfig?.titleAlignmentWeight
  );
  
  // If not basically eligible (including Pending_Email_Validation), return early
  if (basicEligibility.status !== 'Eligible' && basicEligibility.status !== 'Pending_Email_Validation') {
    return {
      eligibilityStatus: basicEligibility.status,
      eligibilityReason: basicEligibility.reason,
      seniorityLevel,
      titleAlignmentScore,
      priorityScore,
    };
  }
  
  // If pending email validation, return that status (cap check happens after validation)
  if (basicEligibility.status === 'Pending_Email_Validation') {
    return {
      eligibilityStatus: 'Pending_Email_Validation',
      eligibilityReason: basicEligibility.reason,
      seniorityLevel,
      titleAlignmentScore,
      priorityScore,
    };
  }
  
  // At this point, basicEligibility.status === 'Eligible'
  // Now check account cap enforcement
  
  // If no account ID, can't check cap - mark eligible
  if (!contact.accountId) {
    return {
      eligibilityStatus: 'Eligible',
      eligibilityReason: 'eligible_no_account_id',
      seniorityLevel,
      titleAlignmentScore,
      priorityScore,
    };
  }
  
  // Check account cap status
  const cap = campaign.leadCapPerAccount || 10;
  const capStatus = await getOrCreateAccountCapStatus(
    campaign.id,
    contact.accountId,
    cap
  );
  
  // Check if cap reached
  const totalCommitted = capStatus.submittedCount + capStatus.reservedCount;
  if (totalCommitted >= cap) {
    return {
      eligibilityStatus: 'Ineligible_Cap_Reached',
      eligibilityReason: `account_cap_reached_${cap}`,
      seniorityLevel,
      titleAlignmentScore,
      priorityScore,
    };
  }
  
  // Contact is eligible
  return {
    eligibilityStatus: 'Eligible',
    eligibilityReason: 'eligible',
    seniorityLevel,
    titleAlignmentScore,
    priorityScore,
  };
}
