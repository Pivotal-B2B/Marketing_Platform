import { storage } from "../storage";
import type { AgentQueue, Contact, Campaign, ManualQueueFilters } from "@shared/schema";
import { eq, and, or, sql, inArray, isNull } from "drizzle-orm";
import { db } from "../db";
import { agentQueue, contacts, accounts, campaigns, suppressionEmails, suppressionPhones, campaignSuppressionAccounts, campaignSuppressionContacts, campaignSuppressionEmails, campaignSuppressionDomains } from "@shared/schema";
import { getBestPhoneForContact, normalizePhoneWithCountryCode } from "../lib/phone-utils";

interface QueueConfig {
  lockTimeoutSec: number; // How long a contact stays locked before auto-release
  maxRetries: number;
  priorityBoost: number; // Priority increase per manual retry
}

const DEFAULT_CONFIG: QueueConfig = {
  lockTimeoutSec: 300, // 5 minutes
  maxRetries: 3,
  priorityBoost: 10,
};

export class ManualQueueService {
  private config: QueueConfig;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add contacts to agent's manual queue based on filters
   * Uses bulk prefetching of suppression lists to avoid N+1 queries
   */
  async addContactsToAgentQueue(
    agentId: string,
    campaignId: string,
    filters: ManualQueueFilters,
    limit: number = 100
  ): Promise<{ added: number; skipped: number }> {
    try {
      // Get campaign to verify it's in manual mode
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.dialMode !== 'manual') {
        throw new Error("Campaign must be in manual dial mode");
      }

      // Build contact query based on filters
      const eligibleContacts = await this.getEligibleContacts(campaignId, filters, limit);

      if (eligibleContacts.length === 0) {
        return { added: 0, skipped: 0 };
      }

      // PERFORMANCE OPTIMIZATION: Prefetch all suppression sets in bulk
      const suppressionSets = await this.prefetchSuppressionSets(
        campaignId, 
        eligibleContacts
      );

      // Get already queued contacts in this campaign (bulk check)
      const contactIds = eligibleContacts.map(c => c.id);
      const alreadyQueued = await db
        .select({ contactId: agentQueue.contactId })
        .from(agentQueue)
        .where(
          and(
            eq(agentQueue.campaignId, campaignId),
            inArray(agentQueue.contactId, contactIds),
            or(
              eq(agentQueue.queueState, 'queued'),
              eq(agentQueue.queueState, 'locked'),
              eq(agentQueue.queueState, 'in_progress')
            )!
          )
        );
      
      const alreadyQueuedSet = new Set(alreadyQueued.map(q => q.contactId));

      // Filter contacts using in-memory suppression check AND phone country validation
      const contactsToAdd = eligibleContacts.filter(contact => {
        // Skip if already queued
        if (alreadyQueuedSet.has(contact.id)) {
          return false;
        }

        // Check suppression using prefetched sets (in-memory)
        if (this.isContactSuppressedBulk(contact, suppressionSets)) {
          return false;
        }

        // PHONE COUNTRY VALIDATION: Only include contacts with phone matching their country
        const bestPhone = getBestPhoneForContact(contact);
        if (!bestPhone.phone) {
          console.log(`[ManualQueue] Contact ${contact.id} filtered: no valid phone matching country ${contact.country}`);
          return false;
        }

        return true;
      });

      console.log(`[ManualQueue] Filtered ${eligibleContacts.length} contacts: ${contactsToAdd.length} to add, ${eligibleContacts.length - contactsToAdd.length} suppressed/queued`);

      // Bulk insert all non-suppressed contacts
      if (contactsToAdd.length === 0) {
        return { added: 0, skipped: eligibleContacts.length };
      }

      // Update contacts with normalized phone numbers if needed
      const directPhoneUpdates: Array<{id: string, directPhoneE164: string}> = [];
      const mobilePhoneUpdates: Array<{id: string, mobilePhoneE164: string}> = [];
      
      const queueEntries = contactsToAdd.map(contact => {
        // Normalize and update phone numbers - ONLY update the specific field that needs normalization
        const bestPhone = getBestPhoneForContact(contact);
        
        // Update E164 fields if missing (only for contact-owned phones, not HQ)
        if (bestPhone.type === 'direct' && !contact.directPhoneE164 && contact.directPhone) {
          const normalized = normalizePhoneWithCountryCode(contact.directPhone, contact.country);
          if (normalized.e164) {
            directPhoneUpdates.push({ id: contact.id, directPhoneE164: normalized.e164 });
          }
        } else if (bestPhone.type === 'mobile' && !contact.mobilePhoneE164 && contact.mobilePhone) {
          const normalized = normalizePhoneWithCountryCode(contact.mobilePhone, contact.country);
          if (normalized.e164) {
            mobilePhoneUpdates.push({ id: contact.id, mobilePhoneE164: normalized.e164 });
          }
        }
        // Note: 'hq' phone type is read-only from account table, no update needed

        return {
          id: sql`gen_random_uuid()`,
          agentId,
          campaignId,
          contactId: contact.id,
          accountId: contact.accountId,
          queueState: 'queued' as const,
          priority: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      // Update contacts with normalized phone numbers - separate updates to avoid data loss
      for (const update of directPhoneUpdates) {
        await db
          .update(contacts)
          .set({
            directPhoneE164: update.directPhoneE164,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, update.id));
      }

      for (const update of mobilePhoneUpdates) {
        await db
          .update(contacts)
          .set({
            mobilePhoneE164: update.mobilePhoneE164,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, update.id));
      }

      const totalUpdates = directPhoneUpdates.length + mobilePhoneUpdates.length;
      console.log(`[ManualQueue] Updated ${totalUpdates} contacts with normalized phone numbers (${directPhoneUpdates.length} direct, ${mobilePhoneUpdates.length} mobile)`);

      // Bulk insert with conflict handling
      const result = await db.insert(agentQueue)
        .values(queueEntries)
        .onConflictDoNothing({
          target: [agentQueue.campaignId, agentQueue.contactId],
          where: sql`${agentQueue.queueState} IN ('queued', 'locked', 'in_progress')`,
        })
        .returning({ id: agentQueue.id });

      const added = result.length;
      const skipped = eligibleContacts.length - added;

      console.log(`[ManualQueue] Added ${added} contacts to agent ${agentId} queue, skipped ${skipped}`);
      return { added, skipped };

    } catch (error) {
      console.error("[ManualQueue] Error adding contacts to queue:", error);
      throw error;
    }
  }

  /**
   * Pull next contact from agent's queue (with locking)
   * Uses transaction with FOR UPDATE SKIP LOCKED for race-free pulls
   */
  async pullNextContact(agentId: string, campaignId: string): Promise<AgentQueue | null> {
    try {
      // Use a transaction to atomically select and lock in one operation
      const result = await db.transaction(async (tx) => {
        // SELECT ... FOR UPDATE SKIP LOCKED ensures:
        // 1. Only one agent can lock a row at a time
        // 2. Other agents skip locked rows and get the next available one
        // 3. No race conditions or deadlocks
        const selectResult = await tx.execute(sql`
          SELECT id, lock_version
          FROM agent_queue
          WHERE agent_id = ${agentId}
            AND campaign_id = ${campaignId}
            AND queue_state = 'queued'
            AND (scheduled_for IS NULL OR scheduled_for <= NOW())
          ORDER BY priority DESC, created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        `);

        const row = selectResult.rows[0];
        if (!row) {
          return null;
        }

        // Update with optimistic concurrency (lock_version check)
        const updateResult = await tx.execute(sql`
          UPDATE agent_queue
          SET 
            queue_state = 'locked',
            locked_by = ${agentId},
            locked_at = NOW(),
            lock_expires_at = NOW() + INTERVAL '15 minutes',
            lock_version = lock_version + 1,
            updated_at = NOW()
          WHERE id = ${row.id}
            AND queue_state = 'queued'
            AND lock_version = ${row.lock_version}
          RETURNING *
        `);

        const updated = updateResult.rows[0];
        return updated || null;
      });

      // Fetch full contact details if lock was successful
      if (result) {
        const fullItem = await db.query.agentQueue.findFirst({
          where: eq(agentQueue.id, result.id as string),
        });
        return fullItem || null;
      }

      return null;

    } catch (error) {
      console.error("[ManualQueue] Error pulling next contact:", error);
      throw error;
    }
  }

  /**
   * Mark queue item as in progress (agent is calling)
   */
  async markInProgress(queueItemId: string, agentId: string): Promise<void> {
    await db
      .update(agentQueue)
      .set({
        queueState: 'in_progress',
        updatedAt: new Date(),
      })
      .where(and(
        eq(agentQueue.id, queueItemId),
        eq(agentQueue.lockedBy, agentId)
      ));
  }

  /**
   * Mark queue item as completed
   */
  async markCompleted(queueItemId: string, agentId: string): Promise<void> {
    await db
      .update(agentQueue)
      .set({
        queueState: 'completed',
        updatedAt: new Date(),
      })
      .where(and(
        eq(agentQueue.id, queueItemId),
        eq(agentQueue.lockedBy, agentId)
      ));
  }

  /**
   * Remove contact from queue with reason
   */
  async removeFromQueue(
    queueItemId: string,
    agentId: string,
    reason: string
  ): Promise<void> {
    await db
      .update(agentQueue)
      .set({
        queueState: 'removed',
        removedReason: reason,
        updatedAt: new Date(),
      })
      .where(and(
        eq(agentQueue.id, queueItemId),
        eq(agentQueue.lockedBy, agentId)
      ));
  }

  /**
   * Release lock on queue item (put back to queued)
   */
  async releaseLock(queueItemId: string, agentId: string): Promise<void> {
    await db
      .update(agentQueue)
      .set({
        queueState: 'queued',
        lockedBy: null,
        lockedAt: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(agentQueue.id, queueItemId),
        eq(agentQueue.lockedBy, agentId)
      ));
  }

  /**
   * Boost priority for retry
   */
  async boostPriority(queueItemId: string): Promise<void> {
    await db
      .update(agentQueue)
      .set({
        priority: sql`${agentQueue.priority} + ${this.config.priorityBoost}`,
        updatedAt: new Date(),
      })
      .where(eq(agentQueue.id, queueItemId));
  }

  /**
   * Get agent's queue stats
   */
  async getQueueStats(agentId: string, campaignId: string) {
    const stats = await db
      .select({
        queueState: agentQueue.queueState,
        count: sql<number>`count(*)`,
      })
      .from(agentQueue)
      .where(and(
        eq(agentQueue.agentId, agentId),
        eq(agentQueue.campaignId, campaignId)
      ))
      .groupBy(agentQueue.queueState);

    return stats.reduce((acc, row) => {
      acc[row.queueState] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Release stale locks (locked > timeout)
   */
  private async releaseStaleLocksForAgent(agentId: string, campaignId: string): Promise<void> {
    const timeoutDate = new Date(Date.now() - this.config.lockTimeoutSec * 1000);

    await db
      .update(agentQueue)
      .set({
        queueState: 'queued',
        lockedBy: null,
        lockedAt: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(agentQueue.agentId, agentId),
        eq(agentQueue.campaignId, campaignId),
        eq(agentQueue.queueState, 'locked'),
        sql`${agentQueue.lockedAt} < ${timeoutDate}`
      ));
  }

  /**
   * Get eligible contacts based on filters
   * INCLUDES account/HQ phone data for phone prioritization logic
   */
  private async getEligibleContacts(
    campaignId: string,
    filters: ManualQueueFilters,
    limit: number
  ): Promise<Contact[]> {
    const conditions = [];

    // Apply filters
    if (filters.accountIds && filters.accountIds.length > 0) {
      conditions.push(inArray(contacts.accountId, filters.accountIds));
    }

    if (filters.industries && filters.industries.length > 0) {
      conditions.push(
        sql`${contacts.accountId} IN (
          SELECT id FROM ${accounts} WHERE ${accounts.industryStandardized} = ANY(ARRAY[${sql.join(filters.industries.map(i => sql`${i}`), sql`, `)}])
        )`
      );
    }

    if (filters.regions && filters.regions.length > 0) {
      conditions.push(
        sql`${contacts.accountId} IN (
          SELECT id FROM ${accounts} WHERE ${accounts.hqState} = ANY(ARRAY[${sql.join(filters.regions.map(r => sql`${r}`), sql`, `)}])
        )`
      );
    }

    if (filters.hasEmail) {
      conditions.push(sql`${contacts.email} IS NOT NULL AND ${contacts.email} != ''`);
    }

    if (filters.hasPhone) {
      conditions.push(sql`(${contacts.directPhone} IS NOT NULL AND ${contacts.directPhone} != '') OR (${contacts.mobilePhone} IS NOT NULL AND ${contacts.mobilePhone} != '')`);
    }

    // Join with accounts to get HQ phone data for fallback logic
    const results = await db
      .select()
      .from(contacts)
      .leftJoin(accounts, eq(contacts.accountId, accounts.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit);

    // Map results to include HQ phone data on contact objects
    const eligibleContacts = results.map(row => ({
      ...row.contacts,
      // Include HQ phone data for phone prioritization logic
      hqPhone: row.accounts?.mainPhone,
      hqPhoneE164: row.accounts?.mainPhoneE164,
      hqCountry: row.accounts?.hqCountry,
    })) as Contact[];

    return eligibleContacts;
  }

  /**
   * Prefetch all suppression sets for a campaign in bulk (single query per set)
   * Returns in-memory sets for fast filtering
   */
  private async prefetchSuppressionSets(
    campaignId: string,
    contacts: Contact[]
  ): Promise<{
    campaignContactIds: Set<string>;
    campaignAccountIds: Set<string>;
    campaignEmailsNorm: Set<string>;
    campaignDomainsNorm: Set<string>;
    globalEmailsNorm: Set<string>;
    globalPhonesE164: Set<string>;
    accountDomains: Map<string, string>; // contactId -> accountDomain
  }> {
    const contactIds = contacts.map(c => c.id);
    const accountIds = contacts.map(c => c.accountId).filter(Boolean) as string[];
    const emails = contacts.map(c => c.email).filter(Boolean) as string[];
    const emailsNorm = emails.map(e => e.toLowerCase().trim());
    
    // Extract all phone numbers from contacts
    const phones: string[] = [];
    for (const contact of contacts) {
      if (contact.directPhoneE164) phones.push(contact.directPhoneE164);
      if (contact.mobilePhoneE164) phones.push(contact.mobilePhoneE164);
    }

    // Parallel bulk queries for all suppression sets
    const [
      campaignContacts,
      campaignAccounts,
      campaignEmails,
      campaignDomains,
      globalEmails,
      globalPhones,
      accountData,
    ] = await Promise.all([
      // Campaign-level contact suppressions
      contactIds.length > 0
        ? db.select({ contactId: campaignSuppressionContacts.contactId })
            .from(campaignSuppressionContacts)
            .where(
              and(
                eq(campaignSuppressionContacts.campaignId, campaignId),
                inArray(campaignSuppressionContacts.contactId, contactIds)
              )
            )
        : Promise.resolve([]),
      
      // Campaign-level account suppressions
      accountIds.length > 0
        ? db.select({ accountId: campaignSuppressionAccounts.accountId })
            .from(campaignSuppressionAccounts)
            .where(
              and(
                eq(campaignSuppressionAccounts.campaignId, campaignId),
                inArray(campaignSuppressionAccounts.accountId, accountIds)
              )
            )
        : Promise.resolve([]),
      
      // Campaign-level email suppressions
      emailsNorm.length > 0
        ? db.select({ emailNorm: campaignSuppressionEmails.emailNorm })
            .from(campaignSuppressionEmails)
            .where(
              and(
                eq(campaignSuppressionEmails.campaignId, campaignId),
                inArray(campaignSuppressionEmails.emailNorm, emailsNorm)
              )
            )
        : Promise.resolve([]),
      
      // Campaign-level domain suppressions
      db.select({ domainNorm: campaignSuppressionDomains.domainNorm })
        .from(campaignSuppressionDomains)
        .where(eq(campaignSuppressionDomains.campaignId, campaignId)),
      
      // Global email suppressions
      emailsNorm.length > 0
        ? db.select({ email: suppressionEmails.email })
            .from(suppressionEmails)
            .where(inArray(suppressionEmails.email, emailsNorm))
        : Promise.resolve([]),
      
      // Global phone suppressions
      phones.length > 0
        ? db.select({ phoneE164: suppressionPhones.phoneE164 })
            .from(suppressionPhones)
            .where(inArray(suppressionPhones.phoneE164, phones))
        : Promise.resolve([]),
      
      // Account domains (for domain-based suppression checks)
      accountIds.length > 0
        ? db.select({ id: accounts.id, domain: accounts.domain })
            .from(accounts)
            .where(inArray(accounts.id, accountIds))
        : Promise.resolve([]),
    ]);

    // Build accountDomains map: contactId -> accountDomain
    const accountDomainsMap = new Map<string, string>();
    const accountDomainLookup = new Map(
      accountData.map(a => [a.id, a.domain]).filter(([_, domain]) => domain) as [string, string][]
    );
    
    for (const contact of contacts) {
      if (contact.accountId) {
        const domain = accountDomainLookup.get(contact.accountId);
        if (domain) {
          accountDomainsMap.set(contact.id, domain);
        }
      }
    }

    return {
      campaignContactIds: new Set(campaignContacts.map(c => c.contactId)),
      campaignAccountIds: new Set(campaignAccounts.map(a => a.accountId)),
      campaignEmailsNorm: new Set(campaignEmails.map(e => e.emailNorm)),
      campaignDomainsNorm: new Set(campaignDomains.map(d => d.domainNorm)),
      globalEmailsNorm: new Set(globalEmails.map(e => e.email)),
      globalPhonesE164: new Set(globalPhones.map(p => p.phoneE164)),
      accountDomains: accountDomainsMap,
    };
  }

  /**
   * Check if contact is suppressed using prefetched suppression sets (in-memory)
   * Much faster than individual DB queries for each contact
   */
  private isContactSuppressedBulk(
    contact: Contact,
    suppressionSets: {
      campaignContactIds: Set<string>;
      campaignAccountIds: Set<string>;
      campaignEmailsNorm: Set<string>;
      campaignDomainsNorm: Set<string>;
      globalEmailsNorm: Set<string>;
      globalPhonesE164: Set<string>;
      accountDomains: Map<string, string>;
    }
  ): boolean {
    // 1. Campaign-level contact suppression
    if (suppressionSets.campaignContactIds.has(contact.id)) {
      console.log(`[ManualQueue] Contact ${contact.id} is campaign-suppressed`);
      return true;
    }

    // 2. Campaign-level account suppression
    if (contact.accountId && suppressionSets.campaignAccountIds.has(contact.accountId)) {
      console.log(`[ManualQueue] Account ${contact.accountId} is campaign-suppressed`);
      return true;
    }

    // 3. Campaign-level email suppression
    if (contact.email) {
      const emailNorm = contact.email.toLowerCase().trim();
      if (suppressionSets.campaignEmailsNorm.has(emailNorm)) {
        console.log(`[ManualQueue] Email ${contact.email} is campaign-suppressed`);
        return true;
      }
    }

    // 4. Campaign-level domain suppression
    // Check both email-derived domain AND account domain
    const domainsToCheck: string[] = [];
    
    // Extract domain from email
    if (contact.email) {
      const match = contact.email.match(/@(.+)$/);
      if (match) {
        domainsToCheck.push(match[1]);
      }
    }
    
    // Add account domain (canonical domain)
    const accountDomain = suppressionSets.accountDomains.get(contact.id);
    if (accountDomain) {
      domainsToCheck.push(accountDomain);
    }
    
    for (const domain of domainsToCheck) {
      const domainNorm = domain.toLowerCase().trim().replace(/^www\./, '');
      if (suppressionSets.campaignDomainsNorm.has(domainNorm)) {
        console.log(`[ManualQueue] Domain ${domain} is campaign-suppressed`);
        return true;
      }
    }

    // 5. Global email suppression
    if (contact.email) {
      const emailNorm = contact.email.toLowerCase().trim();
      if (suppressionSets.globalEmailsNorm.has(emailNorm)) {
        console.log(`[ManualQueue] Email ${contact.email} is globally suppressed`);
        return true;
      }
    }

    // 6. Global phone suppression (DNC)
    if (contact.directPhoneE164 && suppressionSets.globalPhonesE164.has(contact.directPhoneE164)) {
      console.log(`[ManualQueue] Direct phone is on global DNC`);
      return true;
    }
    if (contact.mobilePhoneE164 && suppressionSets.globalPhonesE164.has(contact.mobilePhoneE164)) {
      console.log(`[ManualQueue] Mobile phone is on global DNC`);
      return true;
    }

    return false;
  }

  /**
   * Check if contact is on global or campaign-level suppression lists
   * NOTE: This is the legacy per-contact method, kept for single-contact operations
   * For bulk operations, use prefetchSuppressionSets + isContactSuppressedBulk
   */
  private async isContactSuppressed(
    contactId: string, 
    accountId: string | null, 
    campaignId: string,
    email?: string
  ): Promise<boolean> {
    // 1. Check campaign-level contact suppression (highest priority)
    const campaignContactSuppression = await db.query.campaignSuppressionContacts.findFirst({
      where: and(
        eq(campaignSuppressionContacts.campaignId, campaignId),
        eq(campaignSuppressionContacts.contactId, contactId)
      ),
    });
    if (campaignContactSuppression) {
      console.log(`[ManualQueue] Contact ${contactId} is suppressed for campaign ${campaignId}`);
      return true;
    }

    // 2. Check campaign-level account suppression (suppresses entire account)
    if (accountId) {
      const campaignAccountSuppression = await db.query.campaignSuppressionAccounts.findFirst({
        where: and(
          eq(campaignSuppressionAccounts.campaignId, campaignId),
          eq(campaignSuppressionAccounts.accountId, accountId)
        ),
      });
      if (campaignAccountSuppression) {
        console.log(`[ManualQueue] Account ${accountId} is suppressed for campaign ${campaignId}, skipping contact ${contactId}`);
        return true;
      }
    }

    // Get contact details for email/domain checking
    const contact = await storage.getContact(contactId);
    
    // 3. Check campaign-level email suppression
    if (email) {
      const emailNorm = email.toLowerCase().trim();
      const campaignEmailSuppression = await db.query.campaignSuppressionEmails.findFirst({
        where: and(
          eq(campaignSuppressionEmails.campaignId, campaignId),
          eq(campaignSuppressionEmails.emailNorm, emailNorm)
        ),
      });
      if (campaignEmailSuppression) {
        console.log(`[ManualQueue] Email ${email} is suppressed for campaign ${campaignId}`);
        return true;
      }
    }

    // 4. Check campaign-level domain suppression
    if (contact && (email || contact.accountId)) {
      // Extract domain from email or fetch account domain
      let domain: string | null = null;
      
      // Try to get domain from account
      if (contact.accountId) {
        const account = await db.query.accounts.findFirst({
          where: eq(accounts.id, contact.accountId),
        });
        domain = account?.domain || null;
      }
      
      // If no domain from account, extract from email
      if (!domain && email) {
        const match = email.match(/@(.+)$/);
        domain = match ? match[1] : null;
      }

      if (domain) {
        const domainNorm = domain.toLowerCase().trim().replace(/^www\./, '');
        const campaignDomainSuppression = await db.query.campaignSuppressionDomains.findFirst({
          where: and(
            eq(campaignSuppressionDomains.campaignId, campaignId),
            eq(campaignSuppressionDomains.domainNorm, domainNorm)
          ),
        });
        if (campaignDomainSuppression) {
          console.log(`[ManualQueue] Domain ${domain} is suppressed for campaign ${campaignId}`);
          return true;
        }
      }
    }

    // 5. Check global email suppression (DNC)
    if (email) {
      const emailSuppression = await db.query.suppressionEmails.findFirst({
        where: eq(suppressionEmails.email, email),
      });
      if (emailSuppression) {
        console.log(`[ManualQueue] Email ${email} is on global suppression list`);
        return true;
      }
    }

    // 6. Check global phone suppression (DNC)
    if (contact) {
      const phonesToCheck: string[] = [];
      if (contact.directPhoneE164) phonesToCheck.push(contact.directPhoneE164);
      if (contact.mobilePhoneE164) phonesToCheck.push(contact.mobilePhoneE164);

      if (phonesToCheck.length > 0) {
        const suppressedPhones = await db.query.suppressionPhones.findFirst({
          where: inArray(suppressionPhones.phoneE164, phonesToCheck),
        });
        if (suppressedPhones) {
          console.log(`[ManualQueue] Phone is on global DNC list`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Bulk clear completed items from queue
   */
  async clearCompletedItems(agentId: string, campaignId: string): Promise<number> {
    const result = await db
      .delete(agentQueue)
      .where(and(
        eq(agentQueue.agentId, agentId),
        eq(agentQueue.campaignId, campaignId),
        eq(agentQueue.queueState, 'completed')
      ))
      .returning({ id: agentQueue.id });

    return result.length;
  }

  /**
   * Get current queue for agent
   */
  async getAgentQueue(
    agentId: string,
    campaignId: string,
    includeCompleted: boolean = false
  ) {
    const conditions = [
      eq(agentQueue.agentId, agentId),
      eq(agentQueue.campaignId, campaignId),
    ];

    if (!includeCompleted) {
      conditions.push(
        or(
          eq(agentQueue.queueState, 'queued'),
          eq(agentQueue.queueState, 'locked'),
          eq(agentQueue.queueState, 'in_progress')
        )!
      );
    }

    return await db.query.agentQueue.findMany({
      where: and(...conditions),
      with: {
        contact: true,
        account: true,
      },
      orderBy: [sql`${agentQueue.priority} DESC`, sql`${agentQueue.createdAt} ASC`],
    });
  }
}

// Export singleton instance
export const manualQueueService = new ManualQueueService();
