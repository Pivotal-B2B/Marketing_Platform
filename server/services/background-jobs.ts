/**
 * Background Jobs Scheduler
 * Runs AI-powered QA processing tasks and queue maintenance at regular intervals
 */

import { processPendingTranscriptions } from './assemblyai-transcription';
import { processUnanalyzedLeads } from './ai-qa-analyzer';
import { startEmailValidationJob } from '../jobs/email-validation-job';
import { startAiEnrichmentJob } from '../jobs/ai-enrichment-job';
import { db } from '../db';
import { agentQueue, campaignQueue } from '@shared/schema';
import { eq, lt, and, inArray, sql } from 'drizzle-orm';
import cron from 'node-cron';

// Job intervals (in milliseconds) - reduced frequency to minimize connections
const TRANSCRIPTION_JOB_INTERVAL = 60000; // Every 60 seconds (was 30s)
const AI_ANALYSIS_JOB_INTERVAL = 90000; // Every 90 seconds (was 45s)
const LOCK_SWEEPER_INTERVAL = 600000; // Every 10 minutes (was 5 min)

let transcriptionInterval: NodeJS.Timeout | null = null;
let analysisInterval: NodeJS.Timeout | null = null;
let lockSweeperInterval: NodeJS.Timeout | null = null;

// Execution guards to prevent overlapping runs
let isTranscriptionRunning = false;
let isAnalysisRunning = false;
let isLockSweeperRunning = false;

// Configuration flags for disabling background jobs
const ENABLE_TRANSCRIPTION = process.env.ENABLE_TRANSCRIPTION_JOB !== 'false';
const ENABLE_AI_ANALYSIS = process.env.ENABLE_AI_ANALYSIS_JOB !== 'false';
const ENABLE_LOCK_SWEEPER = process.env.ENABLE_LOCK_SWEEPER !== 'false';

/**
 * Lock Sweeper - Release expired locks and stuck queue entries
 */
async function sweepExpiredLocks() {
  try {
    // 1. Release expired locks in agent_queue (manual dial)
    const releasedAgentLocks = await db.update(agentQueue)
      .set({
        queueState: 'queued',
        lockedBy: null,
        lockedAt: null,
        lockExpiresAt: null,
        updatedAt: new Date()
      })
      .where(and(
        eq(agentQueue.queueState, 'locked'),
        lt(agentQueue.lockExpiresAt!, sql`NOW()`)
      ))
      .returning({ id: agentQueue.id });

    if (releasedAgentLocks.length > 0) {
      console.log(`[Lock Sweeper] Released ${releasedAgentLocks.length} expired locks in agent_queue`);
    }

    // 2. Release stuck entries in campaign_queue (power dial)
    // If a contact is in 'in_progress' state for > 10 minutes, something went wrong
    const releasedPowerEntries = await db.update(campaignQueue)
      .set({
        status: 'queued',
        updatedAt: new Date()
      })
      .where(and(
        eq(campaignQueue.status, 'in_progress'),
        lt(campaignQueue.updatedAt, sql`NOW() - INTERVAL '10 minutes'`)
      ))
      .returning({ id: campaignQueue.id });

    if (releasedPowerEntries.length > 0) {
      console.log(`[Lock Sweeper] Released ${releasedPowerEntries.length} stuck entries in campaign_queue`);
    }

    // 3. Log summary if any locks were released
    const total = releasedAgentLocks.length + releasedPowerEntries.length;
    if (total > 0) {
      console.log(`[Lock Sweeper] Total locks released: ${total}`);
    }
  } catch (error) {
    console.error('[Lock Sweeper] Error releasing expired locks:', error);
  }
}

// Additional configuration flags for disabling specific jobs
const ENABLE_EMAIL_VALIDATION = process.env.ENABLE_EMAIL_VALIDATION !== 'false';
const ENABLE_AI_ENRICHMENT = process.env.ENABLE_AI_ENRICHMENT !== 'false';

/**
 * Start all background jobs
 */
