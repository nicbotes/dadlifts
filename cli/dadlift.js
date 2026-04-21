#!/usr/bin/env node
/**
 * DADLIFT CLI
 * Used by OpenClaw to read and update training data.
 * Config via environment: DADLIFT_API_URL, DADLIFT_API_KEY
 */

const https = require('https');
const http  = require('http');
const url   = require('url');

const BASE = (process.env.DADLIFT_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const KEY  = process.env.DADLIFT_API_KEY || '';

if (!KEY) {
  console.error('Error: DADLIFT_API_KEY environment variable not set');
  process.exit(1);
}

// ── HTTP CLIENT ───────────────────────────────────────────────────────────────
function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const parsed  = url.parse(`${BASE}${path}`);
    const payload = body ? JSON.stringify(body) : null;
    const lib     = parsed.protocol === 'https:' ? https : http;

    const opts = {
      hostname: parsed.hostname,
      port:     parsed.port,
      path:     parsed.path,
      method,
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type':  'application/json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
      },
    };

    const request = lib.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${json.error || data}`));
          else resolve(json);
        } catch { resolve(data); }
      });
    });

    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

// ── COMMANDS ──────────────────────────────────────────────────────────────────
const commands = {

  // Full snapshot — most useful for OpenClaw
  async snapshot() {
    const data = await req('GET', '/api/agent/snapshot');
    console.log(JSON.stringify(data, null, 2));
  },

  // Current working weights
  async weights() {
    const data = await req('GET', '/api/lifts/weights');
    console.log(JSON.stringify(data, null, 2));
  },

  // Set a weight: dadlift set-weight deadlift 105
  async 'set-weight'([liftId, kg]) {
    if (!liftId || !kg) throw new Error('Usage: set-weight <liftId> <kg>');
    const data = await req('PUT', `/api/lifts/weights/${liftId}`, { w8_kg: parseFloat(kg) });
    console.log(JSON.stringify(data, null, 2));
  },

  // Session history
  async sessions([limit = '10']) {
    const data = await req('GET', `/api/sessions?limit=${limit}`);
    console.log(JSON.stringify(data, null, 2));
  },

  // Lift analytics — volume, max, est 1RM over time
  async analytics() {
    const data = await req('GET', '/api/lifts/analytics/lifts');
    console.log(JSON.stringify(data, null, 2));
  },

  // Summary — all-time maxes, est 1RM, total sessions
  async summary() {
    const data = await req('GET', '/api/lifts/analytics/summary');
    console.log(JSON.stringify(data, null, 2));
  },

  // Current deloads
  async deloads() {
    const data = await req('GET', '/api/lifts/deloads');
    const active = Object.entries(data).filter(([, v]) => v).map(([k]) => k);
    console.log(JSON.stringify({ active_deloads: active, all: data }, null, 2));
  },

  // Hold config and analytics
  async holds() {
    const [config, analytics] = await Promise.all([
      req('GET', '/api/holds/config'),
      req('GET', '/api/holds/analytics'),
    ]);
    console.log(JSON.stringify({ config, analytics }, null, 2));
  },

  // Progressions
  async progressions() {
    const data = await req('GET', '/api/lifts/progressions');
    console.log(JSON.stringify(data, null, 2));
  },

  // Set progression: dadlift set-prog deadlift 5 10
  async 'set-prog'([liftId, inc, incD]) {
    if (!liftId || !inc) throw new Error('Usage: set-prog <liftId> <inc_kg> [incD_kg]');
    const data = await req('PUT', `/api/lifts/progressions/${liftId}`, {
      inc: parseFloat(inc),
      incD: parseFloat(incD ?? inc * 2),
    });
    console.log(JSON.stringify(data, null, 2));
  },

  // Health check
  async health() {
    const data = await req('GET', '/health');
    console.log(JSON.stringify(data, null, 2));
  },

  // Help
  help() {
    console.log(`
DADLIFT CLI

Commands:
  snapshot              Full training snapshot (recommended for OpenClaw)
  weights               Current working weights per lift
  set-weight <id> <kg>  Update working weight for a lift
  sessions [limit]      Recent training sessions
  analytics             Volume / max weight / est 1RM per session
  summary               All-time lift summary
  deloads               Active deload flags
  holds                 Calisthenics config + hold analytics
  progressions          Current progression increments
  set-prog <id> <kg>    Update progression increments
  health                API health check

Lift IDs: deadlift, squat, bench, ohp, rows
Hold IDs: frontlever, deadhang, handstand, hspushup, lsit

Environment:
  DADLIFT_API_URL   API base URL (default: http://localhost:3001)
  DADLIFT_API_KEY   Bearer token (required)
    `.trim());
  },
};

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const [,, cmd, ...args] = process.argv;

  if (!cmd || cmd === 'help') {
    commands.help();
    return;
  }

  const fn = commands[cmd];
  if (!fn) {
    console.error(`Unknown command: ${cmd}\nRun 'dadlift help' for usage.`);
    process.exit(1);
  }

  try {
    await fn(args);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
