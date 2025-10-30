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

// Ensure DATABASE_URL uses Neon's connection pooler for high concurrency
// This prevents "too many connections" errors by using pooling infrastructure
// Only add -pooler if it's not already present
let databaseUrl = process.env.DATABASE_URL;
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
// With Neon pooler, we can be more conservative with client-side pooling
export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 20, // Lower client-side pool (pooler handles the rest)
  min: 5, // Fewer idle connections (pooler manages efficiently)
  idleTimeoutMillis: 30000, // Release idle connections faster (30s)
  connectionTimeoutMillis: 10000, // Shorter timeout (pooler is fast)
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
