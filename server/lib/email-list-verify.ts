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
 */
function mapElvStatusToInternal(elvStatus: string): EmailVerificationStatus {
  const statusLower = elvStatus.toLowerCase();
  
  // ELV returns: ok, invalid, unknown, email_disabled, disposable, catch_all, etc.
  if (statusLower === 'ok' || statusLower === 'valid') return 'ok';
  if (statusLower === 'invalid' || statusLower === 'email_disabled') return 'invalid';
  if (statusLower === 'disposable' || statusLower === 'temporary') return 'disposable';
  if (statusLower === 'catch_all' || statusLower === 'accept_all') return 'accept_all';
  if (statusLower === 'risky' || statusLower === 'role' || statusLower === 'complainer') return 'risky';
  
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
      timeout: 10000, // 10 second timeout
    });

    const data = response.data;
    
    // Parse ELV response format
    // Example response: {"status":"ok","email":"[email protected]","syntax_error":false,"domain":"example.com",...}
    const status = mapElvStatusToInternal(data.status || 'unknown');
    
    return {
      email: emailTrimmed,
      status,
      details: {
        syntax: !data.syntax_error,
        domain: data.domain_check !== false,
        smtp: data.smtp_check !== false,
        catch_all: data.catch_all === true,
        disposable: data.disposable === true || data.temporary === true,
        free: data.free === true,
        role: data.role === true,
      },
      reason: data.reason || data.error || undefined,
      provider: 'emaillistverify',
      rawResponse: data,
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
