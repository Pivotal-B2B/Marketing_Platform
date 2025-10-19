import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { sql, and, eq, isNull, or, inArray, notInArray } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth';
import { requireFeatureFlag } from '../feature-flags';
import { z } from 'zod';
import { buildFilterQuery } from '../filter-builder';
import { contacts, campaigns, agentQueue, campaignAudienceSnapshots } from '@shared/schema';
import type { FilterGroup } from '@shared/filter-types';

const router = Router();

// Schema for a single filter condition
const filterConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: z.string(),
  value: z.any(),
});

// Schema for filter group (matches FilterGroup from @shared/filter-types)
const filterGroupSchema = z.object({
  logic: z.enum(['AND', 'OR']),
  conditions: z.array(filterConditionSchema),
});

// Schema for queue set request
const queueSetSchema = z.object({
  agent_id: z.string(),
  filters: filterGroupSchema.optional(),
  per_account_cap: z.number().int().positive().optional().nullable(),
  max_queue_size: z.number().int().positive().optional().nullable(),
  keep_in_progress: z.boolean().optional().default(false),
  dry_run: z.boolean().optional().default(false),
});

// Schema for queue clear request
const queueClearSchema = z.object({
  agent_id: z.string(),
});

/**
 * POST /api/campaigns/:campaignId/queues/set
 * Set Queue (Replace) - Clear agent's current queue and assign new contacts based on filters
 * 
 * Body:
 * - agent_id: string (required) - The agent whose queue to replace
 * - filters: object (optional) - Filter criteria
 *   - first_name_contains: string (optional) - Filter contacts by first name
 * - per_account_cap: number (optional) - Max contacts per account
 * - max_queue_size: number (optional) - Max total queue size
 * - keep_in_progress: boolean (optional, default: true) - Keep in_progress items
 * - dry_run: boolean (optional, default: false) - Preview mode without changes
 * 
 * Returns:
 * - released: number - Count of released queue items
 * - assigned: number - Count of newly assigned contacts
 * - skipped_due_to_collision: number - Count of contacts already assigned to other agents
 */
