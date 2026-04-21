#!/usr/bin/env node
/**
 * DADLIFT SETUP
 * Run once by OpenClaw to generate API key, write .env, restart server.
 * Outputs the key so OpenClaw can message it to Nic.
 *
 * Usage: node cli/setup.js [--restart]
 */

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const { execSync } = require('child_process');

const ENV_PATH = path.join(__dirname, '../.env');
const restart  = process.argv.includes('--restart');

// Generate a 48-byte (384-bit) random key — long, URL-safe, memorable enough to paste
const key = crypto.randomBytes(48).toString('base64url');

// Read existing .env or use template
let env = '';
try {
  env = fs.readFileSync(ENV_PATH, 'utf8');
} catch {
  // Start from example if .env doesn't exist yet
  try {
    env = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');
  } catch {
    env = 'PORT=3001\n';
  }
}

// Upsert DADLIFT_API_KEY line
if (env.includes('DADLIFT_API_KEY=')) {
  env = env.replace(/^DADLIFT_API_KEY=.*/m, `DADLIFT_API_KEY=${key}`);
} else {
  env = env.trimEnd() + `\nDADLIFT_API_KEY=${key}\n`;
}

fs.writeFileSync(ENV_PATH, env, { mode: 0o600 });

// Restart server if requested (PM2)
if (restart) {
  try {
    execSync('pm2 restart dadlift', { stdio: 'inherit' });
  } catch {
    console.error('Warning: pm2 restart failed — restart server manually');
  }
}

// Output for OpenClaw to pick up and message to Nic
const output = {
  key,
  message: `🔑 DADLIFT key set.\n\nOpen the app → enter this key when prompted:\n\n${key}\n\nYou only need to do this once. The app will stay authenticated.`,
  env_updated: ENV_PATH,
  restart_attempted: restart,
};

console.log(JSON.stringify(output, null, 2));
