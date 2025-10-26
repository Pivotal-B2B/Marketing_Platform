/**
 * API-Free Email Validation Engine
 * Multi-stage validation: Syntax → DNS/MX → Risk → SMTP
 * 
 * Key design: Validates only "potential eligibles" (contacts that pass geo/title checks)
 */

import { db } from "../db";
import { emailValidationDomainCache, verificationEmailValidations } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as dns from "dns";
import * as net from "net";
import * as tls from "tls";
import punycode from "punycode";

const EMAIL_MAX_LENGTH = 254;
const LOCAL_MAX_LENGTH = 64;
const DNS_TIMEOUT_MS = Number(process.env.DNS_TIMEOUT_MS || 3000);
const SMTP_CONNECT_TIMEOUT_MS = Number(process.env.SMTP_CONNECT_TIMEOUT_MS || 10000);
const DOMAIN_CACHE_TTL_HOURS = Number(process.env.DOMAIN_CACHE_TTL_HOURS || 24);
const VALIDATOR_HELO = process.env.VALIDATOR_HELO || 'validator.pivotal-b2b.ai';
const VALIDATOR_MAIL_FROM = process.env.VALIDATOR_MAIL_FROM || 'null-sender@pivotal-b2b.ai';

// Risk lists - can be moved to database for dynamic updates
const ROLE_PREFIXES = ['admin', 'info', 'sales', 'support', 'hr', 'careers', 'hello', 'contact', 'marketing', 'noreply', 'no-reply', 'webmaster', 'postmaster', 'abuse', 'billing'];
const FREE_PROVIDERS = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'hotmail.com', 'live.com', 'aol.com', 'msn.com', 'mail.com', 'protonmail.com', 'me.com', 'zoho.com'];
const DISPOSABLE_DOMAINS = ['mailinator.com', 'guerrillamail.com', 'temp-mail.org', '10minutemail.com', 'throwaway.email', 'yopmail.com', 'maildrop.cc', 'tempmail.com', 'getnada.com', 'trashmail.com'];

// Known spam trap patterns and domains
const SPAM_TRAP_DOMAINS = [
  'spamtrap.com', 'honeypot.net', 'blackhole.email', 'spam.la',
  'mailcatch.com', 'abuse.net', 'fbi.gov', 'ftc.gov'
];

const SPAM_TRAP_PATTERNS = [
  /^spamtrap@/i,
  /^honeypot@/i,
  /^trap@/i,
  /^abuse@/i,
  /^postmaster@/i,
  /^blackhole@/i
];

export interface ParsedEmail {
  ok: boolean;
  local?: string;
  domain?: string;
  normalized?: string;
  reason?: string;
}

export interface DnsResult {
  hasMX: boolean;
  hasA: boolean;
  mxHosts?: string[];
  aRecords?: string[];
  error?: string;
}

export interface RiskCheck {
  isRole: boolean;
  isFree: boolean;
  isDisposable: boolean;
  isSpamTrap: boolean;
  reasons: string[];
}

export interface SmtpProbeResult {
  code?: number;
  banner?: string;
  rcptOk?: boolean;
  isAcceptAll?: boolean;
  raw: string[];
  error?: string;
}

export type EmailValidationStatus = 
  | 'unknown'
  | 'valid'
  | 'safe_to_send'
  | 'risky'
  | 'send_with_caution'
  | 'accept_all'
  | 'invalid'
  | 'disabled'
  | 'disposable'
  | 'spam_trap';

export interface ValidationResult {
  status: EmailValidationStatus;
  confidence: number;
  syntaxValid: boolean;
  hasMx: boolean;
  hasSmtp: boolean;
  smtpAccepted?: boolean;
  isAcceptAll?: boolean;
  isDisabled?: boolean;
  isRole: boolean;
  isFree: boolean;
  isDisposable: boolean;
  isSpamTrap: boolean;
  trace: {
    syntax?: { ok: boolean; reason?: string };
    dns?: DnsResult;
    smtp?: SmtpProbeResult;
    risk?: RiskCheck;
  };
}

/**
 * Stage 1: Syntax Validation
 * Fast, synchronous check for email format validity
 */