router.post(
  '/campaigns/:campaignId/queues/set',
  requireAuth,
  requireFeatureFlag('queue_replace_v1'),
  async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.campaignId;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'unauthorized', message: 'User not authenticated' });
      }

      // Validate request body
      const validation = queueSetSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'validation_error', 
          details: validation.error.errors 
        });
      }

      const {
        agent_id,
        filters,
        per_account_cap = null,
        max_queue_size = null,
        keep_in_progress = true,
        dry_run = false,
      } = validation.data;

      // RBAC: Agents can only manage their own queue, Managers/Admins can manage any agent's queue
      const userRoles = req.user?.roles || [req.user?.role];
      const isAdminOrManager = userRoles.includes('admin') || userRoles.includes('campaign_manager');
      
      if (!isAdminOrManager && agent_id !== userId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'You can only manage your own queue' 
        });
      }

      // Dry run mode: preview without making changes
      if (dry_run) {
        // TODO: Implement dry-run preview by running the query in a rolled-back transaction
        // For now, return a placeholder response
        return res.json({
          preview_only: true,
          note: 'Dry-run preview mode - implement by running query in rolled-back transaction',
          released: 0,
          assigned: 0,
          skipped_due_to_collision: 0,
        });
      }

      // Execute queue replacement using filter system
      const result = await db.transaction(async (tx) => {
        // Step 1: Release existing queued/locked items (keep in_progress if requested)
        const releaseConditions = [
          eq(agentQueue.agentId, agent_id),
          eq(agentQueue.campaignId, campaignId),
        ];
        
        if (keep_in_progress) {
          releaseConditions.push(
            or(
              eq(agentQueue.queueState, 'queued'),
              eq(agentQueue.queueState, 'locked')
            )!
          );
        }

        const releaseResult = await tx.delete(agentQueue)
          .where(and(...releaseConditions))
          .returning();
        
        const released = releaseResult.length;

        // Step 2: Get campaign audience snapshot to find eligible contact IDs
        const snapshot = await tx.select({
          contactIds: campaignAudienceSnapshots.contactIds,
        })
        .from(campaignAudienceSnapshots)
        .where(eq(campaignAudienceSnapshots.campaignId, campaignId))
        .orderBy(sql`${campaignAudienceSnapshots.createdAt} DESC`)
        .limit(1);

        const campaignContactIds = snapshot[0]?.contactIds || [];
        
        if (campaignContactIds.length === 0) {
          return {
            released,
            assigned: 0,
            skipped_due_to_collision: 0,
          };
        }

        // Step 3: Query contacts based on filters
        const whereConditions = [
          inArray(contacts.id, campaignContactIds),
        ];
        
        if (filters && filters.conditions && filters.conditions.length > 0) {
          const filterSQL = buildFilterQuery(filters as FilterGroup, contacts);
          if (filterSQL) {
            whereConditions.push(filterSQL);
          }
        }

        let eligibleContacts;

        // Apply per-account cap if specified
        if (per_account_cap) {
          // Use window function to limit contacts per account
          const filterPart = filters && filters.conditions && filters.conditions.length > 0 
            ? buildFilterQuery(filters as FilterGroup, contacts) 
            : undefined;
          
          const baseQuery = max_queue_size
            ? sql`
                SELECT id, account_id
                FROM (
                  SELECT 
                    c.id,
                    c.account_id,
                    ROW_NUMBER() OVER (PARTITION BY c.account_id ORDER BY c.id) as rn
                  FROM ${contacts} c
                  WHERE 
                    c.id = ANY(${campaignContactIds})
                    ${filterPart ? sql`AND ${filterPart}` : sql``}
                ) t
                WHERE rn <= ${per_account_cap}
                ORDER BY id
                LIMIT ${max_queue_size}
              `
            : sql`
                SELECT id, account_id
                FROM (
                  SELECT 
                    c.id,
                    c.account_id,
                    ROW_NUMBER() OVER (PARTITION BY c.account_id ORDER BY c.id) as rn
                  FROM ${contacts} c
                  WHERE 
                    c.id = ANY(${campaignContactIds})
                    ${filterPart ? sql`AND ${filterPart}` : sql``}
                ) t
                WHERE rn <= ${per_account_cap}
                ORDER BY id
              `;
          
          const queryResult = await tx.execute(baseQuery);
          eligibleContacts = queryResult.rows.map((row: any) => ({
            id: row.id,
            accountId: row.account_id,
          }));
        } else {
          // Simple query without per-account cap
          let query = tx.select({
            id: contacts.id,
            accountId: contacts.accountId,
          })
          .from(contacts)
          .where(and(...whereConditions))
          .orderBy(contacts.id);

          eligibleContacts = max_queue_size 
            ? await query.limit(max_queue_size)
            : await query;
        }

        // Step 4: Filter out contacts already assigned to other agents (collision prevention)
        const contactIds = eligibleContacts.map(c => c.id);
        
        console.log('[queues:set] Step 4 - Eligible contacts:', contactIds.length);
        
        if (contactIds.length === 0) {
          console.log('[queues:set] No eligible contacts found');
          return {
            released,
            assigned: 0,
            skipped_due_to_collision: 0,
          };
        }

        const existingAssignments = await tx.select({
          contactId: agentQueue.contactId,
        })
        .from(agentQueue)
        .where(
          and(
            eq(agentQueue.campaignId, campaignId),
            inArray(agentQueue.contactId, contactIds),
            // Only check active states - released/completed contacts can be reassigned
            or(
              eq(agentQueue.queueState, 'queued'),
              eq(agentQueue.queueState, 'locked'),
              eq(agentQueue.queueState, 'in_progress')
            )
          )
        );

        console.log('[queues:set] Existing assignments in campaign:', existingAssignments.length);

        const assignedContactIds = new Set(existingAssignments.map(a => a.contactId));
        const availableContacts = eligibleContacts.filter(c => !assignedContactIds.has(c.id));
        const skipped = contactIds.length - availableContacts.length;

        console.log('[queues:set] Available contacts after collision check:', availableContacts.length);
        console.log('[queues:set] Skipped due to collision:', skipped);

        // Step 5: Assign available contacts to agent
        if (availableContacts.length > 0) {
          console.log('[queues:set] Inserting', availableContacts.length, 'contacts for agent', agent_id);
          await tx.insert(agentQueue)
            .values(
              availableContacts.map(contact => ({
                campaignId,
                agentId: agent_id,
                contactId: contact.id,
                accountId: contact.accountId,
                queueState: 'queued' as const,
                queuedAt: new Date(),
                createdBy: userId,
              }))
            );
          console.log('[queues:set] Successfully inserted contacts');
        }

        return {
          released,
          assigned: availableContacts.length,
          skipped_due_to_collision: skipped,
        };
      });

      return res.json(result);
    } catch (error: any) {
      console.error('[queues:set] Error:', error);
      return res.status(500).json({ 
        error: 'queue_replace_failed', 
        message: error.message 
      });
    }
  }
);

