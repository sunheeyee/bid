import pg from 'pg';
import bcrypt from 'bcryptjs';
import {
  applyLegacyCategoryNames,
  seedCategoriesAndPrompts,
  seedHelpIntroIfEmpty,
} from './seedPrompts.ts';
import { seedEconomicCatalog, seedDefaultBidScenario } from './economic/catalog.ts';

const { Pool } = pg;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error(
      'DATABASE_URL 환경변수가 없습니다. PostgreSQL 접속 문자열은 OS·서비스·컨테이너 환경변수로만 주입하세요. .env 파일에는 DATABASE_URL을 두지 않습니다.'
    );
    process.exit(1);
  }
  return url;
}

function poolConfig() {
  const connectionString = requireDatabaseUrl();
  const isLocal = /localhost|127\.0\.0\.1/i.test(connectionString);
  const sslOff = /sslmode=(disable|allow)/i.test(connectionString);
  const ssl =
    !isLocal && !sslOff
      ? { rejectUnauthorized: false }
      : undefined;
  return { connectionString, max: 10, ssl };
}

export const pool = new Pool(poolConfig());

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS category_level1 (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS category_level2 (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      view_type TEXT NOT NULL DEFAULT 'prompt' CHECK (view_type IN ('prompt', 'board')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES category_level1(id) ON DELETE RESTRICT,
      UNIQUE(parent_id, name)
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      category_level2_id TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      agent_name TEXT NOT NULL,
      agent_description TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_level2_id) REFERENCES category_level2(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS help_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS help_attachments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES help_posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS economic_indicator_catalog (
      indicator_key TEXT PRIMARY KEY,
      provider TEXT NOT NULL CHECK (provider IN ('ECOS', 'EIA', 'IMF')),
      display_name_ko TEXT NOT NULL,
      category TEXT NOT NULL,
      frequency TEXT NOT NULL,
      unit TEXT,
      currency TEXT,
      mapping_json TEXT NOT NULL,
      source_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      verified_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS economic_observations (
      id TEXT PRIMARY KEY,
      indicator_key TEXT NOT NULL,
      period TEXT NOT NULL,
      value DOUBLE PRECISION NOT NULL,
      unit TEXT,
      currency TEXT,
      source_timestamp TEXT,
      fetched_at TEXT NOT NULL,
      source_reference TEXT,
      is_estimated INTEGER NOT NULL DEFAULT 0,
      UNIQUE(indicator_key, period),
      FOREIGN KEY (indicator_key) REFERENCES economic_indicator_catalog(indicator_key)
    );

    CREATE TABLE IF NOT EXISTS bid_cost_scenarios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_cost DOUBLE PRECISION,
      base_fx DOUBLE PRECISION,
      weights_json TEXT NOT NULL,
      risk_weights_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`ALTER TABLE category_level2 ADD COLUMN IF NOT EXISTS view_type TEXT NOT NULL DEFAULT 'prompt'`);
}

async function ensureAdminPassword() {
  const existing = await pool.query('SELECT id FROM admin_settings WHERE id = 1');
  if (existing.rowCount) return;
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO admin_settings (id, password_hash) VALUES (1, $1)', [hash]);
}

export async function initDb() {
  await ensureSchema();
  await ensureAdminPassword();
  await applyLegacyCategoryNames(pool);
  await seedCategoriesAndPrompts(pool);
  await seedHelpIntroIfEmpty(pool);
  await seedEconomicCatalog(pool);
  await seedDefaultBidScenario(pool);
}
