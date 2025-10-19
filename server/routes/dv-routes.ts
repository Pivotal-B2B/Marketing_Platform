import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { 
  dvProjects, dvRecords, dvRecordsRaw, dvRuns, dvExclusionLists, 
  dvProjectExclusions, dvFieldMappings, dvFieldConstraints, dvDeliveries,
  dvProjectAgents, dvCompanyCaps, dvAccounts, dvSelectionSets,
  insertDvProjectSchema, insertDvExclusionListSchema, insertDvRunSchema,
  type DvRecord, type DvProject
} from '@shared/schema';
import { eq, and, inArray, sql, count } from 'drizzle-orm';
import { z } from 'zod';
import Papa from 'papaparse';
import { exportRecords, type ExportType } from '../lib/dv-export';
import { runJob } from '../lib/dv-queue';
import { generateDedupeHash } from '../lib/dv-dedupe';
import { checkExclusion, buildExclusionMap } from '../lib/dv-exclusion';
import { evaluateConstraints } from '../lib/dv-constraints';
import { requireAuth, requireRole } from '../auth';

const router = Router();

// ============================================================================
// PROJECTS
// ============================================================================

// GET /api/dv/projects - List projects with stats
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const projects = await db.select().from(dvProjects).execute();
    
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const stats = await db.select({
          total: count(),
          verified: sql<number>`count(*) filter (where status = 'verified')`,
          invalid: sql<number>`count(*) filter (where status = 'invalid')`,
          excluded: sql<number>`count(*) filter (where status = 'excluded')`,
          inQueue: sql<number>`count(*) filter (where status = 'in_queue')`,
        })
        .from(dvRecords)
        .where(eq(dvRecords.projectId, project.id))
        .execute();
        
        return {
          ...project,
          stats: stats[0] || { total: 0, verified: 0, invalid: 0, excluded: 0, inQueue: 0 },
        };
      })
    );
    
    res.json(projectsWithStats);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/dv/projects - Create project
router.post('/projects', async (req: Request, res: Response) => {
  try {
    const body = insertDvProjectSchema.parse(req.body);
    
    const [project] = await db.insert(dvProjects).values(body).returning().execute();
    
    // Attach exclusion lists if provided
    if (req.body.exclusionListIds && Array.isArray(req.body.exclusionListIds)) {
      const exclusions = req.body.exclusionListIds.map((listId: string) => ({
        projectId: project.id,
        listId,
      }));
      
      await db.insert(dvProjectExclusions).values(exclusions).execute();
    }
    
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(400).json({ error: 'Failed to create project' });
  }
});

// GET /api/dv/projects/:id - Get project details
router.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const [project] = await db.select()
      .from(dvProjects)
      .where(eq(dvProjects.id, req.params.id))
      .execute();
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const stats = await db.select({
      total: count(),
      verified: sql<number>`count(*) filter (where status = 'verified')`,
      invalid: sql<number>`count(*) filter (where status = 'invalid')`,
      excluded: sql<number>`count(*) filter (where status = 'excluded')`,
      inQueue: sql<number>`count(*) filter (where status = 'in_queue')`,
      inProgress: sql<number>`count(*) filter (where status = 'in_progress')`,
      needsFix: sql<number>`count(*) filter (where status = 'needs_fix')`,
    })
    .from(dvRecords)
    .where(eq(dvRecords.projectId, project.id))
    .execute();
    
    res.json({ ...project, stats: stats[0] });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PATCH /api/dv/projects/:id - Update project
router.patch('/projects/:id', async (req: Request, res: Response) => {
  try {
    const { status, capPerCompany, abvMode, defaultTargetPerAccount } = req.body;
    
    const updateData: any = {};
    if (status) updateData.status = status;
    if (capPerCompany !== undefined) updateData.capPerCompany = capPerCompany;
    if (abvMode !== undefined) updateData.abvMode = abvMode;
    if (defaultTargetPerAccount !== undefined) updateData.defaultTargetPerAccount = defaultTargetPerAccount;
    
    const [project] = await db.update(dvProjects)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(dvProjects.id, req.params.id))
      .returning()
      .execute();
    
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(400).json({ error: 'Failed to update project' });
  }
});

// ============================================================================
// FILE UPLOAD & MAPPING
// ============================================================================

