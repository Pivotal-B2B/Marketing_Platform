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

// Optimized connection pool for 10+ concurrent agents + background jobs
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 100, // Increased for 10 agents (10 per agent) + 30 for background jobs
  min: 10, // Keep 10 connections ready (1 per agent baseline)
  idleTimeoutMillis: 60000, // Keep connections alive longer (60s)
  connectionTimeoutMillis: 30000, // More patience for complex queries (30s)
  maxUses: 7500, // Recycle connections periodically to prevent stale connections
});
export const db = drizzle({ client: pool, schema });