export function startBackgroundJobs() {
  console.log('[Background Jobs] Starting AI-powered QA background jobs and queue maintenance...');
  console.log(`[Background Jobs] Transcription: ${ENABLE_TRANSCRIPTION ? 'ENABLED (60s)' : 'DISABLED'}`);
  console.log(`[Background Jobs] AI Analysis: ${ENABLE_AI_ANALYSIS ? 'ENABLED (90s)' : 'DISABLED'}`);
  console.log(`[Background Jobs] Lock Sweeper: ${ENABLE_LOCK_SWEEPER ? 'ENABLED (10min)' : 'DISABLED'}`);
  console.log(`[Background Jobs] Email Validation: ${ENABLE_EMAIL_VALIDATION ? 'ENABLED' : 'DISABLED'}`);
  console.log(`[Background Jobs] AI Enrichment: ${ENABLE_AI_ENRICHMENT ? 'ENABLED' : 'DISABLED'}`);

  // Transcription processing job (optional)
  if (ENABLE_TRANSCRIPTION) {
    transcriptionInterval = setInterval(async () => {
      if (isTranscriptionRunning) {
        return; // Skip if still running
      }

      isTranscriptionRunning = true;
      try {
        await processPendingTranscriptions();
      } catch (error) {
        console.error('[Background Jobs] Transcription job error:', error);
      } finally {
        isTranscriptionRunning = false;
      }
    }, TRANSCRIPTION_JOB_INTERVAL);
  }

  // AI analysis processing job (optional)
  if (ENABLE_AI_ANALYSIS) {
    analysisInterval = setInterval(async () => {
      if (isAnalysisRunning) {
        return; // Skip if still running
      }

      isAnalysisRunning = true;
      try {
        await processUnanalyzedLeads();
      } catch (error) {
        console.error('[Background Jobs] AI analysis job error:', error);
      } finally {
        isAnalysisRunning = false;
      }
    }, AI_ANALYSIS_JOB_INTERVAL);
  }

  // Lock sweeper job (optional)
  if (ENABLE_LOCK_SWEEPER) {
    lockSweeperInterval = setInterval(async () => {
      if (isLockSweeperRunning) {
        return; // Skip if still running
      }

      isLockSweeperRunning = true;
      try {
        await sweepExpiredLocks();
      } catch (error) {
        console.error('[Background Jobs] Lock sweeper job error:', error);
      } finally {
        isLockSweeperRunning = false;
      }
    }, LOCK_SWEEPER_INTERVAL);
  }

  // Email validation job (cron-based, every 5 minutes to prevent overlap)
  if (ENABLE_EMAIL_VALIDATION) {
    console.log('[Background Jobs] Email Validation: ENABLED');
    cron.schedule('*/5 * * * *', async () => {
      try {
        await startEmailValidationJob();
      } catch (error) {
        console.error('[Background Jobs] Email validation job error:', error);
      }
    });
  } else {
    console.log('[Background Jobs] Email validation job DISABLED - use manual trigger');
  }

  // AI enrichment job (cron-based, every 20 minutes to prevent overlap with validation)
  if (ENABLE_AI_ENRICHMENT) {
    console.log('[Background Jobs] AI Enrichment: ENABLED');
    cron.schedule('*/20 * * * *', async () => {
      try {
        await startAiEnrichmentJob();
      } catch (error) {
        console.error('[Background Jobs] AI enrichment job error:', error);
      }
    });
  } else {
    console.log('[Background Jobs] AI enrichment job DISABLED - use manual trigger');
  }

  console.log('[Background Jobs] All jobs started successfully');
  console.log(`[Background Jobs] - Transcription job: every ${TRANSCRIPTION_JOB_INTERVAL/1000}s`);
  console.log(`[Background Jobs] - AI analysis job: every ${AI_ANALYSIS_JOB_INTERVAL/1000}s`);
  console.log(`[Background Jobs] - Lock sweeper: every ${LOCK_SWEEPER_INTERVAL/1000}s`);
  console.log(`[Background Jobs] - Email validation job: cron-based (every 5 minutes)`);
  console.log(`[Background Jobs] - AI enrichment job: cron-based (every 20 minutes)`);
}

/**
 * Stop all background jobs
 */
export function stopBackgroundJobs() {
  console.log('[Background Jobs] Stopping all background jobs...');

  if (transcriptionInterval) {
    clearInterval(transcriptionInterval);
    transcriptionInterval = null;
  }

  if (analysisInterval) {
    clearInterval(analysisInterval);
    analysisInterval = null;
  }

  if (lockSweeperInterval) {
    clearInterval(lockSweeperInterval);
    lockSweeperInterval = null;
  }

  console.log('[Background Jobs] All jobs stopped');
}

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', () => {
  stopBackgroundJobs();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopBackgroundJobs();
  process.exit(0);
});