import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../../db/schema';

// Create connection pool
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// Global database instance (reused across function invocations)
export const db = drizzle(pool, { schema });

// Type helper for the database
export type Database = typeof db;
