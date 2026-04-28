#!/usr/bin/env node
/**
 * DADLIFTS CLI
 * Per-user training data access for OpenClaw.
 * 
 * Usage: node cli/dadlift.js <command> [args]
 * 
 * Set DADLIFT_API_URL to the user's full token URL:
 *   export DADLIFT_API_URL=https://yourvps.com/their-token-here
 */

const https = require('https');
const http  = require('http');
const url   = require('url');

const BASE = (process.env.DADLIFT_API_URL || '').replace(/\/$/, '');

if (!BASE) {
  console.error('Error: DADLIFT_API_URL not set\nMust be the full token URL, e.g.:\n  export DADLIFT_API_URL=https://yourvps.com/token-here');
  process.exit(1);
}

function req(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const parsed  = url.parse(`${BASE}${urlPath}`);
    const payload = body ? JSON.stringify(body) : null;
    const lib     = parsed.protocol === 'https:' ? https : http;
    const opts = {
      hostname: parsed.hostname, port: parsed.port,
      path: parsed.path, method,
      headers: {
        'Content-Type': 'application/json',
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

const commands = {
  async snapshot() {
    const data = await req('GET', '/api/agent/snapshot');
    console.log(JSON.stringify(data, null, 2));
  },
  async weights() {
    const data = await req('GET', '/api/lifts/weights');
    console.log(JSON.stringify(data, null, 2));
  },
  async 'set-weight'([liftId, kg]) {
    if (!liftId || !kg) throw new Error('Usage: set-weight <liftId> <kg>');
    const data = await req('PUT', `/api/lifts/weights/${liftId}`, { w8_kg: parseFloat(kg) });
    console.log(JSON.stringify(data, null, 2));
  },
  async sessions([limit = '10']) {
    const data = await req('GET', `/api/sessions?limit=${limit}`);
    console.log(JSON.stringify(data, null, 2));
  },
  async summary() {
    const data = await req('GET', '/api/lifts/analytics/summary');
    console.log(JSON.stringify(data, null, 2));
  },
  async deloads() {
    const data = await req('GET', '/api/lifts/deloads');
    const active = Object.entries(data).filter(([,v])=>v).map(([k])=>k);
    console.log(JSON.stringify({ active_deloads: active, all: data }, null, 2));
  },
  async progressions() {
    const data = await req('GET', '/api/lifts/progressions');
    console.log(JSON.stringify(data, null, 2));
  },
  async 'set-prog'([liftId, inc, incD]) {
    if (!liftId || !inc) throw new Error('Usage: set-prog <liftId> <inc_kg> [incD_kg]');
    const data = await req('PUT', `/api/lifts/progressions/${liftId}`, {
      inc: parseFloat(inc), incD: parseFloat(incD ?? inc * 2),
    });
    console.log(JSON.stringify(data, null, 2));
  },
  async health() {
    const data = await req('GET', '/api/health');
    console.log(JSON.stringify(data, null, 2));
  },
  async state() {
    // Primary data source — full app state blob
    const data = await req('GET', '/api/state/main');
    console.log(JSON.stringify(data, null, 2));
  },
  help() {
    console.log(`
DADLIFTS CLI — per-user commands

Set DADLIFT_API_URL to the user's full token URL first.

Commands:
  snapshot              Full training snapshot
  weights               Current working weights
  set-weight <id> <kg>  Update a lift weight
  sessions [n]          Recent sessions
  summary               All-time lift summary
  deloads               Active deload flags
  progressions          Progression increments
  set-prog <id> <kg>    Update progression
  health                API health check
  state                 Full app state blob (primary data source)

Lift IDs: deadlift squat bench ohp rows
    `.trim());
  },
};

async function main() {
  const [,, cmd, ...args] = process.argv;
  if (!cmd || cmd === 'help') { commands.help(); return; }
  const fn = commands[cmd];
  if (!fn) { console.error(`Unknown command: ${cmd}`); process.exit(1); }
  try { await fn(args); }
  catch (err) { console.error(`Error: ${err.message}`); process.exit(1); }
}

main();
