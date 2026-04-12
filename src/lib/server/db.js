import { Pool } from "pg";

const globalForDb = globalThis;

function resolveConnectionString() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL in environment.");
  }
  return connectionString;
}

function resolveSslConfig() {
  const isSslDisabled =
    process.env.PGSSLMODE === "disable" || process.env.NEON_DISABLE_SSL === "true";
  return isSslDisabled ? false : { rejectUnauthorized: false };
}

export function getPool() {
  if (!globalForDb.__smartquiz_pool) {
    globalForDb.__smartquiz_pool = new Pool({
      connectionString: resolveConnectionString(),
      ssl: resolveSslConfig(),
    });
  }
  return globalForDb.__smartquiz_pool;
}

export const pool = {
  query: (...args) => getPool().query(...args),
};

if (!globalForDb.__smartquiz_init_db) {
  globalForDb.__smartquiz_init_db = false;
}

export async function initDb() {
  if (globalForDb.__smartquiz_init_db) {
    return;
  }

  const currentPool = getPool();

  await currentPool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

  await currentPool.query(`
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

  await currentPool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await currentPool.query(`
    DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
    CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  globalForDb.__smartquiz_init_db = true;
}
