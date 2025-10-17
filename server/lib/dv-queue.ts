import cron from 'node-cron';
import { db } from '../db';
import { dvRecords, dvRecordsRaw, dvFieldMappings, dvProjects, dvExclusionLists, type DvRecord } from '@shared/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { generateDedupeHash } from './dv-dedupe';
import { parsePhone } from './dv-phone';
import { validateEmail } from './dv-email-validation';

export type JobStage = 'normalize' | 'tier1_email' | 'phone_parse' | 'apply_exclusions' | 'enqueue';

interface JobContext {
  projectId: string;
  batchSize?: number;
}

/**
 * Check if job has been processed (using database state instead of in-memory)
 */
async function isProcessed(recordId: string, stage: JobStage): Promise<boolean> {
  // Check record status to determine if stage is already processed
  const [record] = await db.select()
    .from(dvRecords)
    .where(eq(dvRecords.id, recordId))
    .limit(1)
    .execute();
  
  if (!record) return false;
  
  // Determine if stage is already completed based on status
  switch (stage) {
    case 'normalize':
      return record.status !== 'new';
    case 'tier1_email':
      return record.status !== 'new';
    case 'phone_parse':
      return !!record.phoneE164;
    case 'enqueue':
      return record.status === 'in_queue' || record.status === 'in_progress';
    default:
      return false;
  }
}

/**
 * Normalize imports - create DvRecord from DvRecordRaw
 */
async function normalizeImports(ctx: JobContext): Promise<void> {
  const batchSize = ctx.batchSize || 50;
  
  // Get raw records that haven't been normalized yet
  const rawRecords = await db.select()
    .from(dvRecordsRaw)
    .where(eq(dvRecordsRaw.projectId, ctx.projectId))
    .limit(batchSize)
    .execute();
  
  // Get field mappings for project
  const mappings = await db.select()
    .from(dvFieldMappings)
    .where(eq(dvFieldMappings.projectId, ctx.projectId))
    .execute();
  
  // Build mapping map, prioritizing non-extras fields and higher confidence
  const mappingMap = new Map<string, string>();
  for (const m of mappings) {
    const existing = mappingMap.get(m.clientHeader);
    // Prioritize: specific field over extras, higher confidence over lower
    if (!existing || 
        (existing === 'extras' && m.crmField !== 'extras') ||
        (existing === 'extras' && m.crmField === 'extras' && m.confidence > 0)) {
      mappingMap.set(m.clientHeader, m.crmField);
    }
  }
  
  for (const raw of rawRecords) {
    const payload = raw.payload as any;
    const normalized: any = {
      projectId: ctx.projectId,
      extras: {},
    };
    
    // Map fields
    for (const [clientHeader, crmField] of Array.from(mappingMap.entries())) {
      if (payload[clientHeader]) {
        // If mapped to "extras", store in the extras JSON object
        if (crmField === 'extras') {
          normalized.extras[clientHeader] = payload[clientHeader];
        } else {
          normalized[crmField] = payload[clientHeader];
        }
      }
    }
    
    // Generate dedupe hash (use raw.id as fallback if no identifying fields)
    normalized.dedupeHash = generateDedupeHash(
      normalized.email,
      normalized.accountDomain,
      normalized.contactFullName,
      normalized.phoneRaw,
      raw.id // fallback ID to prevent false duplicates
    );
    
    // Check if this specific record (by dedupe hash) already exists
    const [duplicate] = await db.select()
      .from(dvRecords)
      .where(
        and(
          eq(dvRecords.projectId, ctx.projectId),
          eq(dvRecords.dedupeHash, normalized.dedupeHash)
        )
      )
      .limit(1)
      .execute();
    
    // Skip if duplicate exists, but still delete raw record
    if (duplicate) {
      await db.delete(dvRecordsRaw).where(eq(dvRecordsRaw.id, raw.id)).execute();
      continue;
    }
    
    normalized.status = 'new';
    normalized.normalizedAt = new Date();
    
    // Use transaction to ensure atomicity of insert + delete
    await db.transaction(async (tx) => {
      // Insert normalized record
      await tx.insert(dvRecords).values(normalized).execute();
      
      // Delete raw record only after successful insert
      await tx.delete(dvRecordsRaw).where(eq(dvRecordsRaw.id, raw.id)).execute();
    });
  }
}

/**
 * Tier-1 email validation
 */
async function tier1EmailChecks(ctx: JobContext): Promise<void> {
  const batchSize = ctx.batchSize || 50;
  
  const records = await db.select()
    .from(dvRecords)
    .where(
      and(
        eq(dvRecords.projectId, ctx.projectId),
        eq(dvRecords.status, 'new')
      )
    )
    .limit(batchSize)
    .execute();
  
  for (const record of records) {
    if (!record.email || record.status !== 'new' || record.emailValidatedAt) continue;
    
    const validation = await validateEmail(record.email);
    
    if (!validation.syntax || !validation.mx) {
      await db.update(dvRecords)
        .set({
          status: 'invalid',
          invalidReason: `Email validation failed: ${!validation.syntax ? 'invalid syntax' : 'no MX records'}`,
          emailValidatedAt: new Date(),
        })
        .where(eq(dvRecords.id, record.id))
        .execute();
    } else {
      // Mark as validated even if passed
      await db.update(dvRecords)
        .set({ emailValidatedAt: new Date() })
        .where(eq(dvRecords.id, record.id))
        .execute();
    }
  }
}

/**
 * Phone parsing
 */
