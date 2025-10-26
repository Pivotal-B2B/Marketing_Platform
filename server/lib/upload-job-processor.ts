/**
 * CSV Upload Job Processor
 * Handles background processing of CSV uploads for validation results and submissions
 */

import { db } from "../db";
import { 
  verificationUploadJobs, 
  verificationContacts, 
  verificationLeadSubmissions,
  verificationCampaigns 
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import Papa from "papaparse";

interface UploadJobError {
  row: number;
  message: string;
}

/**
 * Process a CSV upload job
 */
export async function processUploadJob(jobId: string) {
  console.log(`[UPLOAD JOB] ===== STARTING JOB ${jobId} =====`);
  console.log(`[UPLOAD JOB] Function called at: ${new Date().toISOString()}`);

  try {
    // Fetch the job
    const [job] = await db
      .select()
      .from(verificationUploadJobs)
      .where(eq(verificationUploadJobs.id, jobId));

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    console.log(`[UPLOAD JOB] Job ${jobId} fetched successfully: ${job.jobType}, status: ${job.status}`);

    // Skip if already completed or failed
    if (job.status === 'completed' || job.status === 'failed') {
      console.log(`[UPLOAD JOB] Job ${jobId} already ${job.status}, skipping`);
      return;
    }

    // Mark as processing
    await db
      .update(verificationUploadJobs)
      .set({
        status: 'processing',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(verificationUploadJobs.id, jobId));

    console.log(`[UPLOAD JOB] Job ${jobId} marked as processing`);

    if (!job.csvData) {
      throw new Error('No CSV data provided');
    }

    // Parse CSV
    const parseResult = Papa.parse(job.csvData, {
      header: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing failed: ${parseResult.errors.map(e => e.message).join(', ')}`);
    }

    const rows = parseResult.data as Array<Record<string, string>>;
    console.log(`[UPLOAD JOB] Job ${jobId}: Parsed ${rows.length} rows`);

    // Update total rows
    await db
      .update(verificationUploadJobs)
      .set({
        totalRows: rows.length,
        updatedAt: new Date(),
      })
      .where(eq(verificationUploadJobs.id, jobId));

    // Process based on job type
    if (job.jobType === 'validation_results') {
      await processValidationResults(jobId, job.campaignId, rows);
    } else if (job.jobType === 'submissions') {
      await processSubmissions(jobId, job.campaignId, rows);
    } else {
      throw new Error(`Unknown job type: ${job.jobType}`);
    }

    // Mark as completed
    await db
      .update(verificationUploadJobs)
      .set({
        status: 'completed',
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(verificationUploadJobs.id, jobId));

    console.log(`[UPLOAD JOB] Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`[UPLOAD JOB] Job ${jobId} failed:`, error);

    // Mark as failed
    await db
      .update(verificationUploadJobs)
      .set({
        status: 'failed',
        errors: [{
          row: 0,
          message: error instanceof Error ? error.message : String(error)
        }],
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(verificationUploadJobs.id, jobId))
      .catch(err => console.error(`[UPLOAD JOB] Failed to update job status:`, err));
  }
}

/**
 * Process validation results upload
 */
async function processValidationResults(
  jobId: string,
  campaignId: string,
  rows: Array<Record<string, string>>
) {
  console.log(`[UPLOAD JOB] Processing validation results for ${rows.length} rows`);

  const errors: UploadJobError[] = [];
  let successCount = 0;
  let processedCount = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    for (let batchIdx = 0; batchIdx < batch.length; batchIdx++) {
      const row = batch[batchIdx];
      const rowNum = i + batchIdx + 1;
      processedCount++;

      try {
        const email = (row.email || row.Email)?.trim().toLowerCase();
        const emailStatus = (row.emailStatus || row['Email Status'] || row.email_status)?.trim().toLowerCase();

        if (!email) {
          errors.push({ row: rowNum, message: 'Missing email' });
          continue;
        }

        if (!emailStatus) {
          errors.push({ row: rowNum, message: 'Missing emailStatus' });
          continue;
        }

        // Normalize email status to valid enum values
        let normalizedStatus: 'ok' | 'invalid' | 'risky' | 'unknown' | 'accept_all' | 'disposable' = 'unknown';
        if (emailStatus === 'valid' || emailStatus === 'deliverable' || emailStatus === 'ok') {
          normalizedStatus = 'ok';
        } else if (emailStatus === 'invalid' || emailStatus === 'undeliverable') {
          normalizedStatus = 'invalid';
        } else if (emailStatus === 'risky') {
          normalizedStatus = 'risky';
        } else if (emailStatus === 'accept_all') {
          normalizedStatus = 'accept_all';
        } else if (emailStatus === 'disposable') {
          normalizedStatus = 'disposable';
        }

        // Update matching contacts
        const result = await db
          .update(verificationContacts)
          .set({
            emailStatus: normalizedStatus,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(verificationContacts.campaignId, campaignId),
              eq(sql`LOWER(${verificationContacts.email})`, email)
            )
          )
          .returning({ id: verificationContacts.id });

        if (result.length > 0) {
          successCount++;
        } else {
          errors.push({ row: rowNum, message: `No matching contact found for email: ${email}` });
        }
      } catch (error) {
        errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : String(error)
        });
      }

      // Update progress every 10 rows
      if (processedCount % 10 === 0) {
        await db
          .update(verificationUploadJobs)
          .set({
            processedRows: processedCount,
            successCount,
            errorCount: errors.length,
            errors: errors.slice(-100), // Keep last 100 errors
            updatedAt: new Date(),
          })
          .where(eq(verificationUploadJobs.id, jobId));

        console.log(`[UPLOAD JOB] Progress: ${processedCount}/${rows.length} rows processed`);
      }
    }
  }

  // Final update
  await db
    .update(verificationUploadJobs)
    .set({
      processedRows: processedCount,
      successCount,
      errorCount: errors.length,
      errors: errors.slice(-100),
      updatedAt: new Date(),
    })
    .where(eq(verificationUploadJobs.id, jobId));

  console.log(`[UPLOAD JOB] Validation results completed: ${successCount} success, ${errors.length} errors`);
}

/**
 * Process submissions upload
 */
async function processSubmissions(
  jobId: string,
  campaignId: string,
  rows: Array<Record<string, string>>
) {
  console.log(`[UPLOAD JOB] Processing submissions for ${rows.length} rows`);

  const errors: UploadJobError[] = [];
  let successCount = 0;
  let processedCount = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    for (let batchIdx = 0; batchIdx < batch.length; batchIdx++) {
      const row = batch[batchIdx];
      const rowNum = i + batchIdx + 1;
      processedCount++;

      try {
        const email = (row.email || row.Email)?.trim().toLowerCase();
        const contactId = row.contact_id || row.contactId || row['Contact ID'];
        const submittedAt = row.submitted_at || row.submittedAt || row['Submitted At'];

        let targetContactId: string | null = null;

        // Find contact by ID or email
        if (contactId) {
          targetContactId = contactId;
        } else if (email) {
          const [contact] = await db
            .select({ id: verificationContacts.id, accountId: verificationContacts.accountId })
            .from(verificationContacts)
            .where(
              and(
                eq(verificationContacts.campaignId, campaignId),
                eq(sql`LOWER(${verificationContacts.email})`, email)
              )
            )
            .limit(1);

          if (contact) {
            targetContactId = contact.id;
          }
        }

        if (!targetContactId) {
          errors.push({ row: rowNum, message: `No matching contact found` });
          continue;
        }

        // Get account ID for the contact
        const [contact] = await db
          .select({ accountId: verificationContacts.accountId })
          .from(verificationContacts)
          .where(eq(verificationContacts.id, targetContactId))
          .limit(1);

        // Insert submission record (idempotent - conflict do nothing)
        await db
          .insert(verificationLeadSubmissions)
          .values({
            contactId: targetContactId,
            accountId: contact?.accountId || null,
            campaignId,
            createdAt: submittedAt ? new Date(submittedAt) : new Date(),
          })
          .onConflictDoNothing();

        successCount++;
      } catch (error) {
        errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : String(error)
        });
      }

      // Update progress every 10 rows
      if (processedCount % 10 === 0) {
        await db
          .update(verificationUploadJobs)
          .set({
            processedRows: processedCount,
            successCount,
            errorCount: errors.length,
            errors: errors.slice(-100),
            updatedAt: new Date(),
          })
          .where(eq(verificationUploadJobs.id, jobId));

        console.log(`[UPLOAD JOB] Progress: ${processedCount}/${rows.length} rows processed`);
      }
    }
  }

  // Final update
  await db
    .update(verificationUploadJobs)
    .set({
      processedRows: processedCount,
      successCount,
      errorCount: errors.length,
      errors: errors.slice(-100),
      updatedAt: new Date(),
    })
    .where(eq(verificationUploadJobs.id, jobId));

  console.log(`[UPLOAD JOB] Submissions completed: ${successCount} success, ${errors.length} errors`);
  
  // CRITICAL: Enforce 2-year submission exclusion after upload
  // This marks recently submitted contacts as Ineligible_Recently_Submitted
  if (successCount > 0) {
    console.log(`[UPLOAD JOB] Enforcing 2-year exclusion for campaign ${campaignId}...`);
    
    try {
      const { enforceSubmissionExclusion } = await import("./submission-exclusion");
      const exclusionStats = await enforceSubmissionExclusion(campaignId);
      
      console.log(`[UPLOAD JOB] ✅ Exclusion enforced:
        - Recently submitted (excluded): ${exclusionStats.excluded}
        - Old submissions (reactivated): ${exclusionStats.reactivated}
        - Total processed: ${exclusionStats.checked}`);
    } catch (error) {
      console.error(`[UPLOAD JOB] ⚠️ Failed to enforce submission exclusion:`, error);
      // Don't fail the entire job if exclusion enforcement fails
      // Admin can manually trigger enforcement later
    }
  }
}

