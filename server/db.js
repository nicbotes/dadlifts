const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'dadlift.db');
const db = new Database(DB_PATH);

// Performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── SCHEMA ────────────────────────────────────────────────────────────────────
db.exec(`
  -- Current working weights per lift
  CREATE TABLE IF NOT EXISTS weights (
    lift_id     TEXT PRIMARY KEY,
    w8_kg       REAL NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Progression increments per lift
  CREATE TABLE IF NOT EXISTS progressions (
    lift_id     TEXT PRIMARY KEY,
    inc_kg      REAL NOT NULL DEFAULT 5,
    inc_d_kg    REAL NOT NULL DEFAULT 10,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Deload flags per lift
  CREATE TABLE IF NOT EXISTS deloads (
    lift_id     TEXT PRIMARY KEY,
    flagged     INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Training sessions (each day trained)
  CREATE TABLE IF NOT EXISTS sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL DEFAULT (date('now')),
    schedule_day INTEGER NOT NULL,  -- 0-5 (SCHED index)
    cycle       INTEGER NOT NULL DEFAULT 1,
    week        INTEGER NOT NULL,
    completed   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Set results per session per lift
  CREATE TABLE IF NOT EXISTS set_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL REFERENCES sessions(id),
    lift_id     TEXT NOT NULL,
    set_num     INTEGER NOT NULL,
    status      TEXT NOT NULL CHECK(status IN ('idle','done','fail')),
    weight_kg   REAL NOT NULL,
    reps        INTEGER NOT NULL,
    is_amrap    INTEGER NOT NULL DEFAULT 0,
    logged_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Calisthenics hold config
  CREATE TABLE IF NOT EXISTS hold_config (
    hold_id     TEXT PRIMARY KEY,
    target_secs INTEGER,
    target_reps INTEGER,
    sets        INTEGER NOT NULL DEFAULT 4,
    inc         INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Calisthenics hold logs per session
  CREATE TABLE IF NOT EXISTS hold_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL REFERENCES sessions(id),
    hold_id     TEXT NOT NULL,
    set_num     INTEGER NOT NULL,
    status      TEXT NOT NULL CHECK(status IN ('idle','done','fail')),
    target_secs INTEGER,
    target_reps INTEGER,
    logged_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- App state blob (UI state not covered by structured tables)
  CREATE TABLE IF NOT EXISTS app_state (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
