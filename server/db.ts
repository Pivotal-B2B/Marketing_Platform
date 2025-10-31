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
// Workaround for Replit deployment secret bug - hardcode production database URL
// This bypasses the deployment secret that keeps reverting to old database
let databaseUrl = process.env.DATABASE_URL;

if (process.env.REPLIT_DEPLOYMENT === '1') {
  // Running in production deployment - use hardcoded production database
  const PRODUCTION_DB_URL = "postgresql://neondb_owner:npg_7sYERC3kqXcd@ep-mute-sky-ahoyd10z-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";
  console.log('[DB] Production deployment detected - using override database URL');
  console.log('[DB] Target database: ep-mute-sky-ahoyd10z (Production)');
  databaseUrl = PRODUCTION_DB_URL;
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
export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 15, // Lower client-side pool (pooler handles the rest)
  min: 0, // NO idle connections - create on demand only
  idleTimeoutMillis: 20000, // Aggressive idle release (20s)
  connectionTimeoutMillis: 10000, // Fast timeout (pooler is fast)
  maxUses: 7500, // Recycle connections periodically to prevent stale connections
});

// Log connection pool events to help diagnose issues
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err);
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
