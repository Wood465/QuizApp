import { Pool } from "pg";
import { defaultQuizzes } from "../../src/data/defaultQuizzes.js";

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
      avatar_url TEXT,
      password_hash TEXT,
      provider TEXT NOT NULL DEFAULT 'password',
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      questions JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      quiz_title TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      percentage INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      review JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE results
    ADD COLUMN IF NOT EXISTS review JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);

  await pool.query(`
    ALTER TABLE results
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0;
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

  await pool.query(`
    DROP TRIGGER IF EXISTS trg_quizzes_updated_at ON quizzes;
    CREATE TRIGGER trg_quizzes_updated_at
    BEFORE UPDATE ON quizzes
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  for (const quiz of defaultQuizzes) {
    await pool.query(
      `INSERT INTO quizzes (id, title, topic, difficulty, questions)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [quiz.id, quiz.title, quiz.topic, quiz.difficulty, JSON.stringify(quiz.questions)],
    );
  }

  globalForDb.__quiz_db_init = true;
}
