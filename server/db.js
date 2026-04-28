const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'dadlift.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── SCHEMA ────────────────────────────────────────────────────────────────────
db.exec(`
  -- One row per user. token IS the URL path segment and tenant key.
  CREATE TABLE IF NOT EXISTS users (
    token       TEXT PRIMARY KEY,
    name        TEXT NOT NULL DEFAULT 'Lifter',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- UI state blob per user (tabs, dayIdx, set status, etc.)
  CREATE TABLE IF NOT EXISTS app_state (
    token       TEXT NOT NULL REFERENCES users(token),
    key         TEXT NOT NULL,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (token, key)
  );

  -- Working weights per lift per user
  CREATE TABLE IF NOT EXISTS weights (
    token       TEXT NOT NULL REFERENCES users(token),
    lift_id     TEXT NOT NULL,
    w8_kg       REAL NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (token, lift_id)
  );

  -- Progression increments per lift per user
  CREATE TABLE IF NOT EXISTS progressions (
    token       TEXT NOT NULL REFERENCES users(token),
    lift_id     TEXT NOT NULL,
    inc_kg      REAL NOT NULL DEFAULT 5,
    inc_d_kg    REAL NOT NULL DEFAULT 10,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (token, lift_id)
  );

  -- Deload flags per lift per user
  CREATE TABLE IF NOT EXISTS deloads (
    token       TEXT NOT NULL REFERENCES users(token),
    lift_id     TEXT NOT NULL,
    flagged     INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (token, lift_id)
  );

  -- Training sessions
  CREATE TABLE IF NOT EXISTS sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    token       TEXT NOT NULL REFERENCES users(token),
    date        TEXT NOT NULL DEFAULT (date('now')),
    schedule_day INTEGER NOT NULL,
    cycle       INTEGER NOT NULL DEFAULT 1,
    week        INTEGER NOT NULL DEFAULT 1,
    completed   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Set results
  CREATE TABLE IF NOT EXISTS set_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL REFERENCES sessions(id),
    token       TEXT NOT NULL,
    lift_id     TEXT NOT NULL,
    set_num     INTEGER NOT NULL,
    status      TEXT NOT NULL CHECK(status IN ('idle','done','fail')),
    weight_kg   REAL NOT NULL,
    reps        INTEGER NOT NULL,
    achieved_kg REAL,
    achieved_reps INTEGER,
    is_amrap    INTEGER NOT NULL DEFAULT 0,
    logged_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Calisthenics hold config per user
  CREATE TABLE IF NOT EXISTS hold_config (
    token       TEXT NOT NULL REFERENCES users(token),
    hold_id     TEXT NOT NULL,
    target_secs INTEGER,
    target_reps INTEGER,
    sets        INTEGER NOT NULL DEFAULT 4,
    inc         INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (token, hold_id)
  );

  -- Calisthenics hold logs
  CREATE TABLE IF NOT EXISTS hold_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL REFERENCES sessions(id),
    token       TEXT NOT NULL,
    hold_id     TEXT NOT NULL,
    set_num     INTEGER NOT NULL,
    status      TEXT NOT NULL CHECK(status IN ('idle','done','fail')),
    target_secs INTEGER,
    target_reps INTEGER,
    logged_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