/**
 * Resume all stuck upload jobs on server startup
 */
export async function resumeStuckUploadJobs() {
  try {
    console.log('[UPLOAD JOB RESUME] Checking for stuck upload jobs...');
    
    // Find jobs stuck in "processing" status for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const stuckJobs = await db
      .select()
      .from(verificationUploadJobs)
      .where(
        sql`${verificationUploadJobs.status} = 'processing' AND ${verificationUploadJobs.updatedAt} < ${fiveMinutesAgo}`
      );
    
    if (stuckJobs.length === 0) {
      console.log('[UPLOAD JOB RESUME] No stuck jobs found');
      return;
    }
    
    console.log(`[UPLOAD JOB RESUME] Found ${stuckJobs.length} stuck job(s), resuming...`);
    
    for (const job of stuckJobs) {
      console.log(`[UPLOAD JOB RESUME] Resuming job ${job.id} (type: ${job.jobType}, processed: ${job.processedRows}/${job.totalRows})`);
      
      setImmediate(async () => {
        try {
          await processUploadJob(job.id);
        } catch (error) {
          console.error(`[UPLOAD JOB RESUME] Job ${job.id} failed during resume:`, error);
        }
      });
    }
    
    console.log(`[UPLOAD JOB RESUME] All ${stuckJobs.length} job(s) queued for resumption`);
  } catch (error) {
    console.error('[UPLOAD JOB RESUME] Error checking for stuck jobs:', error);
  }
}