export function parseEmail(raw: string): ParsedEmail {
  const trimmed = raw.trim();
  const at = trimmed.indexOf('@');
  
  if (at <= 0) {
    return { ok: false, reason: 'no_at_symbol' };
  }
  
  const local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1).toLowerCase();
  
  if (!local || !domain) {
    return { ok: false, reason: 'empty_parts' };
  }
  
  if (trimmed.length > EMAIL_MAX_LENGTH || local.length > LOCAL_MAX_LENGTH) {
    return { ok: false, reason: 'length_exceeded' };
  }
  
  // Check for invalid characters in local part
  if (/\s|\.\.|@|,$/.test(local)) {
    return { ok: false, reason: 'invalid_local_chars' };
  }
  
  // IDN (internationalized domain name) support
  try {
    domain = punycode.toASCII(domain);
  } catch (e) {
    return { ok: false, reason: 'invalid_idn' };
  }
  
  // Validate domain syntax
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain)) {
    return { ok: false, reason: 'invalid_domain_syntax' };
  }
  
  return {
    ok: true,
    local,
    domain,
    normalized: `${local}@${domain}`
  };
}

/**
 * Stage 2: DNS/MX Resolution with caching
 * Checks if domain has MX records or A records
 */
export async function resolveDomain(domain: string): Promise<DnsResult> {
  try {
    // Check cache first
    const cached = await db
      .select()
      .from(emailValidationDomainCache)
      .where(eq(emailValidationDomainCache.domain, domain))
      .limit(1);
    
    const now = new Date();
    if (cached.length > 0) {
      const ageHours = (now.getTime() - new Date(cached[0].lastChecked!).getTime()) / 36e5;
      if (ageHours < DOMAIN_CACHE_TTL_HOURS) {
        return {
          hasMX: cached[0].hasMx,
          hasA: cached[0].hasA,
          mxHosts: (cached[0].mxHosts as string[]) || [],
        };
      }
    }
    
    // Perform DNS lookup
    const result: DnsResult = { hasMX: false, hasA: false };
    
    // Try MX records first
    try {
      const mxRecords = await new Promise<dns.MxRecord[]>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('DNS timeout')), DNS_TIMEOUT_MS);
        dns.resolveMx(domain, (err, addresses) => {
          clearTimeout(timeout);
          if (err) reject(err);
          else resolve(addresses || []);
        });
      });
      
      mxRecords.sort((a, b) => a.priority - b.priority);
      result.mxHosts = mxRecords.map(mx => mx.exchange);
      result.hasMX = result.mxHosts.length > 0;
    } catch (e) {
      result.error = `MX lookup failed: ${String(e)}`;
    }
    
    // Fallback to A records if no MX
    if (!result.hasMX) {
      try {
        const aRecords = await new Promise<string[]>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('DNS timeout')), DNS_TIMEOUT_MS);
          dns.resolve4(domain, (err, addresses) => {
            clearTimeout(timeout);
            if (err) reject(err);
            else resolve(addresses || []);
          });
        });
        
        result.aRecords = aRecords;
        result.hasA = aRecords.length > 0;
      } catch (e) {
        if (!result.error) {
          result.error = `A record lookup failed: ${String(e)}`;
        }
      }
    }
    
    // Update cache
    const cacheData = {
      domain,
      hasMx: result.hasMX,
      hasA: result.hasA,
      mxHosts: result.mxHosts as any,
      lastChecked: now,
      checkCount: 1,
    };
    
    if (cached.length > 0) {
      await db
        .update(emailValidationDomainCache)
        .set({ ...cacheData, checkCount: cached[0].checkCount + 1 })
        .where(eq(emailValidationDomainCache.domain, domain));
    } else {
      await db
        .insert(emailValidationDomainCache)
        .values(cacheData)
        .onConflictDoUpdate({
          target: emailValidationDomainCache.domain,
          set: cacheData
        });
    }
    
    return result;
  } catch (error) {
    console.error('[EmailValidation] DNS resolution error:', error);
    return {
      hasMX: false,
      hasA: false,
      error: String(error)
    };
  }
}

/**
 * Stage 3: Risk Checks
 * Identifies role accounts, free providers, disposable domains, and spam traps
 */
export function checkRisks(local: string, domain: string): RiskCheck {
  const localLower = local.toLowerCase();
  const domainLower = domain.toLowerCase();
  const fullEmail = `${localLower}@${domainLower}`;
  
  const isRole = ROLE_PREFIXES.some(prefix => localLower.startsWith(prefix));
  const isFree = FREE_PROVIDERS.includes(domainLower);
  const isDisposable = DISPOSABLE_DOMAINS.includes(domainLower);
  const isSpamTrap = SPAM_TRAP_DOMAINS.includes(domainLower) || 
                     SPAM_TRAP_PATTERNS.some(pattern => pattern.test(fullEmail));
  
  const reasons: string[] = [];
  if (isRole) reasons.push('role_account');
  if (isFree) reasons.push('free_provider');
  if (isDisposable) reasons.push('disposable_domain');
  if (isSpamTrap) reasons.push('spam_trap');
  
  return { isRole, isFree, isDisposable, isSpamTrap, reasons };
}

