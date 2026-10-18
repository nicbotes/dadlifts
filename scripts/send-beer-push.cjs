#!/usr/bin/env node
// Sends the beer notification push to every device in the PUSH_SUBSCRIPTIONS
// secret. Run by .github/workflows/beer-notify.yml (no backend involved).
//
// env:
//   KIND                nudge | checkin
//   VAPID_PRIVATE_KEY   secret — private half of the VAPID key pair
//   PUSH_SUBSCRIPTIONS  secret — JSON array of device keys copied from the app
//   VAPID_PUBLIC_KEY    optional — defaults to the key in src/push.js
//   WEBPUSH_DIR         where web-push was installed (workflow installs it to a temp dir)
//
// The payload is only { kind }. The phone's service worker builds the message
// from data the app saved on the phone, so nothing personal goes through here.
// Device keys contain secret tokens: never log them, only their index and host.
const fs = require('fs');
const path = require('path');

const SUBJECT = 'https://github.com/nicbotes/dadlifts';

function publicKey(env) {
  if (env.VAPID_PUBLIC_KEY) return env.VAPID_PUBLIC_KEY.trim();
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'push.js'), 'utf8');
  const m = src.match(/VAPID_PUBLIC_KEY\s*=\s*'([A-Za-z0-9_-]+)'/);
  if (!m) throw new Error('VAPID_PUBLIC_KEY not found in src/push.js');
  return m[1];
}

function parseSubs(raw) {
  const v = JSON.parse(raw);
  const list = Array.isArray(v) ? v.flat() : [v];
  return list.filter((s) => s && typeof s.endpoint === 'string' && s.keys && s.keys.p256dh && s.keys.auth);
}

async function run({ webpush, env, log }) {
  const kind = env.KIND === 'checkin' ? 'checkin' : 'nudge';
  if (!env.VAPID_PRIVATE_KEY || !env.PUSH_SUBSCRIPTIONS) {
    log('::notice::Beer notifications are not set up yet (VAPID_PRIVATE_KEY / PUSH_SUBSCRIPTIONS secrets missing). Skipping.');
    return { kind, sent: 0, failed: 0, exitCode: 0 };
  }
  let subs;
  try { subs = parseSubs(env.PUSH_SUBSCRIPTIONS); }
  catch (e) { log('::error::PUSH_SUBSCRIPTIONS is not valid JSON. Paste the device key from the app exactly as copied.'); return { kind, sent: 0, failed: 0, exitCode: 1 }; }
  if (!subs.length) { log('::error::PUSH_SUBSCRIPTIONS has no valid device keys.'); return { kind, sent: 0, failed: 0, exitCode: 1 }; }

  webpush.setVapidDetails(SUBJECT, publicKey(env), env.VAPID_PRIVATE_KEY.trim());
  let sent = 0, failed = 0;
  for (let i = 0; i < subs.length; i++) {
    const host = (() => { try { return new URL(subs[i].endpoint).host; } catch (_) { return '?'; } })();
    try {
      await webpush.sendNotification(subs[i], JSON.stringify({ kind }), { TTL: 3600, urgency: 'high' });
      sent++; log(`device ${i + 1} (${host}): sent ${kind}`);
    } catch (err) {
      failed++;
      const code = err.statusCode || 0;
      if (code === 404 || code === 410) log(`::warning::Device ${i + 1} (${host}) has expired (${code}). Turn notifications on again in the app and replace its key in PUSH_SUBSCRIPTIONS.`);
      else log(`::warning::Device ${i + 1} (${host}) failed: ${code} ${String(err.body || err.message).slice(0, 200)}`);
    }
  }
  log(`${kind}: ${sent} sent, ${failed} failed`);
  return { kind, sent, failed, exitCode: sent === 0 ? 1 : 0 };
}

module.exports = { run, parseSubs, publicKey };

if (require.main === module) {
  const { createRequire } = require('module');
  const req = createRequire(path.join(process.env.WEBPUSH_DIR || process.cwd(), 'noop.js'));
  run({ webpush: req('web-push'), env: process.env, log: (m) => console.log(m) })
    .then((r) => process.exit(r.exitCode))
    .catch((e) => { console.log('::error::' + e.message); process.exit(1); });
}
