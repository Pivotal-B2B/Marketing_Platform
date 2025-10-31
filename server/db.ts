// Database connection setup - referenced from blueprint:javascript_database
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// PRODUCTION DATABASE OVERRIDE
// Workaround for Replit deployment secret bug - allow overriding production database URL
// This bypasses the deployment secret that keeps reverting to an outdated database value
let databaseUrl = process.env.DATABASE_URL;

if (process.env.REPLIT_DEPLOYMENT === '1') {
  // Running in production deployment - use deployment-provided production database URL
  const productionDbUrl = process.env.REPLIT_PRODUCTION_DATABASE_URL;

  if (!productionDbUrl) {
    throw new Error(
      'REPLIT_PRODUCTION_DATABASE_URL must be set when REPLIT_DEPLOYMENT=1'
    );
  }

  console.log('[DB] Production deployment detected - using override database URL');
  const endpoint = productionDbUrl.match(/ep-[^.]+/)?.[0] ?? 'unknown';
  console.log(`[DB] Target database: ${endpoint} (Production)`);
  databaseUrl = productionDbUrl;
} else {
  console.log('[DB] Development mode - using DATABASE_URL from environment');
  console.log('[DB] Database endpoint:', databaseUrl.match(/ep-[^.]+/)?.[0] || 'unknown');
}

// Ensure DATABASE_URL uses Neon's connection pooler for high concurrency
// This prevents "too many connections" errors by using pooling infrastructure
// Only add -pooler if it's not already present
const hasPooler = databaseUrl.includes('-pooler');

if (!hasPooler) {
  // Replace .region.neon.tech with -pooler.region.neon.tech
  databaseUrl = databaseUrl.replace(
    /\.([a-z0-9-]+)\.neon\.tech/,
    '-pooler.$1.neon.tech'
  );
}

console.log('[DB] Using Neon connection pooler:', hasPooler ? 'YES ✓ (already configured)' : 'YES ✓ (added -pooler)');

// Optimized connection pool for 10+ concurrent agents + background jobs
// With Neon pooler, we can be very conservative with client-side pooling
// REDUCED: Lower max pool to prevent connection exhaustion in production
export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 5, // CRITICAL: Keep low - Neon pooler handles scale, not client pool
  min: 0, // NO idle connections - create on demand only
  idleTimeoutMillis: 10000, // AGGRESSIVE: Release idle connections fast (10s)
  connectionTimeoutMillis: 8000, // Fast timeout (pooler is fast)
  maxUses: 5000, // Recycle connections more frequently
  allowExitOnIdle: true, // Allow pool to shut down when idle
});

// GRACEFUL error handling - prevent crashes from connection errors
pool.on('error', (err) => {
  console.error('[DB Pool] Connection error (non-fatal):', err.message);
  // Don't crash - let pool recover naturally
});

pool.on('connect', () => {
  const { totalCount, idleCount, waitingCount } = pool;
  console.log(`[DB Pool] Client connected | Total: ${totalCount}, Idle: ${idleCount}, Waiting: ${waitingCount}`);
});

pool.on('remove', () => {
  const { totalCount, idleCount, waitingCount } = pool;
  console.log(`[DB Pool] Client removed | Total: ${totalCount}, Idle: ${idleCount}, Waiting: ${waitingCount}`);
});

export const db = drizzle({ client: pool, schema });
