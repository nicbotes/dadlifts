#!/usr/bin/env node
/**
 * DADLIFTS USER SETUP
 * Creates a new user with a unique token URL.
 * Run by OpenClaw when adding someone to the group.
 *
 * Usage:
 *   node cli/setup.js --name "Nic"
 *   node cli/setup.js --name "Dave" --restart
 */

const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const { execSync } = require('child_process');

const args    = process.argv.slice(2);
const nameIdx = args.indexOf('--name');
const name    = nameIdx >= 0 ? args[nameIdx + 1] : 'Lifter';
const restart = args.includes('--restart');
const baseUrl = process.env.DADLIFT_BASE_URL || 'http://localhost:3001';

// 48-byte token — 256+ bits, URL-safe
const token = crypto.randomBytes(48).toString('base64url');

// Insert user into DB
const Database = require('better-sqlite3');
const DB_PATH  = process.env.DB_PATH || path.join(__dirname, '../server/dadlift.db');
const db       = new Database(DB_PATH);

// Ensure users table exists (in case server hasn't run yet)
db.exec(`CREATE TABLE IF NOT EXISTS users (
  token TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Lifter',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

db.prepare('INSERT INTO users (token, name) VALUES (?, ?)').run(token, name);
console.error(`Created user: ${name}`);

// Restart PM2 if requested (after adding first user who needs server up)
if (restart) {
  try { execSync('pm2 restart dadlifts', { stdio: 'inherit' }); }
  catch { console.error('Warning: pm2 restart failed — start server manually'); }
}

const appUrl = `${baseUrl}/${token}/`;

const output = {
  token,
  name,
  app_url: appUrl,
  message: `🏋️ ${name} has been added to DΔDLIFTS.\n\nYour personal link:\n${appUrl}\n\nOpen in Safari → Share → Add to Home Screen.\nNo login needed — this link is yours.`,
};

console.log(JSON.stringify(output, null, 2));
