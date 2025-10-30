import { db } from '../db';
import {
  campaignSuppressionAccounts,
  campaignSuppressionContacts,
  campaignSuppressionDomains,
  campaignSuppressionEmails,
  campaigns,
  contacts as contactsTable,
  accounts as accountsTable,
} from '@shared/schema';
import { eq, and, or, inArray, sql } from 'drizzle-orm';
import { getDomainFromUrl } from 'tldts';

/**
 * Extract domain from email address
 * Example: "john@acme.com" => "acme.com"
 */
export function extractDomainFromEmail(email: string | null): string | null {
  if (!email) return null;
  
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) return null;
  
  return parts[1] || null;
}

/**
 * Normalize domain for consistent matching
 * Removes www., converts to lowercase, trims whitespace
 */
export function normalizeDomain(domain: string | null): string | null {
  if (!domain) return null;
  
  let normalized = domain.toLowerCase().trim();
  
  // Remove protocol if present
  normalized = normalized.replace(/^https?:\/\//, '');
  
  // Remove www prefix
  normalized = normalized.replace(/^www\./, '');
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  // Extract just the domain if it's a full URL
  const parsed = getDomainFromUrl(normalized);
  if (parsed) {
    normalized = parsed;
  }
  
  return normalized || null;
}

/**
 * Normalize company name for matching
 * Removes common suffixes, converts to lowercase, collapses whitespace
 */
export function normalizeCompanyName(companyName: string | null): string | null {
  if (!companyName) return null;
  
  let normalized = companyName.toLowerCase().trim();
  
  // Remove common company suffixes (case-insensitive)
  const suffixes = [
    'inc', 'inc.', 'incorporated',
    'ltd', 'ltd.', 'limited',
    'llc', 'l.l.c.', 'l.l.c',
    'corp', 'corp.', 'corporation',
    'co', 'co.', 'company',
    'plc', 'p.l.c.',
    'gmbh', 'ag', 's.a.', 'bv', 'nv'
  ];
  
  for (const suffix of suffixes) {
    const pattern = new RegExp(`\\s+${suffix}$`, 'i');
    normalized = normalized.replace(pattern, '');
  }
  
  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized || null;
}

/**
 * Check if a contact is suppressed at campaign level
 * Returns suppression reason if suppressed, null otherwise
 * 
 * Matching Rules:
 * 1. Contact ID exact match (campaignSuppressionContacts)
 * 2. Account ID exact match (campaignSuppressionAccounts)
 * 3. Email exact match (campaignSuppressionEmails)
 * 4. Email domain match (campaignSuppressionDomains)
 * 5. Account domain match (campaignSuppressionDomains)
 * 6. Company name match (campaignSuppressionDomains with companyName)
 */
export async function checkCampaignSuppression(
  campaignId: string,
  contactId: string
): Promise<{ suppressed: boolean; reason: string | null }> {
  try {
    // Fetch contact with account details
    const [contact] = await db
      .select({
        contactId: contactsTable.id,
        accountId: contactsTable.accountId,
        email: contactsTable.email,
        accountDomain: accountsTable.domain,
        companyName: accountsTable.name,
      })
      .from(contactsTable)
      .leftJoin(accountsTable, eq(contactsTable.accountId, accountsTable.id))
      .where(eq(contactsTable.id, contactId))
      .limit(1);
    
    if (!contact) {
      return { suppressed: false, reason: null };
    }
    
    // Rule 1: Check if contact is directly suppressed
    const [contactSuppress] = await db
      .select()
      .from(campaignSuppressionContacts)
      .where(
        and(
          eq(campaignSuppressionContacts.campaignId, campaignId),
          eq(campaignSuppressionContacts.contactId, contact.contactId)
        )
      )
      .limit(1);
    
    if (contactSuppress) {
      return { 
        suppressed: true, 
        reason: contactSuppress.reason || 'Contact directly suppressed for this campaign' 
      };
    }
    
    // Rule 2: Check if account is suppressed
    if (contact.accountId) {
      const [accountSuppress] = await db
        .select()
        .from(campaignSuppressionAccounts)
        .where(
          and(
            eq(campaignSuppressionAccounts.campaignId, campaignId),
            eq(campaignSuppressionAccounts.accountId, contact.accountId)
          )
        )
        .limit(1);
      
      if (accountSuppress) {
        return { 
          suppressed: true, 
          reason: accountSuppress.reason || 'Account suppressed for this campaign' 
        };
      }
    }
    
    // Rule 3: Check if email is suppressed
    if (contact.email) {
      const emailNorm = contact.email.toLowerCase().trim();
      const [emailSuppress] = await db
        .select()
        .from(campaignSuppressionEmails)
        .where(
          and(
            eq(campaignSuppressionEmails.campaignId, campaignId),
            eq(campaignSuppressionEmails.emailNorm, emailNorm)
          )
        )
        .limit(1);
      
      if (emailSuppress) {
        return { 
          suppressed: true, 
          reason: emailSuppress.reason || 'Email suppressed for this campaign' 
        };
      }
    }
    
    // Rule 4 & 5 & 6: Check domain suppressions (email domain, account domain, company name)
    const domainsToCheck: string[] = [];
    const companyNamesToCheck: string[] = [];
    
    // Extract domain from email
    if (contact.email) {
      const emailDomain = extractDomainFromEmail(contact.email);
      if (emailDomain) {
        const normalized = normalizeDomain(emailDomain);
        if (normalized) domainsToCheck.push(normalized);
      }
    }
    
    // Add account domain
    if (contact.accountDomain) {
      const normalized = normalizeDomain(contact.accountDomain);
      if (normalized) domainsToCheck.push(normalized);
    }
    
    // Add company name
    if (contact.companyName) {
      const normalized = normalizeCompanyName(contact.companyName);
      if (normalized) companyNamesToCheck.push(normalized);
    }
    
    if (domainsToCheck.length > 0 || companyNamesToCheck.length > 0) {
      const domainConditions = [];
      
      if (domainsToCheck.length > 0) {
        domainConditions.push(
          inArray(campaignSuppressionDomains.domainNorm, domainsToCheck)
        );
      }
      
      if (companyNamesToCheck.length > 0) {
        // For company name matching, use LOWER() comparison for case-insensitive
        domainConditions.push(
          sql`LOWER(${campaignSuppressionDomains.companyName}) IN (${sql.join(
            companyNamesToCheck.map(name => sql`${name}`),
            sql`, `
          )})`
        );
      }
      
      const [domainSuppress] = await db
        .select()
        .from(campaignSuppressionDomains)
        .where(
          and(
            eq(campaignSuppressionDomains.campaignId, campaignId),
            or(...domainConditions)
          )
        )
        .limit(1);
      
      if (domainSuppress) {
        return { 
          suppressed: true, 
          reason: domainSuppress.reason || 'Domain/Company suppressed for this campaign' 
        };
      }
    }
    
    return { suppressed: false, reason: null };
  } catch (error) {
    console.error('[Campaign Suppression] Error checking suppression:', error);
    throw error;
  }
}

/**
 * Check if an account has reached its cap for a campaign
 * Takes into account:
 * - Campaign's account cap setting (leadCapPerAccount or accountCapValue)
 * - Number of contacts already queued/called from this account
 * - Campaign suppression list (if ANY contact from account is suppressed, entire account is blocked when cap=1)
 */
export async function checkAccountCapReached(
  campaignId: string,
  accountId: string
): Promise<{ capReached: boolean; reason: string | null; currentCount: number; cap: number }> {
  try {
    // Get campaign settings
    const [campaign] = await db
      .select({
        accountCapEnabled: campaigns.accountCapEnabled,
        accountCapValue: campaigns.accountCapValue,
        accountCapMode: campaigns.accountCapMode,
      })
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);
    
    if (!campaign || !campaign.accountCapEnabled) {
      return { capReached: false, reason: null, currentCount: 0, cap: 0 };
    }
    
    const cap = campaign.accountCapValue || 10;
    
    // SPECIAL RULE: When cap = 1, check if ANY contact from this account is in suppression list
    if (cap === 1) {
      const [accountSuppressed] = await db
        .select()
        .from(campaignSuppressionAccounts)
        .where(
          and(
            eq(campaignSuppressionAccounts.campaignId, campaignId),
            eq(campaignSuppressionAccounts.accountId, accountId)
          )
        )
        .limit(1);
      
      if (accountSuppressed) {
        return {
          capReached: true,
          reason: 'Account suppressed - cap set to 1 and account in suppression list',
          currentCount: 0,
          cap: 1
        };
      }
      
      // Check if ANY contact from this account is suppressed
      const [anySuppressedContact] = await db
        .select({ contactId: contactsTable.id })
        .from(contactsTable)
        .innerJoin(
          campaignSuppressionContacts,
          and(
            eq(contactsTable.id, campaignSuppressionContacts.contactId),
            eq(campaignSuppressionContacts.campaignId, campaignId)
          )
        )
        .where(eq(contactsTable.accountId, accountId))
        .limit(1);
      
      if (anySuppressedContact) {
        return {
          capReached: true,
          reason: 'Account has suppressed contact - cap set to 1, blocking all contacts from this account',
          currentCount: 0,
          cap: 1
        };
      }
    }
    
    // Count contacts from this account based on cap mode
    let currentCount = 0;
    
    if (campaign.accountCapMode === 'queue_size') {
      // Count queued contacts
      const [result] = await db.execute(sql`
        SELECT COUNT(*)::int as count
        FROM agent_queue
        WHERE campaign_id = ${campaignId}
          AND account_id = ${accountId}
          AND status = 'queued'
      `);
      currentCount = result.count || 0;
    } else if (campaign.accountCapMode === 'connected_calls') {
      // Count connected calls
      const [result] = await db.execute(sql`
        SELECT COUNT(*)::int as count
        FROM call_attempts
        WHERE campaign_id = ${campaignId}
          AND account_id = ${accountId}
          AND call_connected = true
      `);
      currentCount = result.count || 0;
    } else if (campaign.accountCapMode === 'positive_disp') {
      // Count positive dispositions
      const [result] = await db.execute(sql`
        SELECT COUNT(*)::int as count
        FROM call_attempts ca
        INNER JOIN dispositions d ON ca.disposition_id = d.id
        WHERE ca.campaign_id = ${campaignId}
          AND ca.account_id = ${accountId}
          AND d.system_action IN ('qualify', 'schedule_callback', 'convert')
      `);
      currentCount = result.count || 0;
    }
    
    if (currentCount >= cap) {
      return {
        capReached: true,
        reason: `Account cap reached: ${currentCount}/${cap} (mode: ${campaign.accountCapMode})`,
        currentCount,
        cap
      };
    }
    
    return { capReached: false, reason: null, currentCount, cap };
  } catch (error) {
    console.error('[Campaign Suppression] Error checking account cap:', error);
    throw error;
  }
}

