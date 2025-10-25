/**
 * BullMQ Queue Configuration
 * 
 * Provides Redis connection and queue setup for background job processing.
 * Supports both development (in-memory) and production (Redis) modes.
 */

import { Queue, Worker, QueueEvents, ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

/**
 * Redis connection configuration
 */
const REDIS_URL = process.env.REDIS_URL;

/**
 * Create Redis connection for BullMQ
 * In development without Redis, this will return undefined and BullMQ will fall back gracefully
 */
function createRedisConnection(): IORedis | undefined {
  if (!REDIS_URL) {
    console.warn('[Queue] No REDIS_URL configured - background jobs will not persist across restarts');
    return undefined;
  }

  try {
    const connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });

    connection.on('error', (err) => {
      console.error('[Queue] Redis connection error:', err);
    });

    connection.on('connect', () => {
      console.log('[Queue] Redis connected');
    });

    return connection;
  } catch (error) {
    console.error('[Queue] Failed to create Redis connection:', error);
    return undefined;
  }
}

/**
 * Shared Redis connection instance
 */
const redisConnection = createRedisConnection();

/**
 * Get Redis connection for BullMQ
 */
export function getRedisConnection(): IORedis | undefined {
  return redisConnection;
}

/**
 * Check if Redis/Queue system is available
 */
export function isQueueAvailable(): boolean {
  return !!redisConnection;
}

/**
 * Create a BullMQ queue
 * @param queueName - Name of the queue
 * @param defaultJobOptions - Default options for jobs in this queue
 */
export function createQueue<T = any>(
  queueName: string,
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  }
): Queue<T> | null {
  const connection = getRedisConnection();
  
  if (!connection) {
    console.warn(`[Queue] Queue "${queueName}" created without Redis - jobs will not persist`);
    // Return a mock queue that logs warnings
    return null;
  }

  return new Queue<T>(queueName, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500, // Keep last 500 failed jobs
      ...defaultJobOptions,
    },
  });
}

/**
 * Create a BullMQ worker
 * @param queueName - Name of the queue to process
 * @param processor - Job processor function
 * @param concurrency - Number of concurrent jobs to process
 */
export function createWorker<T = any>(
  queueName: string,
  processor: (job: any) => Promise<any>,
  concurrency: number = 1
): Worker<T> | null {
  const connection = getRedisConnection();
  
  if (!connection) {
    console.warn(`[Queue] Worker for "${queueName}" not started - no Redis connection`);
    return null;
  }

  const worker = new Worker<T>(queueName, processor, {
    connection,
    concurrency,
    autorun: true,
  });

  worker.on('completed', (job) => {
    console.log(`[Queue:${queueName}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Queue:${queueName}] Job ${job?.id} failed:`, err);
  });

  return worker;
}

/**
 * Create queue events listener for monitoring
 */
export function createQueueEvents(queueName: string): QueueEvents | null {
  const connection = getRedisConnection();
  
  if (!connection) {
    return null;
  }

  return new QueueEvents(queueName, {
    connection,
  });
}

/**
 * Gracefully close all Redis connections
 */
export async function closeQueueConnections(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    console.log('[Queue] Redis connection closed');
  }
}
