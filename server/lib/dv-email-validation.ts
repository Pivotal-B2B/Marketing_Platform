import dns from 'dns/promises';

export interface EmailValidationResult {
  syntax: boolean;
  mx: boolean;
  smtp: 'valid' | 'invalid' | 'catch_all' | 'unknown';
  isDisposable: boolean;
  domain: string | null;
}

// Common disposable email domains (static list)
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
  'trashmail.com', 'yopmail.com', 'throwaway.email', 'getnada.com',
  'temp-mail.org', 'maildrop.cc', 'mintemail.com', 'sharklasers.com'
]);

/**
 * Validate email syntax using RFC5322 pattern
 */
function validateSyntax(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Check if domain is disposable
 */
function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

/**
 * Check MX records for domain
 */
async function checkMxRecords(domain: string, timeout: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const mxRecords = await dns.resolveMx(domain);
    clearTimeout(timeoutId);
    
    return mxRecords && mxRecords.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Validate email (Tier-1: syntax, MX, disposable check)
 * SMTP validation is stubbed for now
 */
export async function validateEmail(
  email: string,
  timeoutMs: number = 5500
): Promise<EmailValidationResult> {
  const parts = email.split('@');
  const domain = parts.length === 2 ? parts[1] : null;
  
  const syntaxValid = validateSyntax(email);
  
  if (!syntaxValid || !domain) {
    return {
      syntax: false,
      mx: false,
      smtp: 'invalid',
      isDisposable: false,
      domain,
    };
  }
  
  const isDisposable = isDisposableDomain(domain);
  const hasMx = await checkMxRecords(domain, timeoutMs);
  
  // SMTP validation stubbed - would integrate with external provider
  const smtpStatus: 'valid' | 'invalid' | 'catch_all' | 'unknown' = hasMx ? 'unknown' : 'invalid';
  
  return {
    syntax: syntaxValid,
    mx: hasMx,
    smtp: smtpStatus,
    isDisposable,
    domain,
  };
}

/**
 * Batch validate emails
 */
export async function batchValidateEmails(
  emails: string[],
  timeoutMs: number = 5500
): Promise<Map<string, EmailValidationResult>> {
  const results = new Map<string, EmailValidationResult>();
  
  await Promise.all(
    emails.map(async (email) => {
      const result = await validateEmail(email, timeoutMs);
      results.set(email, result);
    })
  );
  
  return results;
}
