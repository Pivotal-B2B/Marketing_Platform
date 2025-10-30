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

// Job intervals (in milliseconds)
const TRANSCRIPTION_JOB_INTERVAL = 30000; // Every 30 seconds
const AI_ANALYSIS_JOB_INTERVAL = 45000; // Every 45 seconds
const LOCK_SWEEPER_INTERVAL = 300000; // Every 5 minutes

let transcriptionInterval: NodeJS.Timeout | null = null;
let analysisInterval: NodeJS.Timeout | null = null;
let lockSweeperInterval: NodeJS.Timeout | null = null;

// Execution guards to prevent overlapping runs
let isTranscriptionRunning = false;
let isAnalysisRunning = false;
let isLockSweeperRunning = false;

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

/**
 * Start all background jobs
 */
export function startBackgroundJobs() {
  console.log('[Background Jobs] Starting AI-powered QA background jobs and queue maintenance...');

  // Transcription processing job
  transcriptionInterval = setInterval(async () => {
    if (isTranscriptionRunning) {
      console.log('[Background Jobs] Transcription job still running, skipping this execution');
      return;
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

  // AI analysis processing job
  analysisInterval = setInterval(async () => {
    if (isAnalysisRunning) {
      console.log('[Background Jobs] AI analysis job still running, skipping this execution');
      return;
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

  // Lock sweeper job
  lockSweeperInterval = setInterval(async () => {
    if (isLockSweeperRunning) {
      console.log('[Background Jobs] Lock sweeper still running, skipping this execution');
      return;
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

  // Email validation job (cron-based)
  startEmailValidationJob();
  
  // AI enrichment job (cron-based, targets contacts missing BOTH phone and address)
  startAiEnrichmentJob();

  console.log('[Background Jobs] All jobs started successfully');
  console.log(`[Background Jobs] - Transcription job: every ${TRANSCRIPTION_JOB_INTERVAL/1000}s`);
  console.log(`[Background Jobs] - AI analysis job: every ${AI_ANALYSIS_JOB_INTERVAL/1000}s`);
  console.log(`[Background Jobs] - Lock sweeper: every ${LOCK_SWEEPER_INTERVAL/1000}s`);
  console.log(`[Background Jobs] - Email validation job: cron-based (every 2 minutes)`);
  console.log(`[Background Jobs] - AI enrichment job: cron-based (every 15 minutes, targets contacts missing BOTH phone and address)`);
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
