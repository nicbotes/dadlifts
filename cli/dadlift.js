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

  async snapshot() {
    // Parsed summary — easier for agents to read than the raw blob
    const raw = await req('GET', '/api/state/main');

    const SCHED = [
      { label:"W1·D1", week:1 }, { label:"W1·D2", week:1 }, { label:"W1·D3", week:1 },
      { label:"W2·D1", week:2 }, { label:"W2·D2", week:2 }, { label:"W2·D3", week:2 },
    ];

    const weights = raw.weights || {};
    const progs   = raw.progs   || {};
    const deloads = raw.deloads || {};
    const sessionLog = raw.sessionLog || [];
    const failLog    = raw.failLog    || {};

    // Build per-lift summary from sessionLog
    const liftSummary = {};
    sessionLog.forEach(function(session) {
      Object.keys(session.lifts || {}).forEach(function(id) {
        const entry = session.lifts[id];
        if (!liftSummary[id]) liftSummary[id] = { sessions: 0, allTimeMax: 0, allTimeOrm: 0, recentSessions: [] };
        liftSummary[id].sessions++;
        if (entry.maxWeight > liftSummary[id].allTimeMax) liftSummary[id].allTimeMax = entry.maxWeight;
        if (entry.orm      > liftSummary[id].allTimeOrm)  liftSummary[id].allTimeOrm  = entry.orm;
        liftSummary[id].recentSessions.push({
          cycle: session.cycle, day: SCHED[session.dayIdx]?.label || session.dayIdx,
          weight: entry.weight, volume: entry.volume, orm: entry.orm,
        });
      });
    });

    // Keep only last 5 sessions per lift
    Object.keys(liftSummary).forEach(function(id) {
      liftSummary[id].recentSessions = liftSummary[id].recentSessions.slice(-5);
    });

    // Parse fail log
    const failsByLift = {};
    Object.keys(failLog).forEach(function(key) {
      const parts = key.split('-');
      const liftId = parts.length === 4 ? parts[2] : parts[1];
      if (!failsByLift[liftId]) failsByLift[liftId] = [];
      failsByLift[liftId].push(failLog[key]);
    });

    // Today's sets
    const todayIdx  = raw.dayIdx || 0;
    const todaySets = (raw.liftSets || {})[todayIdx] || {};
    const todayLabel = SCHED[todayIdx]?.label || 'Unknown';

    const out = {
      user_summary: {
        current_cycle: raw.cycle || 1,
        current_day:   todayLabel,
        total_sessions_logged: sessionLog.length,
      },
      current_weights: weights,
      progression_increments: progs,
      active_deloads: Object.keys(deloads).filter(id => deloads[id]),
      todays_sets: todaySets,
      lift_history: liftSummary,
      current_cycle_fails: failsByLift,
      hold_config: raw.holdCfg || {},
    };

    console.log(JSON.stringify(out, null, 2));
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
  snapshot              Parsed training summary — easier for agents

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
