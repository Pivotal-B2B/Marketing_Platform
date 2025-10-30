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

// Optimized connection pool for high concurrency (3+ concurrent agents)
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 50, // Increased for multiple agents + background jobs
  min: 5, // Keep minimum connections ready
  idleTimeoutMillis: 60000, // Keep connections alive longer (60s)
  connectionTimeoutMillis: 20000, // More patience for slow queries (20s)
  maxUses: 7500, // Recycle connections periodically to prevent stale connections
});
export const db = drizzle({ client: pool, schema });
