// Normalization utilities for data quality and deduplication

/**
 * Normalizes an email address for deduplication
 * - Lowercase
 * - Trim whitespace
 * - Remove dots in Gmail-style addresses (optional, enabled by default)
 * - Strip tags/aliases (+suffix) (optional, enabled by default)
 */
export function normalizeEmail(email: string, options = { 
  removeDots: true, 
  stripTags: true 
}): string {
  if (!email) return '';
  
  let normalized = email.toLowerCase().trim();
  
  const [localPart, domain] = normalized.split('@');
  if (!domain) return normalized;
  
  let processedLocal = localPart;
  
  // Remove tags/aliases (everything after +)
  if (options.stripTags) {
    processedLocal = processedLocal.split('+')[0];
  }
  
  // Remove dots for Gmail and similar providers
  if (options.removeDots && isGmailStyleProvider(domain)) {
    processedLocal = processedLocal.replace(/\./g, '');
  }
  
  return `${processedLocal}@${domain}`;
}

/**
 * Checks if a domain uses Gmail-style dot-insensitivity
 */
function isGmailStyleProvider(domain: string): boolean {
  const gmailProviders = [
    'gmail.com',
    'googlemail.com'
  ];
  return gmailProviders.includes(domain.toLowerCase());
}

/**
 * Normalizes a domain for deduplication
 * - Lowercase
 * - Trim whitespace  
 * - Remove www. prefix
 * - Remove trailing slash
 * - Extract hostname from URL if needed
 */
export function normalizeDomain(domain: string): string {
  if (!domain) return '';
  
  let normalized = domain.toLowerCase().trim();
  
  // Extract hostname from URL if a full URL was provided
  if (normalized.includes('://')) {
    try {
      const url = new URL(normalized);
      normalized = url.hostname;
    } catch {
      // Not a valid URL, continue with raw string
    }
  }
  
  // Remove www. prefix
  if (normalized.startsWith('www.')) {
    normalized = normalized.slice(4);
  }
  
  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  
  return normalized;
}

/**
 * Normalizes a company/account name for matching
 * - Lowercase
 * - Trim whitespace
 * - Remove common legal suffixes (Inc., LLC, Ltd., etc.)
 * - Remove special characters
 * - Normalize whitespace (multiple spaces to single)
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  
  let normalized = name.toLowerCase().trim();
  
  // Remove common legal entity suffixes
  const suffixes = [
    /\b(inc|incorporated)\b\.?$/i,
    /\b(llc|l\.l\.c\.)\b\.?$/i,
    /\b(ltd|limited)\b\.?$/i,
    /\b(corp|corporation)\b\.?$/i,
    /\b(co|company)\b\.?$/i,
    /\b(gmbh)\b\.?$/i,
    /\b(pvt|private)\b\.?$/i,
    /\b(plc|public limited company)\b\.?$/i,
    /\b(ag|aktiengesellschaft)\b\.?$/i,
    /\b(sa|société anonyme)\b\.?$/i,
  ];
  
  for (const suffix of suffixes) {
    normalized = normalized.replace(suffix, '').trim();
  }
  
  // Remove special characters but keep spaces
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Validates and normalizes a phone number to E.164 format
 * Returns null if invalid
 */
export function normalizePhoneE164(phone: string, defaultCountryCode = '1'): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // If no country code, prepend default
  if (!digits.startsWith('+') && digits.length === 10) {
    digits = defaultCountryCode + digits;
  }
  
  // Basic validation (E.164: + followed by 1-15 digits)
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  
  return '+' + digits;
}

/**
 * Checks if an email domain is a free/personal email provider
 */
export function isFreeEmailDomain(domain: string): boolean {
  const freeProviders = [
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'yahoo.co.uk',
    'yahoo.ca',
    'hotmail.com',
    'outlook.com',
    'live.com',
    'msn.com',
    'aol.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'protonmail.com',
    'proton.me',
    'mail.com',
    'zoho.com',
    'yandex.com',
    'gmx.com',
    'gmx.net',
  ];
  
  return freeProviders.includes(domain.toLowerCase());
}

/**
 * Generates an idempotency key for upsert operations
 * Combines business key + payload hash for replay safety
 */
export function generateIdempotencyKey(
  entityType: string,
  businessKey: string,
  payload: any
): string {
  const payloadString = JSON.stringify(payload);
  // Simple hash (in production, use crypto.createHash)
  const hash = Buffer.from(payloadString).toString('base64').slice(0, 16);
  return `${entityType}:${businessKey}:${hash}`;
}
