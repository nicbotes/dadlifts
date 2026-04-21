#!/usr/bin/env node
/**
 * DADLIFT SETUP
 * Run by OpenClaw once. Generates a URL token, configures nginx/server,
 * outputs the URL to message to Nic.
 *
 * Usage: node cli/setup.js [--restart]
 */

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const { execSync } = require('child_process');

const ENV_PATH  = path.join(__dirname, '../.env');
const restart   = process.argv.includes('--restart');
const baseUrl   = process.env.DADLIFT_BASE_URL || 'http://localhost:3001';

// 32 bytes = 256-bit token, base64url ~43 chars — unguessable, URL-safe
const token = crypto.randomBytes(32).toString('base64url');

// Read/create .env
let env = '';
try   { env = fs.readFileSync(ENV_PATH, 'utf8'); }
catch {
  try { env = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8'); }
  catch { env = 'PORT=3001\n'; }
}

// Upsert URL_TOKEN
if (env.includes('DADLIFT_URL_TOKEN=')) {
  env = env.replace(/^DADLIFT_URL_TOKEN=.*/m, `DADLIFT_URL_TOKEN=${token}`);
} else {
  env = env.trimEnd() + `\nDADLIFT_URL_TOKEN=${token}\n`;
}

fs.writeFileSync(ENV_PATH, env, { mode: 0o600 });

if (restart) {
  try { execSync('pm2 restart dadlift', { stdio: 'inherit' }); }
  catch { console.error('Warning: pm2 restart failed — restart server manually'); }
}

const appUrl = `${baseUrl}/${token}/`;
const apiUrl = `${baseUrl}/${token}/api/`;

console.log(JSON.stringify({
  token,
  app_url: appUrl,
  api_url: apiUrl,
  message: `🏋️ DADLIFT is ready.\n\nAdd this to your home screen:\n${appUrl}\n\nThat's it — no login needed.`,
  env_updated: ENV_PATH,
  restart_attempted: restart,
}, null, 2));