/**
 * POST /api/campaigns/:campaignId/queues/clear
 * Clear My Queue - Release agent's queued/locked items for this campaign
 * 
 * Body:
 * - agent_id: string (required) - The agent whose queue to clear
 * 
 * Returns:
 * - released: number - Count of released queue items
 */
router.post(
  '/campaigns/:campaignId/queues/clear',
  requireAuth,
  requireFeatureFlag('queue_replace_v1'),
  async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.campaignId;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'unauthorized', message: 'User not authenticated' });
      }

      // Validate request body
      const validation = queueClearSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'validation_error', 
          details: validation.error.errors 
        });
      }

      const { agent_id } = validation.data;

      // RBAC: Agents can only clear their own queue
      const userRoles = req.user?.roles || [req.user?.role];
      const isAdminOrManager = userRoles.includes('admin') || userRoles.includes('campaign_manager');
      
      if (!isAdminOrManager && agent_id !== userId) {
        return res.status(403).json({ 
          error: 'forbidden', 
          message: 'You can only clear your own queue' 
        });
      }

      // Call the PostgreSQL function
      const result = await db.execute(sql`
        SELECT clear_my_queue(
          ${campaignId}::varchar,
          ${agent_id}::varchar,
          ${userId}::varchar
        ) AS released
      `);

      const released = result.rows[0]?.released || 0;

      return res.json({ released });
    } catch (error: any) {
      console.error('[queues:clear] Error:', error);
      return res.status(500).json({ 
        error: 'clear_my_queue_failed', 
        message: error.message 
      });
    }
  }
);

/**
 * POST /api/campaigns/:campaignId/queues/clear_all
 * Clear All Queues (Admin Only) - Release all queued/locked items in this campaign
 * 
 * Returns:
 * - released: number - Count of released queue items across all agents
 */
router.post(
  '/campaigns/:campaignId/queues/clear_all',
  requireAuth,
  requireRole('admin', 'campaign_manager'),
  requireFeatureFlag('queue_replace_v1'),
  async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.campaignId;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'unauthorized', message: 'User not authenticated' });
      }

      // Call the PostgreSQL function
      const result = await db.execute(sql`
        SELECT clear_all_queues(
          ${campaignId}::varchar,
          ${userId}::varchar
        ) AS released
      `);

      const released = result.rows[0]?.released || 0;

      return res.json({ released });
    } catch (error: any) {
      console.error('[queues:clear_all] Error:', error);
      return res.status(500).json({ 
        error: 'clear_all_queues_failed', 
        message: error.message 
      });
    }
  }
);

/**
 * GET /api/campaigns/:campaignId/queues/stats
 * Get Queue Statistics - Get current queue stats for the campaign
 * 
 * Query params:
 * - agent_id: string (optional) - Filter by specific agent
 * 
 * Returns:
 * - total: number - Total queue items
 * - queued: number - Items in queued state
 * - locked: number - Items in locked state
 * - in_progress: number - Items in in_progress state
 * - released: number - Items in released state
 */
router.get(
  '/campaigns/:campaignId/queues/stats',
  requireAuth,
  requireFeatureFlag('queue_replace_v1'),
  async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.campaignId;
      const agentId = req.query.agent_id as string | undefined;

      let query = sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE queue_state = 'queued') as queued,
          COUNT(*) FILTER (WHERE queue_state = 'locked') as locked,
          COUNT(*) FILTER (WHERE queue_state = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE queue_state = 'released') as released
        FROM agent_queue
        WHERE campaign_id = ${campaignId}::varchar
      `;

      if (agentId) {
        query = sql`
          SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE queue_state = 'queued') as queued,
            COUNT(*) FILTER (WHERE queue_state = 'locked') as locked,
            COUNT(*) FILTER (WHERE queue_state = 'in_progress') as in_progress,
            COUNT(*) FILTER (WHERE queue_state = 'released') as released
          FROM agent_queue
          WHERE campaign_id = ${campaignId}::varchar AND agent_id = ${agentId}::varchar
        `;
      }

      const result = await db.execute(query);
      const stats = result.rows[0] || { total: 0, queued: 0, locked: 0, in_progress: 0, released: 0 };

      return res.json(stats);
    } catch (error: any) {
      console.error('[queues:stats] Error:', error);
      return res.status(500).json({ 
        error: 'queue_stats_failed', 
        message: error.message 
      });
    }
  }
);

export default router;
