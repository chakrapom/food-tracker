/**
 * One-time migration: local meals.db (SQLite) → Railway PostgreSQL
 *
 * Usage:
 *   DATABASE_URL=<railway-postgres-url> node server/migrate-sqlite-to-pg.js
 *
 * Run this once from the repo root after setting up the Railway Postgres service.
 * Safe to re-run — it skips rows that already exist by date/id.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set. Pass it as an env var:\n  DATABASE_URL=<url> node server/migrate-sqlite-to-pg.js');
  process.exit(1);
}

const sqlite = new Database(path.join(__dirname, 'meals.db'), { readonly: true });
const pg = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pg.connect();
  try {
    await client.query('BEGIN');

    // ── days ────────────────────────────────────────────────────────────────
    const days = sqlite.prepare('SELECT * FROM days ORDER BY id ASC').all();
    console.log(`Migrating ${days.length} days...`);
    for (const r of days) {
      await client.query(
        `INSERT INTO days (id, date, day_type, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (date) DO NOTHING`,
        [r.id, r.date, r.day_type, r.created_at]
      );
    }

    // ── meals ───────────────────────────────────────────────────────────────
    const meals = sqlite.prepare('SELECT * FROM meals ORDER BY id ASC').all();
    console.log(`Migrating ${meals.length} meal entries...`);
    for (const r of meals) {
      await client.query(
        `INSERT INTO meals (id, day_id, meal_number, food_name, protein, carbs, fat, fiber, serving_note, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT DO NOTHING`,
        [r.id, r.day_id, r.meal_number, r.food_name, r.protein, r.carbs, r.fat, r.fiber, r.serving_note, r.created_at]
      );
    }

    // ── custom foods only (presets are seeded by the app on startup) ────────
    const customFoods = sqlite.prepare('SELECT * FROM foods WHERE is_custom = 1 ORDER BY id ASC').all();
    console.log(`Migrating ${customFoods.length} custom foods...`);
    for (const r of customFoods) {
      await client.query(
        `INSERT INTO foods (id, name, serving_label, protein, carbs, fat, fiber, is_custom)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [r.id, r.name, r.serving_label, r.protein, r.carbs, r.fat, r.fiber, r.is_custom]
      );
    }

    // ── exercise ────────────────────────────────────────────────────────────
    const exercises = sqlite.prepare('SELECT * FROM exercise ORDER BY id ASC').all();
    console.log(`Migrating ${exercises.length} exercise entries...`);
    for (const r of exercises) {
      await client.query(
        `INSERT INTO exercise (id, day_id, modality, pace, duration_minutes, calories_burned, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [r.id, r.day_id, r.modality, r.pace, r.duration_minutes, r.calories_burned, r.created_at]
      );
    }

    // ── reset sequences so new inserts don't collide with migrated IDs ──────
    for (const table of ['days', 'meals', 'foods', 'exercise', 'summaries']) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`
      );
    }

    await client.query('COMMIT');
    console.log('Migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pg.end();
    sqlite.close();
  }
}

migrate();
