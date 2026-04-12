import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
if (!connectionString) {
  throw new Error("Missing DATABASE_URL.");
}

const ssl =
  process.env.PGSSLMODE === "disable" || process.env.NEON_DISABLE_SSL === "true"
    ? false
    : { rejectUnauthorized: false };

const globalForDb = globalThis;

if (!globalForDb.__quiz_pool) {
  globalForDb.__quiz_pool = new Pool({ connectionString, ssl });
}

export const pool = globalForDb.__quiz_pool;

if (!globalForDb.__quiz_db_init) {
  globalForDb.__quiz_db_init = false;
}

export async function initDb() {
  if (globalForDb.__quiz_db_init) {
    return;
  }

  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      provider TEXT NOT NULL DEFAULT 'password',
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
    CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  globalForDb.__quiz_db_init = true;
}
