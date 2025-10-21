/**
 * Email List Verify API Integration
 * Provides real-time email verification using EmailListVerify.com service
 */

import axios from 'axios';

const ELV_API_BASE = 'https://apps.emaillistverify.com/api';
const ELV_API_KEY = process.env.EMAIL_LIST_VERIFY_API_KEY;

export type EmailVerificationStatus = 
  | 'ok'           // Valid, deliverable email
  | 'invalid'      // Invalid email (syntax, domain, or mailbox)
  | 'unknown'      // Unable to verify
  | 'accept_all'   // Catch-all domain (accepts any email)
  | 'risky'        // Risky (role-based, complainers, etc.)
  | 'disposable';  // Temporary/disposable email service

export interface EmailVerificationResult {
  email: string;
  status: EmailVerificationStatus;
  details: {
    syntax: boolean;
    domain: boolean;
    smtp: boolean;
    catch_all: boolean;
    disposable: boolean;
    free: boolean;
    role: boolean;
  };
  reason?: string;
  provider: 'emaillistverify';
  rawResponse: any;
  checkedAt: Date;
}

/**
 * Map Email List Verify status to our internal status enum
 * ELV returns plain text status codes like: ok, invalid, invalid_mx, disposable, etc.
 */
function mapElvStatusToInternal(elvStatus: string): EmailVerificationStatus {
  const statusLower = elvStatus.toLowerCase().trim();
  
  // OK statuses
  if (statusLower === 'ok' || statusLower === 'valid') return 'ok';
  
  // Invalid statuses (syntax, domain, or mailbox issues)
  if (statusLower === 'invalid' || 
      statusLower === 'invalid_mx' || 
      statusLower === 'invalid_email' ||
      statusLower === 'email_disabled' ||
      statusLower === 'failed_syntax_check' ||
      statusLower === 'failed_smtp_check') return 'invalid';
  
  // Disposable/temporary email services
  if (statusLower === 'disposable' || 
      statusLower === 'temporary' ||
      statusLower === 'disposable_email') return 'disposable';
  
  // Catch-all / Accept-all domains
  if (statusLower === 'catch_all' || 
      statusLower === 'accept_all' ||
      statusLower === 'unknown_email') return 'accept_all';
  
  // Risky (role-based, complainers, etc.)
  if (statusLower === 'risky' || 
      statusLower === 'role' || 
      statusLower === 'complainer' ||
      statusLower === 'spamtrap') return 'risky';
  
  // Everything else
  return 'unknown';
}

/**
 * Verify a single email address using Email List Verify API
 */
export async function verifyEmail(email: string): Promise<EmailVerificationResult> {
  if (!ELV_API_KEY) {
    throw new Error('EMAIL_LIST_VERIFY_API_KEY is not configured');
  }

  const emailTrimmed = email.trim().toLowerCase();
  
  if (!emailTrimmed) {
    throw new Error('Email address is required');
  }

  try {
    const response = await axios.get(`${ELV_API_BASE}/verifyEmail`, {
      params: {
        secret: ELV_API_KEY,
        email: emailTrimmed,
      },
      timeout: 30000, // 30 second timeout - some email verifications take longer
    });

    const data = response.data;
    
    // Parse ELV response format
    // Email List Verify returns plain text status codes like: "ok", "invalid", "invalid_mx", "disposable", etc.
    const statusText = typeof data === 'string' ? data.trim() : (data.status || 'unknown');
    const status = mapElvStatusToInternal(statusText);
    
    return {
      email: emailTrimmed,
      status,
      details: {
        syntax: typeof data === 'object' ? !data.syntax_error : true,
        domain: typeof data === 'object' ? (data.domain_check !== false) : (status !== 'invalid'),
        smtp: typeof data === 'object' ? (data.smtp_check !== false) : (status === 'ok'),
        catch_all: typeof data === 'object' ? (data.catch_all === true) : (status === 'accept_all'),
        disposable: typeof data === 'object' ? (data.disposable === true || data.temporary === true) : (status === 'disposable'),
        free: typeof data === 'object' ? (data.free === true) : false,
        role: typeof data === 'object' ? (data.role === true) : false,
      },
      reason: typeof data === 'object' ? (data.reason || data.error) : statusText,
      provider: 'emaillistverify',
      rawResponse: typeof data === 'string' ? { status: data } : data,
      checkedAt: new Date(),
    };
  } catch (error: any) {
    console.error(`[ELV] Error verifying email ${emailTrimmed}:`, error.message);
    
    // If API error, return unknown status with error details
    return {
      email: emailTrimmed,
      status: 'unknown',
      details: {
        syntax: false,
        domain: false,
        smtp: false,
        catch_all: false,
        disposable: false,
        free: false,
        role: false,
      },
      reason: error.response?.data?.error || error.message || 'API Error',
      provider: 'emaillistverify',
      rawResponse: error.response?.data || null,
      checkedAt: new Date(),
    };
  }
}

/**
 * Verify multiple email addresses in bulk (with rate limiting)
 * Processes emails sequentially to respect API rate limits
 */
export async function verifyEmailsBulk(
  emails: string[],
  options: {
    delayMs?: number;  // Delay between requests (default: 200ms = 5 req/sec)
    onProgress?: (completed: number, total: number, currentEmail: string) => void;
  } = {}
): Promise<Map<string, EmailVerificationResult>> {
  const { delayMs = 200, onProgress } = options;
  const results = new Map<string, EmailVerificationResult>();
  
  const uniqueEmails = [...new Set(emails.map(e => e.trim().toLowerCase()))];
  
  for (let i = 0; i < uniqueEmails.length; i++) {
    const email = uniqueEmails[i];
    
    if (!email) continue;
    
    try {
      const result = await verifyEmail(email);
      results.set(email, result);
      
      if (onProgress) {
        onProgress(i + 1, uniqueEmails.length, email);
      }
      
      // Rate limiting: delay between requests (except for last one)
      if (i < uniqueEmails.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error: any) {
      console.error(`[ELV Bulk] Error verifying ${email}:`, error.message);
      
      // Store error result
      results.set(email, {
        email,
        status: 'unknown',
        details: {
          syntax: false,
          domain: false,
          smtp: false,
          catch_all: false,
          disposable: false,
          free: false,
          role: false,
        },
        reason: error.message,
        provider: 'emaillistverify',
        rawResponse: null,
        checkedAt: new Date(),
      });
    }
  }
  
  return results;
}

/**
 * Check if Email List Verify API is configured and accessible
 */
export async function checkApiHealth(): Promise<{ healthy: boolean; message: string }> {
  if (!ELV_API_KEY) {
    return { healthy: false, message: 'API key not configured' };
  }
  
  try {
    // Test with a known email format (won't charge credits if syntax is invalid)
    const result = await verifyEmail('[email protected]');
    return { healthy: true, message: 'API is accessible' };
  } catch (error: any) {
    return { healthy: false, message: error.message };
  }
}