// POST /api/dv/projects/:id/upload - Upload and sample CSV
router.post('/projects/:id/upload', async (req: Request, res: Response) => {
  try {
    const { csvData, fileName } = req.body;
    
    if (!csvData) {
      return res.status(400).json({ error: 'No CSV data provided' });
    }
    
    // Parse CSV
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    
    if (parsed.errors.length > 0) {
      return res.status(400).json({ error: 'CSV parsing failed', details: parsed.errors });
    }
    
    const headers = Object.keys(parsed.data[0] || {});
    const sample = parsed.data.slice(0, 500);
    
    // Insert raw records
    const rawRecords = sample.map((row: any, idx: number) => ({
      projectId: req.params.id,
      payload: row,
      sourceFile: fileName,
      rowNum: idx + 1,
    }));
    
    await db.insert(dvRecordsRaw).values(rawRecords).execute();
    
    // Suggest field mappings based on header names
    const mappingSuggestions = headers.map(header => {
      const lowerHeader = header.toLowerCase();
      let crmField = 'extras';
      let confidence = 0;
      
      // Contact fields
      if (lowerHeader.includes('email') && !lowerHeader.includes('domain')) {
        crmField = 'email';
        confidence = 0.95;
      } else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('tel')) {
        crmField = 'phoneRaw';
        confidence = 0.9;
      } else if (lowerHeader.includes('first') && lowerHeader.includes('name') || lowerHeader.includes('forename')) {
        crmField = 'firstName';
        confidence = 0.95;
      } else if (lowerHeader.includes('last') && lowerHeader.includes('name') || lowerHeader.includes('surname')) {
        crmField = 'lastName';
        confidence = 0.95;
      } else if (lowerHeader.includes('full name') || lowerHeader.includes('fullname')) {
        crmField = 'contactFullName';
        confidence = 0.95;
      } else if ((lowerHeader.includes('name') || lowerHeader.includes('contact')) && !lowerHeader.includes('company') && !lowerHeader.includes('account')) {
        crmField = 'contactFullName';
        confidence = 0.7;
      } else if (lowerHeader.includes('title') || lowerHeader.includes('job') || lowerHeader.includes('position')) {
        crmField = 'jobTitle';
        confidence = 0.85;
      } else if (lowerHeader.includes('linkedin') || lowerHeader.includes('li_url')) {
        crmField = 'linkedinUrl';
        confidence = 0.95;
      }
      // Account fields
      else if (lowerHeader.includes('company') || lowerHeader.includes('account') || lowerHeader.includes('organization')) {
        crmField = 'accountName';
        confidence = 0.85;
      } else if (lowerHeader.includes('domain') && !lowerHeader.includes('email')) {
        crmField = 'accountDomain';
        confidence = 0.95;
      } else if (lowerHeader.includes('website') || lowerHeader.includes('url')) {
        crmField = 'website';
        confidence = 0.9;
      }
      // Address fields
      else if (lowerHeader.includes('addr1') || lowerHeader.includes('address 1') || (lowerHeader.includes('address') && lowerHeader.includes('line') && lowerHeader.includes('1'))) {
        crmField = 'address1';
        confidence = 0.95;
      } else if (lowerHeader.includes('addr2') || lowerHeader.includes('address 2') || (lowerHeader.includes('address') && lowerHeader.includes('line') && lowerHeader.includes('2'))) {
        crmField = 'address2';
        confidence = 0.95;
      } else if (lowerHeader.includes('addr3') || lowerHeader.includes('address 3') || (lowerHeader.includes('address') && lowerHeader.includes('line') && lowerHeader.includes('3'))) {
        crmField = 'address3';
        confidence = 0.95;
      } else if (lowerHeader.includes('city') || lowerHeader.includes('town')) {
        crmField = 'city';
        confidence = 0.95;
      } else if (lowerHeader.includes('state') || lowerHeader.includes('province') || lowerHeader.includes('county')) {
        crmField = 'state';
        confidence = 0.95;
      } else if (lowerHeader.includes('country')) {
        crmField = 'country';
        confidence = 0.95;
      } else if (lowerHeader.includes('zip') || lowerHeader.includes('postal') || lowerHeader.includes('postcode')) {
        crmField = 'zip';
        confidence = 0.95;
      }
      
      return {
        clientHeader: header,
        crmField,
        confidence,
        required: ['email', 'phoneRaw'].includes(crmField),
      };
    });
    
    res.json({
      headers,
      sampleCount: sample.length,
      totalCount: parsed.data.length,
      mappingSuggestions,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// POST /api/dv/projects/:id/mappings - Confirm mappings
router.post('/projects/:id/mappings', async (req: Request, res: Response) => {
  try {
    const { mappings } = req.body;
    
    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: 'Invalid mappings format' });
    }
    
    const mappingRecords = mappings.map(m => ({
      projectId: req.params.id,
      clientHeader: m.clientHeader,
      crmField: m.crmField,
      confidence: m.confidence || 0,
      required: m.required || false,
    }));
    
    // Delete existing mappings first (allows re-mapping)
    await db.delete(dvFieldMappings)
      .where(eq(dvFieldMappings.projectId, req.params.id))
      .execute();
    
    // Insert new mappings
    await db.insert(dvFieldMappings).values(mappingRecords).execute();
    
    // Auto-start processing by setting status to 'active' (required for background scheduler)
    await db.update(dvProjects)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(dvProjects.id, req.params.id))
      .execute();
    
    res.json({ success: true, count: mappingRecords.length });
  } catch (error) {
    console.error('Error saving mappings:', error);
    res.status(500).json({ error: 'Failed to save mappings' });
  }
});

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

