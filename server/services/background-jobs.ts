/**
 * Background Jobs Scheduler
 * Runs AI-powered QA processing tasks at regular intervals
 */

import { processPendingTranscriptions } from './assemblyai-transcription';
import { processUnanalyzedLeads } from './ai-qa-analyzer';

// Job intervals (in milliseconds)
const TRANSCRIPTION_JOB_INTERVAL = 30000; // Every 30 seconds
const AI_ANALYSIS_JOB_INTERVAL = 45000; // Every 45 seconds

let transcriptionInterval: NodeJS.Timeout | null = null;
let analysisInterval: NodeJS.Timeout | null = null;

/**
 * Start all background jobs
 */
export function startBackgroundJobs() {
  console.log('[Background Jobs] Starting AI-powered QA background jobs...');

  // Transcription processing job
  transcriptionInterval = setInterval(async () => {
    try {
      await processPendingTranscriptions();
    } catch (error) {
      console.error('[Background Jobs] Transcription job error:', error);
    }
  }, TRANSCRIPTION_JOB_INTERVAL);

  // AI analysis processing job
  analysisInterval = setInterval(async () => {
    try {
      await processUnanalyzedLeads();
    } catch (error) {
      console.error('[Background Jobs] AI analysis job error:', error);
    }
  }, AI_ANALYSIS_JOB_INTERVAL);

  console.log('[Background Jobs] All jobs started successfully');
  console.log(`[Background Jobs] - Transcription job: every ${TRANSCRIPTION_JOB_INTERVAL/1000}s`);
  console.log(`[Background Jobs] - AI analysis job: every ${AI_ANALYSIS_JOB_INTERVAL/1000}s`);
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
