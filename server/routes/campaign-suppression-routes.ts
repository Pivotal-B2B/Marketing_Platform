import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  campaignSuppressionAccounts, 
  campaignSuppressionContacts,
  accounts,
  contacts,
  campaigns,
  insertCampaignSuppressionAccountSchema,
  insertCampaignSuppressionContactSchema,
  type CampaignSuppressionAccount,
  type CampaignSuppressionContact
} from '../../shared/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// ============================================================================
// CAMPAIGN SUPPRESSION - ACCOUNTS
// ============================================================================

/**
 * GET /api/campaigns/:campaignId/suppressions/accounts
 * List all suppressed accounts for a campaign with account details
 */
router.get('/:campaignId/suppressions/accounts', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { limit = '100', offset = '0' } = req.query;

    const suppressions = await db
      .select({
        id: campaignSuppressionAccounts.id,
        campaignId: campaignSuppressionAccounts.campaignId,
        accountId: campaignSuppressionAccounts.accountId,
        reason: campaignSuppressionAccounts.reason,
        addedBy: campaignSuppressionAccounts.addedBy,
        createdAt: campaignSuppressionAccounts.createdAt,
        accountName: accounts.name,
        accountDomain: accounts.domain,
        accountIndustry: accounts.industryStandardized,
      })
      .from(campaignSuppressionAccounts)
      .leftJoin(accounts, eq(campaignSuppressionAccounts.accountId, accounts.id))
      .where(eq(campaignSuppressionAccounts.campaignId, campaignId))
      .orderBy(campaignSuppressionAccounts.createdAt)
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaignSuppressionAccounts)
      .where(eq(campaignSuppressionAccounts.campaignId, campaignId));

    res.json({
      data: suppressions,
      total: count,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error fetching campaign account suppressions:', error);
    res.status(500).json({ error: 'Failed to fetch campaign account suppressions' });
  }
});

/**
 * POST /api/campaigns/:campaignId/suppressions/accounts
 * Add account(s) to campaign suppression list
 * Body: { accountIds: string[], reason?: string }
 */
router.post('/:campaignId/suppressions/accounts', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = (req as any).user?.id;
    
    const bodySchema = z.object({
      accountIds: z.array(z.string()).min(1),
      reason: z.string().optional(),
    });

    const { accountIds, reason } = bodySchema.parse(req.body);

    // Validate campaign exists
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Validate accounts exist
    const existingAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(inArray(accounts.id, accountIds));

    if (existingAccounts.length !== accountIds.length) {
      return res.status(400).json({ error: 'One or more accounts not found' });
    }

    // Insert suppressions (ON CONFLICT DO NOTHING to handle duplicates gracefully)
    const suppressionsToInsert = accountIds.map(accountId => ({
      campaignId,
      accountId,
      reason: reason || 'Added via campaign suppression',
      addedBy: userId,
    }));

    const inserted = await db
      .insert(campaignSuppressionAccounts)
      .values(suppressionsToInsert)
      .onConflictDoNothing({
        target: [campaignSuppressionAccounts.campaignId, campaignSuppressionAccounts.accountId]
      })
      .returning();

    res.status(201).json({
      message: `Added ${inserted.length} account(s) to campaign suppression list`,
      added: inserted.length,
      skipped: accountIds.length - inserted.length,
      data: inserted,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error adding campaign account suppressions:', error);
    res.status(500).json({ error: 'Failed to add campaign account suppressions' });
  }
});

/**
 * DELETE /api/campaigns/:campaignId/suppressions/accounts/:id
 * Remove an account from campaign suppression list
 */
router.delete('/:campaignId/suppressions/accounts/:id', async (req: Request, res: Response) => {
  try {
    const { campaignId, id } = req.params;

    const deleted = await db
      .delete(campaignSuppressionAccounts)
      .where(
        and(
          eq(campaignSuppressionAccounts.id, id),
          eq(campaignSuppressionAccounts.campaignId, campaignId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Suppression record not found' });
    }

    res.status(200).json({ message: 'Account removed from campaign suppression list' });
  } catch (error) {
    console.error('Error deleting campaign account suppression:', error);
    res.status(500).json({ error: 'Failed to delete campaign account suppression' });
  }
});

/**
 * DELETE /api/campaigns/:campaignId/suppressions/accounts/bulk
 * Remove multiple accounts from campaign suppression list
 * Body: { ids: string[] }
 */
router.delete('/:campaignId/suppressions/accounts/bulk', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);

    const deleted = await db
      .delete(campaignSuppressionAccounts)
      .where(
        and(
          inArray(campaignSuppressionAccounts.id, ids),
          eq(campaignSuppressionAccounts.campaignId, campaignId)
        )
      )
      .returning();

    res.status(200).json({ 
      message: `Removed ${deleted.length} account(s) from campaign suppression list`,
      deleted: deleted.length 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error bulk deleting campaign account suppressions:', error);
    res.status(500).json({ error: 'Failed to bulk delete campaign account suppressions' });
  }
});

// ============================================================================
// CAMPAIGN SUPPRESSION - CONTACTS
// ============================================================================

/**
 * GET /api/campaigns/:campaignId/suppressions/contacts
 * List all suppressed contacts for a campaign with contact details
 */
router.get('/:campaignId/suppressions/contacts', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { limit = '100', offset = '0' } = req.query;

    const suppressions = await db
      .select({
        id: campaignSuppressionContacts.id,
        campaignId: campaignSuppressionContacts.campaignId,
        contactId: campaignSuppressionContacts.contactId,
        reason: campaignSuppressionContacts.reason,
        addedBy: campaignSuppressionContacts.addedBy,
        createdAt: campaignSuppressionContacts.createdAt,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
        contactPhone: contacts.directPhone,
        contactAccountId: contacts.accountId,
      })
      .from(campaignSuppressionContacts)
      .leftJoin(contacts, eq(campaignSuppressionContacts.contactId, contacts.id))
      .where(eq(campaignSuppressionContacts.campaignId, campaignId))
      .orderBy(campaignSuppressionContacts.createdAt)
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaignSuppressionContacts)
      .where(eq(campaignSuppressionContacts.campaignId, campaignId));

    res.json({
      data: suppressions,
      total: count,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error fetching campaign contact suppressions:', error);
    res.status(500).json({ error: 'Failed to fetch campaign contact suppressions' });
  }
});