async function phoneParseJob(ctx: JobContext): Promise<void> {
  const batchSize = ctx.batchSize || 50;
  
  const records = await db.select()
    .from(dvRecords)
    .where(
      and(
        eq(dvRecords.projectId, ctx.projectId),
        inArray(dvRecords.status, ['new', 'in_queue'])
      )
    )
    .limit(batchSize)
    .execute();
  
  for (const record of records) {
    if (!record.phoneRaw || record.phoneE164 || record.phoneParsedAt) continue;
    
    const phoneResult = parsePhone(record.phoneRaw);
    
    if (phoneResult.isValid && phoneResult.e164) {
      await db.update(dvRecords)
        .set({
          phoneE164: phoneResult.e164,
          country: phoneResult.country || record.country,
          phoneParsedAt: new Date(),
        })
        .where(eq(dvRecords.id, record.id))
        .execute();
    } else {
      // Mark as parsed even if invalid
      await db.update(dvRecords)
        .set({ phoneParsedAt: new Date() })
        .where(eq(dvRecords.id, record.id))
        .execute();
    }
  }
}

/**
 * Apply exclusions
 */
async function applyExclusions(ctx: JobContext): Promise<void> {
  const batchSize = ctx.batchSize || 50;
  
  // Get records that haven't been checked for exclusions
  const records = await db.select()
    .from(dvRecords)
    .where(
      and(
        eq(dvRecords.projectId, ctx.projectId),
        eq(dvRecords.status, 'new'),
        isNull(dvRecords.exclusionCheckedAt)
      )
    )
    .limit(batchSize)
    .execute();
  
  // Get project to find client ID
  const [project] = await db.select()
    .from(dvProjects)
    .where(eq(dvProjects.id, ctx.projectId))
    .limit(1)
    .execute();
  
  if (!project) return;
  
  // Get all active exclusions for this client
  const exclusions = await db.select()
    .from(dvExclusionLists)
    .where(
      and(
        eq(dvExclusionLists.clientId, project.clientId),
        eq(dvExclusionLists.isActive, true)
      )
    )
    .execute();
  
  for (const record of records) {
    let isExcluded = false;
    let exclusionReason = null;
    
    // Check against each exclusion rule
    for (const exclusion of exclusions) {
      if (exclusion.type === 'email' && record.email) {
        const emailPattern = new RegExp(exclusion.pattern, 'i');
        if (emailPattern.test(record.email)) {
          isExcluded = true;
          exclusionReason = `Email matches exclusion: ${exclusion.pattern}`;
          break;
        }
      } else if (exclusion.type === 'domain' && record.accountDomain) {
        const domainPattern = new RegExp(exclusion.pattern, 'i');
        if (domainPattern.test(record.accountDomain)) {
          isExcluded = true;
          exclusionReason = `Domain matches exclusion: ${exclusion.pattern}`;
          break;
        }
      } else if (exclusion.type === 'phone' && record.phoneE164) {
        const phonePattern = new RegExp(exclusion.pattern);
        if (phonePattern.test(record.phoneE164)) {
          isExcluded = true;
          exclusionReason = `Phone matches exclusion: ${exclusion.pattern}`;
          break;
        }
      }
    }
    
    // Update record status
    if (isExcluded) {
      await db.update(dvRecords)
        .set({
          status: 'excluded',
          invalidReason: exclusionReason,
          exclusionCheckedAt: new Date(),
        })
        .where(eq(dvRecords.id, record.id))
        .execute();
    } else {
      // Mark as checked even if not excluded
      await db.update(dvRecords)
        .set({ exclusionCheckedAt: new Date() })
        .where(eq(dvRecords.id, record.id))
        .execute();
    }
  }
}

/**
 * Enqueue records for verification
 */
async function enqueueRecords(ctx: JobContext): Promise<void> {
  const batchSize = ctx.batchSize || 50;
  
  const records = await db.select()
    .from(dvRecords)
    .where(
      and(
        eq(dvRecords.projectId, ctx.projectId),
        eq(dvRecords.status, 'new')
      )
    )
    .limit(batchSize)
    .execute();
  
  for (const record of records) {
    if (record.status === 'in_queue' || record.status === 'in_progress' || record.enqueuedAt) continue;
    
    await db.update(dvRecords)
      .set({ 
        status: 'in_queue',
        enqueuedAt: new Date(),
      })
      .where(eq(dvRecords.id, record.id))
      .execute();
  }
}

/**
 * Job runners map
 */
const jobRunners: Record<JobStage, (ctx: JobContext) => Promise<void>> = {
  normalize: normalizeImports,
  tier1_email: tier1EmailChecks,
  phone_parse: phoneParseJob,
  apply_exclusions: applyExclusions,
  enqueue: enqueueRecords,
};

/**
 * Run a specific job stage
 */
export async function runJob(stage: JobStage, ctx: JobContext): Promise<void> {
  const runner = jobRunners[stage];
  if (runner) {
    await runner(ctx);
  }
}

/**
 * Start background job scheduler
 */
export function startJobScheduler(): void {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      // Get all active projects from database
      const activeProjects = await db.select({ id: dvProjects.id })
        .from(dvProjects)
        .where(eq(dvProjects.status, 'active'))
        .execute();
      
      for (const project of activeProjects) {
        const ctx: JobContext = { projectId: project.id, batchSize: 50 };
        
        // Run jobs in sequence
        await runJob('normalize', ctx);
        await runJob('tier1_email', ctx);
        await runJob('phone_parse', ctx);
        await runJob('apply_exclusions', ctx);
        await runJob('enqueue', ctx);
      }
    } catch (error) {
      console.error('Job scheduler error:', error);
    }
  });
  
  console.log('DV job scheduler started - checking active projects every minute');
}