/**
 * Stage 4: SMTP Probe
 * Lightweight RCPT TO check (no DATA sent)
 * WARNING: Can be blocked or rate-limited by mail servers
 */
export async function probeSmtp(
  host: string, 
  rcptEmail: string, 
  port: number = 25, 
  secure: boolean = false
): Promise<SmtpProbeResult> {
  const raw: string[] = [];
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      sock.destroy();
      resolve({ raw, error: 'SMTP connection timeout' });
    }, SMTP_CONNECT_TIMEOUT_MS);
    
    const sock = secure
      ? tls.connect({ host, port, servername: host, timeout: SMTP_CONNECT_TIMEOUT_MS })
      : net.connect({ host, port, timeout: SMTP_CONNECT_TIMEOUT_MS });
    
    let rcptOk = false;
    let code: number | undefined;
    let banner: string | undefined;
    
    const send = (line: string) => {
      return new Promise<void>((res, rej) => {
        raw.push('> ' + line);
        sock.write(line + '\r\n', (err) => (err ? rej(err) : res()));
      });
    };
    
    const recv = (): Promise<string> => {
      return new Promise((res) => {
        sock.once('data', (buf) => {
          const response = buf.toString('utf8');
          raw.push('< ' + response);
          res(response);
        });
      });
    };
    
    sock.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ raw, error: String(err) });
    });
    
    sock.once('data', async (d) => {
      try {
        banner = d.toString('utf8');
        raw.push('< ' + banner);
        
        await send(`EHLO ${VALIDATOR_HELO}`);
        await recv();
        
        await send(`MAIL FROM:<${VALIDATOR_MAIL_FROM}>`);
        await recv();
        
        await send(`RCPT TO:<${rcptEmail}>`);
        const rcptResponse = await recv();
        
        code = Number(rcptResponse.slice(0, 3));
        rcptOk = code >= 250 && code < 260;
        
        await send('QUIT');
        sock.end();
        
        clearTimeout(timeout);
        resolve({ code, banner, rcptOk, raw });
      } catch (err) {
        clearTimeout(timeout);
        sock.destroy();
        resolve({ raw, error: String(err) });
      }
    });
  });
}

/**
 * Stage 4.5: Accept-All Detection
 * Tests if a domain accepts all emails (catch-all server)
 * Probes with both real and fake email to detect accept-all behavior
 */
export async function detectAcceptAll(
  host: string,
  realEmail: string,
  domain: string
): Promise<boolean> {
  try {
    // Test real email
    const realTest = await probeSmtp(host, realEmail);
    
    // If real email is NOT accepted, domain is not accept-all
    if (!realTest.rcptOk) {
      return false;
    }
    
    // Generate obviously fake email for same domain
    const fakeLocal = 'nonexistent-test-' + Math.random().toString(36).substr(2, 12);
    const fakeEmail = `${fakeLocal}@${domain}`;
    
    // Test fake email
    const fakeTest = await probeSmtp(host, fakeEmail);
    
    // If BOTH real and fake are accepted → accept-all domain
    return realTest.rcptOk && fakeTest.rcptOk;
    
  } catch (error) {
    console.error('[EmailValidation] Accept-all detection error:', error);
    return false; // Assume not accept-all if test fails
  }
}

/**
 * Complete validation pipeline with comprehensive status mapping
 * Runs all stages and returns detailed result with send recommendations
 */
