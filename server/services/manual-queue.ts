import { storage } from "../storage";
import type { AgentQueue, Contact, Campaign, ManualQueueFilters } from "@shared/schema";
import { eq, and, or, sql, inArray, isNull } from "drizzle-orm";
import { db } from "../db";
import { agentQueue, contacts, accounts, campaigns, suppressionEmails, suppressionPhones, campaignSuppressionAccounts, campaignSuppressionContacts, campaignSuppressionEmails, campaignSuppressionDomains } from "@shared/schema";

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

      let added = 0;
      let skipped = 0;

      for (const contact of eligibleContacts) {
        try {
          // Check if contact already in queue for ANY agent in this campaign (global collision prevention)
          const existingInCampaign = await db.query.agentQueue.findFirst({
            where: and(
              eq(agentQueue.campaignId, campaignId),
              eq(agentQueue.contactId, contact.id),
              or(
                eq(agentQueue.queueState, 'queued'),
                eq(agentQueue.queueState, 'locked'),
                eq(agentQueue.queueState, 'in_progress')
              )!
            ),
          });

          if (existingInCampaign) {
            console.log(`[ManualQueue] Contact ${contact.id} already in campaign queue (agent: ${existingInCampaign.agentId})`);
            skipped++;
            continue;
          }

          // Check global DNC and campaign-level suppression lists
          const isSuppressed = await this.isContactSuppressed(
            contact.id, 
            contact.accountId, 
            campaignId, 
            contact.email
          );
          if (isSuppressed) {
            skipped++;
            continue;
          }

          // Add to queue with atomic collision prevention (ON CONFLICT DO NOTHING)
          // Uses campaign-level uniqueness: only one active queue entry per contact per campaign
          const result = await db.insert(agentQueue).values({
            id: sql`gen_random_uuid()`,
            agentId,
            campaignId,
            contactId: contact.id,
            accountId: contact.accountId,
            queueState: 'queued',
            priority: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).onConflictDoNothing({
            target: [agentQueue.campaignId, agentQueue.contactId],
            where: sql`${agentQueue.queueState} IN ('queued', 'locked', 'in_progress')`,
          }).returning({ id: agentQueue.id });

          if (result.length > 0) {
            added++;
          } else {
            skipped++; // Contact already queued by another agent (race condition caught)
          }
        } catch (error) {
          console.error(`[ManualQueue] Error adding contact ${contact.id}:`, error);
          skipped++;
        }
      }

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
          SELECT id FROM ${accounts} WHERE ${accounts.industryStandardized} = ANY(${filters.industries})
        )`
      );
    }

    if (filters.regions && filters.regions.length > 0) {
      conditions.push(
        sql`${contacts.accountId} IN (
          SELECT id FROM ${accounts} WHERE ${accounts.hqState} = ANY(${filters.regions})
        )`
      );
    }

    if (filters.hasEmail) {
      conditions.push(sql`${contacts.email} IS NOT NULL AND ${contacts.email} != ''`);
    }

    if (filters.hasPhone) {
      conditions.push(sql`(${contacts.directPhone} IS NOT NULL AND ${contacts.directPhone} != '') OR (${contacts.mobilePhone} IS NOT NULL AND ${contacts.mobilePhone} != '')`);
    }

    const eligibleContacts = await db.query.contacts.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit,
    });

    return eligibleContacts;
  }

  /**
   * Check if contact is on global or campaign-level suppression lists
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
