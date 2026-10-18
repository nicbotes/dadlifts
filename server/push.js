// Web Push — two daily notifications at the user's local times (SAST by default):
//   nudge   17:00  something to do instead of a beer
//   checkin 19:30  did you stay dry or have beer? tap to log the ml
//
// - VAPID keys come from env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) or are
//   generated once and persisted in the server_kv table, so no setup is needed.
// - Subscriptions live in push_subscriptions (one row per device).
// - A 30s tick checks every subscription against its user's beerCfg
//   (notifyTime / notifyTz in the app_state blob) and sends at most once per
//   local day. Message copy comes from composeBeerNudge in src/beer.mjs.
//
// Web Push only works when the app is served over HTTPS (service workers need a
// secure context). On plain http:// the browser never creates a subscription,
// so nothing here runs for that user.
const webpush = require('web-push');
const db = require('./db');

const SUBJECT = process.env.VAPID_SUBJECT || 'https://github.com/nicbotes/dadlifts';
const RETRY_MS = 10 * 60 * 1000; // after a transient failure, retry at most every 10 min

// Labels for the barbell day — mirrors SCHED in src/App.jsx
const BB_LABELS = ['W1·D1', 'W1·D2', 'W1·D3', 'W2·D1', 'W2·D2', 'W2·D3'];

let beerModP = null;
const beer = () => (beerModP = beerModP || import('../src/beer.mjs'));

function kvGet(key) {
  const row = db.prepare('SELECT value FROM server_kv WHERE key = ?').get(key);
  return row ? row.value : null;
}
function kvSet(key, value) {
  db.prepare('INSERT INTO server_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

let keys = null;
function vapidKeys() {
  if (keys) return keys;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const stored = kvGet('vapid');
    if (stored) keys = JSON.parse(stored);
    else { keys = webpush.generateVAPIDKeys(); kvSet('vapid', JSON.stringify(keys)); }
  }
  webpush.setVapidDetails(SUBJECT, keys.publicKey, keys.privateKey);
  return keys;
}

function readState(token) {
  const row = db.prepare("SELECT value FROM app_state WHERE token = ? AND key = 'main'").get(token);
  if (!row) return {};
  try { return JSON.parse(row.value) || {}; } catch { return {}; }
}

function saveSubscription(token, sub, userAgent) {
  if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    throw Object.assign(new Error('invalid subscription'), { status: 400 });
  }
  db.prepare(`
    INSERT INTO push_subscriptions (endpoint, token, sub_json, user_agent)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET token = excluded.token, sub_json = excluded.sub_json,
      user_agent = excluded.user_agent, last_error = NULL
  `).run(sub.endpoint, token, JSON.stringify(sub), String(userAgent || '').slice(0, 200));
}

function removeSubscription(token, endpoint) {
  return db.prepare('DELETE FROM push_subscriptions WHERE token = ? AND endpoint = ?').run(token, endpoint).changes;
}

function listSubscriptions(token) {
  return db.prepare('SELECT endpoint, user_agent, created_at, last_sent_day, last_error FROM push_subscriptions WHERE token = ?').all(token);
}

// Build the personalised payload for a user from their blob
async function buildPayload(state, now, kind = 'nudge') {
  const B = await beer();
  const cfg = B.normalizeBeerCfg(state.beerCfg);
  const ins = B.computeBeerInsights(state.beerLog, cfg, now, state.beerCheckins);
  if (kind === 'checkin') return B.composeBeerCheckin(ins, B.zonedParts(now, cfg.notifyTz).dayNum);
  const ctx = {
    enabledModes: state.enabledModes || { 0: true, 1: true, 2: true, 3: true },
    barbellDay: BB_LABELS[state.dayIdx || 0],
    kbBellKg: state.kbWeight || 20,
  };
  const z = B.zonedParts(now, cfg.notifyTz);
  return B.composeBeerNudge(ins, ctx, z.dayNum);
}

async function sendTo(row, payload) {
  vapidKeys();
  try {
    await webpush.sendNotification(JSON.parse(row.sub_json), JSON.stringify(payload), { TTL: 3600, urgency: 'normal' });
    return { ok: true };
  } catch (err) {
    const code = err.statusCode || 0;
    if (code === 404 || code === 410) {
      db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(row.endpoint);
      return { ok: false, gone: true, status: code };
    }
    return { ok: false, status: code, error: String(err.body || err.message).slice(0, 300) };
  }
}

// Send right now to every device of one user (the in-app "test" button)
async function sendTest(token, now = new Date(), kind = 'nudge') {
  const rows = db.prepare('SELECT * FROM push_subscriptions WHERE token = ?').all(token);
  const payload = await buildPayload(readState(token), now, kind);
  const results = [];
  for (const row of rows) results.push(Object.assign({ endpoint: row.endpoint.slice(0, 60) + '…' }, await sendTo(row, payload)));
  return { sent: results.filter(r => r.ok).length, devices: rows.length, payload, results };
}

// One scheduler pass. Exported with an injectable clock for tests.
async function runNudgeTick(now = new Date()) {
  const B = await beer();
  const rows = db.prepare('SELECT * FROM push_subscriptions').all();
  const out = [];
  const stateCache = {};
  const KINDS = [
    { kind: 'nudge',   dayCol: 'last_sent_day',    attemptCol: 'last_attempt_at' },
    { kind: 'checkin', dayCol: 'last_checkin_day', attemptCol: 'last_checkin_attempt_at' },
  ];
  for (const row of rows) {
    const state = stateCache[row.token] || (stateCache[row.token] = readState(row.token));
    if (state.enabledModes && state.enabledModes[3] === false) continue; // beer tracker hidden → no notifications
    for (const k of KINDS) {
      const check = B.scheduleDue(state.beerCfg, k.kind, now, row[k.dayCol]);
      if (!check.due) continue;
      // Already checked in this evening (confirmed dry or logged) → don't ask
      if (k.kind === 'checkin' && state.beerCheckins && state.beerCheckins[check.day]) continue;
      if (row[k.attemptCol] && now.getTime() - Date.parse(row[k.attemptCol]) < RETRY_MS) continue;
      const res = await sendTo(row, await buildPayload(state, now, k.kind));
      if (res.gone) break;
      db.prepare(`UPDATE push_subscriptions SET ${k.attemptCol} = ?, ${k.dayCol} = ?, last_error = ? WHERE endpoint = ?`)
        .run(now.toISOString(), res.ok ? check.day : row[k.dayCol], res.ok ? null : `${k.kind} ${res.status} ${res.error || ''}`.trim(), row.endpoint);
      out.push({ token: row.token.slice(0, 6), kind: k.kind, day: check.day, ok: res.ok, status: res.status });
    }
  }
  return out;
}

let timer = null;
function startScheduler() {
  if (timer || process.env.PUSH_SCHEDULER === 'off') return;
  vapidKeys();
  timer = setInterval(() => {
    runNudgeTick().then(r => { if (r.length) console.log('[push] nudges', JSON.stringify(r)); })
      .catch(e => console.error('[push] tick failed', e.message));
  }, 30 * 1000);
  timer.unref();
}

module.exports = { vapidKeys, saveSubscription, removeSubscription, listSubscriptions, sendTest, runNudgeTick, startScheduler, buildPayload };