export async function validateEmail(
  email: string,
  options: {
    skipSmtp?: boolean;
    useCache?: boolean;
    detectAcceptAll?: boolean;
  } = {}
): Promise<ValidationResult> {
  const { skipSmtp = false, useCache = true, detectAcceptAll = false } = options;
  
  const result: ValidationResult = {
    status: 'unknown',
    confidence: 0,
    syntaxValid: false,
    hasMx: false,
    hasSmtp: false,
    isRole: false,
    isFree: false,
    isDisposable: false,
    isSpamTrap: false,
    trace: {}
  };
  
  // Stage 1: Syntax
  const parsed = parseEmail(email);
  result.trace.syntax = { ok: parsed.ok, reason: parsed.reason };
  
  if (!parsed.ok || !parsed.local || !parsed.domain) {
    result.status = 'invalid';
    result.confidence = 100;
    return result;
  }
  
  result.syntaxValid = true;
  
  // Stage 2: DNS/MX
  const dns = await resolveDomain(parsed.domain);
  result.trace.dns = dns;
  result.hasMx = dns.hasMX;
  
  if (!dns.hasMX && !dns.hasA) {
    result.status = 'invalid';
    result.confidence = 95;
    return result;
  }
  
  // Stage 3: Risk checks (spam traps, disposable, role, free)
  const risk = checkRisks(parsed.local, parsed.domain);
  result.trace.risk = risk;
  result.isRole = risk.isRole;
  result.isFree = risk.isFree;
  result.isDisposable = risk.isDisposable;
  result.isSpamTrap = risk.isSpamTrap;
  
  // High-priority blocks
  if (result.isSpamTrap) {
    result.status = 'spam_trap';
    result.confidence = 100;
    return result;
  }
  
  if (result.isDisposable) {
    result.status = 'disposable';
    result.confidence = 100;
    return result;
  }
  
  // Stage 4: SMTP (optional, can be skipped for performance)
  if (!skipSmtp && dns.hasMX && dns.mxHosts && dns.mxHosts.length > 0) {
    try {
      const smtp = await probeSmtp(dns.mxHosts[0], email);
      result.trace.smtp = smtp;
      result.hasSmtp = !!smtp.rcptOk;
      result.smtpAccepted = smtp.rcptOk;
      
      // Detect disabled/full mailboxes via SMTP codes
      if (smtp.code && (smtp.code === 550 || smtp.code === 551 || smtp.code === 552 || smtp.code === 553)) {
        result.status = 'disabled';
        result.isDisabled = true;
        result.confidence = 90;
        return result;
      }
      
      // Detect accept-all if requested
      if (detectAcceptAll && smtp.rcptOk) {
        const isAcceptAll = await detectAcceptAll(dns.mxHosts[0], email, parsed.domain);
        result.isAcceptAll = isAcceptAll;
        
        if (isAcceptAll) {
          result.status = 'accept_all';
          result.confidence = 75;
          return result;
        }
      }
      
      // Standard SMTP result mapping
      if (smtp.rcptOk) {
        // Map to comprehensive status based on risk factors
        if (result.isRole) {
          result.status = 'risky';
          result.confidence = 75;
        } else if (result.isFree) {
          result.status = 'send_with_caution';
          result.confidence = 80;
        } else {
          result.status = 'safe_to_send';
          result.confidence = 95;
        }
      } else if (smtp.code && smtp.code >= 500) {
        result.status = 'invalid';
        result.confidence = 85;
      } else {
        result.status = 'unknown';
        result.confidence = 50;
      }
    } catch (e) {
      // SMTP probe failed - not necessarily invalid
      result.status = 'unknown';
      result.confidence = 60;
    }
  } else {
    // DNS-only validation (no SMTP)
    if (dns.hasMX) {
      // Map to comprehensive status based on risk factors
      if (result.isRole) {
        result.status = 'risky';
        result.confidence = 65;
      } else if (result.isFree) {
        result.status = 'send_with_caution';
        result.confidence = 70;
      } else {
        result.status = 'valid'; // DNS-verified but not SMTP-confirmed
        result.confidence = 75;
      }
    } else {
      result.status = 'unknown';
      result.confidence = 50;
    }
  }
  
  return result;
}

/**
 * Validate email and store result in database
 */
export async function validateAndStoreEmail(
  contactId: string,
  email: string,
  provider: 'api_free' | 'emaillistverify' = 'api_free',
  options: { skipSmtp?: boolean } = {}
): Promise<ValidationResult> {
  const emailLower = email.toLowerCase().trim();
  
  // Run validation
  const validation = await validateEmail(email, options);
  
  // Store result
  await db
    .insert(verificationEmailValidations)
    .values({
      contactId,
      emailLower,
      provider,
      status: validation.status,
      syntaxValid: validation.syntaxValid,
      hasMx: validation.hasMx,
      hasSmtp: validation.hasSmtp,
      smtpAccepted: validation.smtpAccepted,
      isRole: validation.isRole,
      isFree: validation.isFree,
      isDisposable: validation.isDisposable,
      isSpamTrap: validation.isSpamTrap,
      isAcceptAll: validation.isAcceptAll,
      isDisabled: validation.isDisabled,
      confidence: validation.confidence,
      validationTrace: validation.trace as any,
    })
    .onConflictDoUpdate({
      target: [verificationEmailValidations.contactId, verificationEmailValidations.emailLower],
      set: {
        provider,
        status: validation.status,
        syntaxValid: validation.syntaxValid,
        hasMx: validation.hasMx,
        hasSmtp: validation.hasSmtp,
        smtpAccepted: validation.smtpAccepted,
        isRole: validation.isRole,
        isFree: validation.isFree,
        isDisposable: validation.isDisposable,
        isSpamTrap: validation.isSpamTrap,
        isAcceptAll: validation.isAcceptAll,
        isDisabled: validation.isDisabled,
        confidence: validation.confidence,
        validationTrace: validation.trace as any,
        checkedAt: new Date(),
      }
    });
  
  return validation;
}
