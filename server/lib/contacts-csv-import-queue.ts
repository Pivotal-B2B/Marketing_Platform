/**
 * Contacts CSV Import Queue Setup
 * Initializes BullMQ queue and worker for contacts CSV imports from S3
 */

import { Queue, Worker } from 'bullmq';
import { createQueue, createWorker, isQueueAvailable } from './queue';
import { processContactsCSVImport, ContactsCSVImportJobData, ContactsCSVImportJobResult } from '../workers/contacts-csv-import-worker';

/**
 * Contacts CSV Import Queue
 */
export let contactsCSVImportQueue: Queue<ContactsCSVImportJobData> | null = null;

/**
 * Contacts CSV Import Worker
 */
let contactsCSVImportWorker: Worker<ContactsCSVImportJobData> | null = null;

/**
 * Initialize contacts CSV import queue and worker
 */
export function initializeContactsCSVImportQueue(): void {
  if (!isQueueAvailable()) {
    console.warn('[ContactsCSVImportQueue] Redis not available - queue will not be initialized');
    return;
  }

  // Create queue
  contactsCSVImportQueue = createQueue<ContactsCSVImportJobData>('contacts-csv-import', {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000, // Start with 10 second delay
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  });

  if (!contactsCSVImportQueue) {
    console.error('[ContactsCSVImportQueue] Failed to create queue');
    return;
  }

  // Create worker
  contactsCSVImportWorker = createWorker<ContactsCSVImportJobData>(
    'contacts-csv-import',
    async (job) => {
      try {
        return await processContactsCSVImport(job);
      } catch (error) {
        console.error(`[ContactsCSVImportQueue] Job ${job.id} failed:`, error);
        throw error;
      }
    },
    3 // Process 3 jobs concurrently
  );

  if (contactsCSVImportWorker) {
    console.log('[ContactsCSVImportQueue] Worker started successfully');
  } else {
    console.warn('[ContactsCSVImportQueue] Worker could not be started');
  }
}

/**
 * Add a contacts CSV import job to the queue
 * 
 * @param jobData - Job data including S3 key and field mappings
 * @returns Job ID
 */
export async function addContactsCSVImportJob(jobData: ContactsCSVImportJobData): Promise<string | null> {
  if (!contactsCSVImportQueue) {
    console.warn('[ContactsCSVImportQueue] Queue not available');
    return null;
  }

  const job = await contactsCSVImportQueue.add('import-contacts', jobData, {
    jobId: `contacts-csv-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  });

  console.log(`[ContactsCSVImportQueue] Job ${job.id} added to queue`);
  return job.id;
}

/**
 * Get job status and progress
 * 
 * @param jobId - Job ID
 * @returns Job status and progress
 */
export async function getContactsCSVImportJobStatus(jobId: string): Promise<{
  id: string;
  state: string;
  progress: any;
  result?: ContactsCSVImportJobResult;
  error?: string;
} | null> {
  if (!contactsCSVImportQueue) {
    return null;
  }

  const job = await contactsCSVImportQueue.getJob(jobId);
  
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;
  const returnValue = await job.returnvalue;
  const failedReason = job.failedReason;

  return {
    id: job.id || jobId,
    state,
    progress,
    result: returnValue,
    error: failedReason,
  };
}

/**
 * Close queue and worker connections
 */
export async function closeContactsCSVImportQueue(): Promise<void> {
  if (contactsCSVImportWorker) {
    await contactsCSVImportWorker.close();
    console.log('[ContactsCSVImportQueue] Worker closed');
  }

  if (contactsCSVImportQueue) {
    await contactsCSVImportQueue.close();
    console.log('[ContactsCSVImportQueue] Queue closed');
  }
}