// POST /api/dv/projects/:id/queue/start - Start normalization
router.post('/projects/:id/queue/start', async (req: Request, res: Response) => {
  try {
    // Run normalization jobs
    await runJob('normalize', { projectId: req.params.id });
    await runJob('tier1_email', { projectId: req.params.id });
    await runJob('phone_parse', { projectId: req.params.id });
    await runJob('enqueue', { projectId: req.params.id });
    
    res.json({ success: true, message: 'Queue processing started' });
  } catch (error) {
    console.error('Error starting queue:', error);
    res.status(500).json({ error: 'Failed to start queue processing' });
  }
});

// GET /api/dv/queue/:projectId - Get agent queue
router.get('/queue/:projectId', async (req: Request, res: Response) => {
  try {
    const { agentId, limit = '50' } = req.query;
    const limitNum = parseInt(limit as string);
    
    let query = db.select()
      .from(dvRecords)
      .where(
        and(
          eq(dvRecords.projectId, req.params.projectId),
          inArray(dvRecords.status, ['in_queue', 'in_progress'])
        )
      )
      .limit(limitNum);
    
    const records = await query.execute();
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// PATCH /api/dv/records/:id - Update record fields
router.patch('/records/:id', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    const [record] = await db.update(dvRecords)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dvRecords.id, req.params.id))
      .returning()
      .execute();
    
    res.json(record);
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// ============================================================================
// VERIFICATION RUNS
// ============================================================================

// POST /api/dv/runs - Submit disposition
router.post('/runs', async (req: Request, res: Response) => {
  try {
    const runData = insertDvRunSchema.parse(req.body);
    
    // Create run record
    const [run] = await db.insert(dvRuns).values({
      ...runData,
      finishedAt: new Date(),
    }).returning().execute();
    
    // Update record status based on disposition
    let newStatus: DvRecord['status'] = 'verified';
    let invalidReason: string | null = null;
    let exclusionReason: string | null = null;
    
    switch (runData.disposition) {
      case 'Verified':
        newStatus = 'verified';
        
        // Increment company cap
        const record = await db.select()
          .from(dvRecords)
          .where(eq(dvRecords.id, runData.recordId))
          .execute();
        
        if (record[0]?.accountDomain) {
          const [cap] = await db.select()
            .from(dvCompanyCaps)
            .where(
              and(
                eq(dvCompanyCaps.projectId, runData.projectId),
                eq(dvCompanyCaps.accountDomain, record[0].accountDomain)
              )
            )
            .execute();
          
          if (cap) {
            await db.update(dvCompanyCaps)
              .set({ verifiedCount: cap.verifiedCount + 1 })
              .where(
                and(
                  eq(dvCompanyCaps.projectId, runData.projectId),
                  eq(dvCompanyCaps.accountDomain, record[0].accountDomain)
                )
              )
              .execute();
          } else {
            await db.insert(dvCompanyCaps).values({
              projectId: runData.projectId,
              accountDomain: record[0].accountDomain,
              verifiedCount: 1,
            }).execute();
          }
          
          // Check if cap reached
          const [project] = await db.select()
            .from(dvProjects)
            .where(eq(dvProjects.id, runData.projectId))
            .execute();
          
          if (project.capPerCompany > 0 && (cap?.verifiedCount ?? 0) + 1 >= project.capPerCompany) {
            // Auto-exclude remaining records for this domain
            await db.update(dvRecords)
              .set({
                status: 'excluded',
                exclusionReason: 'Company cap reached',
              })
              .where(
                and(
                  eq(dvRecords.projectId, runData.projectId),
                  eq(dvRecords.accountDomain, record[0].accountDomain),
                  inArray(dvRecords.status, ['in_queue', 'in_progress'])
                )
              )
              .execute();
          }
        }
        break;
        
      case 'InvalidEmail':
        newStatus = 'invalid';
        invalidReason = 'Invalid email';
        break;
        
      case 'ExcludedByRule':
        newStatus = 'excluded';
        exclusionReason = 'Excluded by rule';
        break;
        
      case 'NeedsManualReview':
        newStatus = 'needs_fix';
        break;
        
      default:
        newStatus = 'in_progress';
    }
    
    await db.update(dvRecords)
      .set({
        status: newStatus,
        invalidReason,
        exclusionReason,
      })
      .where(eq(dvRecords.id, runData.recordId))
      .execute();
    
    res.status(201).json(run);
  } catch (error) {
    console.error('Error creating run:', error);
    res.status(400).json({ error: 'Failed to create run' });
  }
});

// ============================================================================
// EXCLUSIONS
// ============================================================================

// GET /api/dv/exclusions - List exclusion lists
router.get('/exclusions', async (req: Request, res: Response) => {
  try {
    const { scope, clientId } = req.query;
    
    const conditions: any[] = [];
    
    if (scope) {
      conditions.push(eq(dvExclusionLists.scope, scope as any));
    }
    
    if (clientId) {
      conditions.push(eq(dvExclusionLists.clientId, clientId as string));
    }
    
    const lists = conditions.length > 0
      ? await db.select().from(dvExclusionLists).where(and(...conditions)).execute()
      : await db.select().from(dvExclusionLists).execute();
    
    res.json(lists);
  } catch (error) {
    console.error('Error fetching exclusion lists:', error);
    res.status(500).json({ error: 'Failed to fetch exclusion lists' });
  }
});

// POST /api/dv/exclusions - Create exclusion list
router.post('/exclusions', async (req: Request, res: Response) => {
  try {
    const data = insertDvExclusionListSchema.parse(req.body);
    
    const [list] = await db.insert(dvExclusionLists).values(data).returning().execute();
    
    res.status(201).json(list);
  } catch (error) {
    console.error('Error creating exclusion list:', error);
    res.status(400).json({ error: 'Failed to create exclusion list' });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

// POST /api/dv/projects/:id/export - Generate export (RBAC: No agents)
router.post('/projects/:id/export', requireAuth, requireRole('admin', 'campaign_manager', 'quality_analyst'), async (req: Request, res: Response) => {
  try {
    const { type, filter, fields } = req.body;
    
    const result = await exportRecords({
      projectId: req.params.id,
      type: type as ExportType,
      filter,
      fields,
    });
    
    // Record delivery
    await db.insert(dvDeliveries).values({
      projectId: req.params.id,
      type,
      filter,
      rowCount: result.rowCount,
      filePath: result.filePath,
      createdBy: req.body.userId,
    }).execute();
    
    res.json(result);
  } catch (error) {
    console.error('Error generating export:', error);
    res.status(500).json({ error: 'Failed to generate export' });
  }
});

// GET /api/dv/deliveries/:deliveryId - Download export (RBAC: No agents)
router.get('/deliveries/:deliveryId', requireAuth, requireRole('admin', 'campaign_manager', 'quality_analyst'), async (req: Request, res: Response) => {
  try {
    const [delivery] = await db.select()
      .from(dvDeliveries)
      .where(eq(dvDeliveries.id, req.params.deliveryId))
      .execute();
    
    if (!delivery || !delivery.filePath) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    res.download(delivery.filePath);
  } catch (error) {
    console.error('Error downloading delivery:', error);
    res.status(500).json({ error: 'Failed to download delivery' });
  }
});

// ============================================================================
// ABV (Account-Based Verification) ROUTES
// ============================================================================

// GET /api/dv/projects/:id/accounts - List accounts with progress
router.get('/projects/:id/accounts', async (req: Request, res: Response) => {
  try {
    const accounts = await db.select({
      id: dvAccounts.id,
      name: dvAccounts.accountName,
      domain: dvAccounts.accountDomain,
      target: dvAccounts.targetContacts,
      verified: dvAccounts.verifiedCount,
      status: dvAccounts.status,
      pending: sql<number>`(select count(*) from ${dvRecords} where account_id = ${dvAccounts.id} and status in ('in_queue', 'in_progress'))`,
    })
    .from(dvAccounts)
    .where(eq(dvAccounts.projectId, req.params.id))
    .execute();
    
    res.json({ items: accounts, total: accounts.length });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// GET /api/dv/projects/:id/accounts/:accountId - Get account detail
router.get('/projects/:id/accounts/:accountId', async (req: Request, res: Response) => {
  try {
    const [account] = await db.select()
      .from(dvAccounts)
      .where(eq(dvAccounts.id, req.params.accountId))
      .execute();
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const contacts = await db.select()
      .from(dvRecords)
      .where(eq(dvRecords.accountId, req.params.accountId))
      .execute();
    
    res.json({ ...account, contacts });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

export default router;