/**
 * Batch check campaign suppression for multiple contacts
 * Returns a Map of contactId => suppression result
 * More efficient than checking contacts one by one
 */
export async function batchCheckCampaignSuppression(
  campaignId: string,
  contactIds: string[]
): Promise<Map<string, { suppressed: boolean; reason: string | null }>> {
  const results = new Map<string, { suppressed: boolean; reason: string | null }>();
  
  if (contactIds.length === 0) return results;
  
  try {
    // Fetch all contacts with account details
    const contactsData = await db
      .select({
        contactId: contactsTable.id,
        accountId: contactsTable.accountId,
        email: contactsTable.email,
        accountDomain: accountsTable.domain,
        companyName: accountsTable.name,
      })
      .from(contactsTable)
      .leftJoin(accountsTable, eq(contactsTable.accountId, accountsTable.id))
      .where(inArray(contactsTable.id, contactIds));
    
    // Initialize all as not suppressed
    for (const contact of contactsData) {
      results.set(contact.contactId, { suppressed: false, reason: null });
    }
    
    // Rule 1: Check contact suppressions
    const contactSuppressions = await db
      .select()
      .from(campaignSuppressionContacts)
      .where(
        and(
          eq(campaignSuppressionContacts.campaignId, campaignId),
          inArray(campaignSuppressionContacts.contactId, contactIds)
        )
      );
    
    for (const suppress of contactSuppressions) {
      results.set(suppress.contactId, {
        suppressed: true,
        reason: suppress.reason || 'Contact directly suppressed for this campaign'
      });
    }
    
    // Rule 2: Check account suppressions
    const accountIds = [...new Set(contactsData.map(c => c.accountId).filter(Boolean))];
    if (accountIds.length > 0) {
      const accountSuppressions = await db
        .select()
        .from(campaignSuppressionAccounts)
        .where(
          and(
            eq(campaignSuppressionAccounts.campaignId, campaignId),
            inArray(campaignSuppressionAccounts.accountId, accountIds as string[])
          )
        );
      
      const suppressedAccountIds = new Set(accountSuppressions.map(s => s.accountId));
      for (const contact of contactsData) {
        if (contact.accountId && suppressedAccountIds.has(contact.accountId)) {
          const current = results.get(contact.contactId);
          if (!current?.suppressed) {
            const suppress = accountSuppressions.find(s => s.accountId === contact.accountId);
            results.set(contact.contactId, {
              suppressed: true,
              reason: suppress?.reason || 'Account suppressed for this campaign'
            });
          }
        }
      }
    }
    
    // Rule 3: Check email suppressions
    const emailNorms = contactsData
      .map(c => c.email?.toLowerCase().trim())
      .filter(Boolean) as string[];
    
    if (emailNorms.length > 0) {
      const emailSuppressions = await db
        .select()
        .from(campaignSuppressionEmails)
        .where(
          and(
            eq(campaignSuppressionEmails.campaignId, campaignId),
            inArray(campaignSuppressionEmails.emailNorm, emailNorms)
          )
        );
      
      const suppressedEmails = new Map(
        emailSuppressions.map(s => [s.emailNorm, s.reason || 'Email suppressed for this campaign'])
      );
      
      for (const contact of contactsData) {
        if (contact.email) {
          const emailNorm = contact.email.toLowerCase().trim();
          const reason = suppressedEmails.get(emailNorm);
          if (reason) {
            const current = results.get(contact.contactId);
            if (!current?.suppressed) {
              results.set(contact.contactId, { suppressed: true, reason });
            }
          }
        }
      }
    }
    
    // Rule 4, 5, 6: Check domain suppressions
    const allDomains = new Set<string>();
    const allCompanyNames = new Set<string>();
    
    for (const contact of contactsData) {
      // Email domain
      if (contact.email) {
        const emailDomain = extractDomainFromEmail(contact.email);
        if (emailDomain) {
          const normalized = normalizeDomain(emailDomain);
          if (normalized) allDomains.add(normalized);
        }
      }
      
      // Account domain
      if (contact.accountDomain) {
        const normalized = normalizeDomain(contact.accountDomain);
        if (normalized) allDomains.add(normalized);
      }
      
      // Company name
      if (contact.companyName) {
        const normalized = normalizeCompanyName(contact.companyName);
        if (normalized) allCompanyNames.add(normalized);
      }
    }
    
    if (allDomains.size > 0 || allCompanyNames.size > 0) {
      const domainConditions = [];
      
      if (allDomains.size > 0) {
        domainConditions.push(
          inArray(campaignSuppressionDomains.domainNorm, Array.from(allDomains))
        );
      }
      
      if (allCompanyNames.size > 0) {
        domainConditions.push(
          sql`LOWER(${campaignSuppressionDomains.companyName}) IN (${sql.join(
            Array.from(allCompanyNames).map(name => sql`${name}`),
            sql`, `
          )})`
        );
      }
      
      const domainSuppressions = await db
        .select()
        .from(campaignSuppressionDomains)
        .where(
          and(
            eq(campaignSuppressionDomains.campaignId, campaignId),
            or(...domainConditions)
          )
        );
      
      // Build lookup maps
      const suppressedDomains = new Map(
        domainSuppressions
          .filter(s => s.domainNorm)
          .map(s => [s.domainNorm, s.reason || 'Domain suppressed for this campaign'])
      );
      
      const suppressedCompanies = new Map(
        domainSuppressions
          .filter(s => s.companyName)
          .map(s => [normalizeCompanyName(s.companyName)!, s.reason || 'Company suppressed for this campaign'])
      );
      
      for (const contact of contactsData) {
        const current = results.get(contact.contactId);
        if (current?.suppressed) continue; // Already suppressed
        
        // Check email domain
        if (contact.email) {
          const emailDomain = extractDomainFromEmail(contact.email);
          if (emailDomain) {
            const normalized = normalizeDomain(emailDomain);
            if (normalized && suppressedDomains.has(normalized)) {
              results.set(contact.contactId, {
                suppressed: true,
                reason: suppressedDomains.get(normalized)!
              });
              continue;
            }
          }
        }
        
        // Check account domain
        if (contact.accountDomain) {
          const normalized = normalizeDomain(contact.accountDomain);
          if (normalized && suppressedDomains.has(normalized)) {
            results.set(contact.contactId, {
              suppressed: true,
              reason: suppressedDomains.get(normalized)!
            });
            continue;
          }
        }
        
        // Check company name
        if (contact.companyName) {
          const normalized = normalizeCompanyName(contact.companyName);
          if (normalized && suppressedCompanies.has(normalized)) {
            results.set(contact.contactId, {
              suppressed: true,
              reason: suppressedCompanies.get(normalized)!
            });
            continue;
          }
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('[Campaign Suppression] Error in batch check:', error);
    throw error;
  }
}