/**
 * POST /api/campaigns/:campaignId/suppressions/contacts
 * Add contact(s) to campaign suppression list
 * Body: { contactIds: string[], reason?: string }
 */
router.post('/:campaignId/suppressions/contacts', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = (req as any).user?.id;
    
    const bodySchema = z.object({
      contactIds: z.array(z.string()).min(1),
      reason: z.string().optional(),
    });

    const { contactIds, reason } = bodySchema.parse(req.body);

    // Validate campaign exists
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Validate contacts exist
    const existingContacts = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(inArray(contacts.id, contactIds));

    if (existingContacts.length !== contactIds.length) {
      return res.status(400).json({ error: 'One or more contacts not found' });
    }

    // Insert suppressions (ON CONFLICT DO NOTHING to handle duplicates gracefully)
    const suppressionsToInsert = contactIds.map(contactId => ({
      campaignId,
      contactId,
      reason: reason || 'Added via campaign suppression',
      addedBy: userId,
    }));

    const inserted = await db
      .insert(campaignSuppressionContacts)
      .values(suppressionsToInsert)
      .onConflictDoNothing({
        target: [campaignSuppressionContacts.campaignId, campaignSuppressionContacts.contactId]
      })
      .returning();

    res.status(201).json({
      message: `Added ${inserted.length} contact(s) to campaign suppression list`,
      added: inserted.length,
      skipped: contactIds.length - inserted.length,
      data: inserted,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error adding campaign contact suppressions:', error);
    res.status(500).json({ error: 'Failed to add campaign contact suppressions' });
  }
});

/**
 * DELETE /api/campaigns/:campaignId/suppressions/contacts/:id
 * Remove a contact from campaign suppression list
 */
router.delete('/:campaignId/suppressions/contacts/:id', async (req: Request, res: Response) => {
  try {
    const { campaignId, id } = req.params;

    const deleted = await db
      .delete(campaignSuppressionContacts)
      .where(
        and(
          eq(campaignSuppressionContacts.id, id),
          eq(campaignSuppressionContacts.campaignId, campaignId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Suppression record not found' });
    }

    res.status(200).json({ message: 'Contact removed from campaign suppression list' });
  } catch (error) {
    console.error('Error deleting campaign contact suppression:', error);
    res.status(500).json({ error: 'Failed to delete campaign contact suppression' });
  }
});

/**
 * DELETE /api/campaigns/:campaignId/suppressions/contacts/bulk
 * Remove multiple contacts from campaign suppression list
 * Body: { ids: string[] }
 */
router.delete('/:campaignId/suppressions/contacts/bulk', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);

    const deleted = await db
      .delete(campaignSuppressionContacts)
      .where(
        and(
          inArray(campaignSuppressionContacts.id, ids),
          eq(campaignSuppressionContacts.campaignId, campaignId)
        )
      )
      .returning();

    res.status(200).json({ 
      message: `Removed ${deleted.length} contact(s) from campaign suppression list`,
      deleted: deleted.length 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error bulk deleting campaign contact suppressions:', error);
    res.status(500).json({ error: 'Failed to bulk delete campaign contact suppressions' });
  }
});

/**
 * GET /api/campaigns/:campaignId/suppressions/check
 * Check if specific accounts or contacts are suppressed for a campaign
 * Query: ?accountIds=id1,id2&contactIds=id3,id4
 */
router.get('/:campaignId/suppressions/check', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { accountIds, contactIds } = req.query;

    const result: {
      suppressedAccounts: string[];
      suppressedContacts: string[];
    } = {
      suppressedAccounts: [],
      suppressedContacts: [],
    };

    // Check account suppressions
    if (accountIds && typeof accountIds === 'string') {
      const accountIdArray = accountIds.split(',').filter(Boolean);
      if (accountIdArray.length > 0) {
        const suppressed = await db
          .select({ accountId: campaignSuppressionAccounts.accountId })
          .from(campaignSuppressionAccounts)
          .where(
            and(
              eq(campaignSuppressionAccounts.campaignId, campaignId),
              inArray(campaignSuppressionAccounts.accountId, accountIdArray)
            )
          );
        result.suppressedAccounts = suppressed.map(s => s.accountId);
      }
    }

    // Check contact suppressions
    if (contactIds && typeof contactIds === 'string') {
      const contactIdArray = contactIds.split(',').filter(Boolean);
      if (contactIdArray.length > 0) {
        const suppressed = await db
          .select({ contactId: campaignSuppressionContacts.contactId })
          .from(campaignSuppressionContacts)
          .where(
            and(
              eq(campaignSuppressionContacts.campaignId, campaignId),
              inArray(campaignSuppressionContacts.contactId, contactIdArray)
            )
          );
        result.suppressedContacts = suppressed.map(s => s.contactId);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error checking campaign suppressions:', error);
    res.status(500).json({ error: 'Failed to check campaign suppressions' });
  }
});

export default router;
