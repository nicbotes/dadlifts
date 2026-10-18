// Beer notifications — no backend.
//
// How it works:
//   1. The phone subscribes to Web Push with the public VAPID key below and
//      shows you its "device key" (the PushSubscription JSON).
//   2. You paste that into the GitHub secret PUSH_SUBSCRIPTIONS once.
//   3. .github/workflows/beer-notify.yml runs at ~17:00 and ~19:30 SAST and
//      sends a tiny push: { kind: "nudge" | "checkin" }.
//   4. The service worker (public/sw.js) turns that into today's personalised
//      message, which the app pre-computed and saved in Cache Storage
//      (saveNudgeContext). Your data never leaves the phone.
//
// Needs HTTPS (GitHub Pages is). On iPhone: add to Home Screen first, iOS 16.4+.
import { computeBeerInsights, composeBeerNudge, composeBeerCheckin, normalizeBeerCfg } from './beer.mjs';

// Public half of the VAPID key pair. The private half is the GitHub secret
// VAPID_PRIVATE_KEY. Safe to commit — it only identifies the sender.
export const VAPID_PUBLIC_KEY = 'BA8dzcpmwyPcE_D_bQ3D5SzfR1mLMvBVwp-3G_Yp_XQj3lFk5vhDi2Odf088eNt0VWUwHMjfGAlPdo8aPhGKNiU';

export const NUDGE_CACHE = 'dadlifts-nudge-v1';
export const NUDGE_FILE = 'nudge-context.json';
const CONTEXT_DAYS = 7;

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isInstalled() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
}
function swBase() {
  const path = window.location.pathname;
  return path.endsWith('/') ? path : path.substring(0, path.lastIndexOf('/') + 1);
}
function b64ToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
async function registration() {
  if (!('serviceWorker' in navigator)) return null;
  let reg = await navigator.serviceWorker.getRegistration(swBase());
  if (!reg) reg = await navigator.serviceWorker.register(swBase() + 'sw.js');
  return reg;
}

// → { state, reason }
// state: 'on' | 'off' | 'insecure' | 'ios-install' | 'denied' | 'unsupported'
export async function pushStatus() {
  if (!window.isSecureContext) return { state: 'insecure', reason: 'Notifications need HTTPS. Open the app from nicbotes.github.io/dadlifts.' };
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!hasApis) {
    if (isIos() && !isInstalled()) return { state: 'ios-install', reason: 'On iPhone: Share → Add to Home Screen, open DADLIFTS from the icon, then turn on here. Needs iOS 16.4+.' };
    return { state: 'unsupported', reason: "This browser doesn't support web push notifications." };
  }
  if (Notification.permission === 'denied') return { state: 'denied', reason: 'Notifications are blocked for this app. Allow them in your phone settings, then come back.' };
  try {
    const reg = await registration();
    const sub = reg && (await reg.pushManager.getSubscription());
    return { state: sub ? 'on' : 'off', reason: '', deviceKey: sub ? deviceKeyOf(sub) : '' };
  } catch (e) {
    return { state: 'unsupported', reason: 'Could not start notifications: ' + e.message };
  }
}

// What to paste into the PUSH_SUBSCRIPTIONS secret (a JSON array, so one device
// pastes as-is; for a second device, put both objects in the same array).
export function deviceKeyOf(sub) {
  return JSON.stringify([sub.toJSON ? sub.toJSON() : sub]);
}

// Must be called straight from a tap (iOS needs the permission prompt in a user gesture).
export async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications blocked. Allow them in settings.' : 'Permission not granted.');
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC_KEY) });
  return deviceKeyOf(sub);
}

export async function disablePush() {
  const reg = await registration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (sub) await sub.unsubscribe();
}

// Show today's message locally — checks permission + display, not delivery.
export async function showSample(kind) {
  const reg = await registration();
  const ctx = await readNudgeContext();
  const day = localDayKey(new Date());
  const msg = (ctx && ctx.days && ctx.days[day] && ctx.days[day][kind]) || (kind === 'checkin'
    ? { title: 'Evening check-in 🍺?', body: 'Stayed dry? Tap to confirm. Had a beer? Log the ml.', tag: 'beer-checkin', url: '?beer=checkin' }
    : { title: '5pm check-in 🍺→💧', body: "Sparkling water's in the fridge. Crack one, then 20 minutes of training.", tag: 'beer-nudge', url: '?beer=log' });
  await reg.showNotification(msg.title, { body: msg.body, tag: msg.tag, icon: reg.scope + 'icon-192.png', data: { url: msg.url } });
}

// ── Message context for the service worker ────────────────────────────────────
function pad2(n) { return (n < 10 ? '0' : '') + n; }
export function localDayKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function localDayNum(d) { return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); }
function atLocal(base, addDays, hhmm) {
  const p = hhmm.split(':').map(Number);
  const d = new Date(base); d.setDate(d.getDate() + addDays); d.setHours(p[0], p[1], 0, 0);
  return d;
}

// Today + next 6 days of { nudge, checkin } messages. Future days assume no new
// beer, so the streak in the title keeps counting even if the app isn't opened.
export function buildNudgeContext(state, extras) {
  const cfg = normalizeBeerCfg(state.beerCfg);
  const ctx = Object.assign({ enabledModes: state.enabledModes }, extras || {});
  const now = new Date();
  const days = {};
  for (let i = 0; i < CONTEXT_DAYS; i++) {
    const tNudge = atLocal(now, i, cfg.notifyTime);
    const tCheck = atLocal(now, i, cfg.checkinTime);
    const key = localDayKey(tNudge);
    const seed = localDayNum(tNudge);
    const insN = computeBeerInsights(state.beerLog, cfg, tNudge, state.beerCheckins);
    const insC = computeBeerInsights(state.beerLog, cfg, tCheck, state.beerCheckins);
    const checkedIn = insC.checkins && insC.checkins.today;
    let checkin = composeBeerCheckin(insC, seed);
    if (checkedIn) {
      checkin = { title: checkedIn === 'dry' ? 'Checked in dry ✓ Day ' + insC.streak.current : 'Checked in for tonight ✓',
        body: checkedIn === 'dry' ? 'Already logged a dry evening. Water, food, early night.' : 'Already logged. Water from here, fresh start tomorrow.',
        tag: 'beer-checkin', url: '?beer=log' };
    }
    days[key] = { nudge: composeBeerNudge(insN, ctx, seed), checkin };
  }
  return { updatedAt: now.toISOString(), days };
}

function contextUrl() { return new URL(NUDGE_FILE, window.location.origin + swBase()).href; }

export async function saveNudgeContext(state, extras) {
  if (!('caches' in window) || !window.isSecureContext) return;
  try {
    const cache = await caches.open(NUDGE_CACHE);
    await cache.put(contextUrl(), new Response(JSON.stringify(buildNudgeContext(state, extras)), { headers: { 'Content-Type': 'application/json' } }));
  } catch (_) { /* best effort */ }
}

export async function readNudgeContext() {
  if (!('caches' in window)) return null;
  try { const r = await caches.match(contextUrl(), { cacheName: NUDGE_CACHE }); return r ? r.json() : null; }
  catch (_) { return null; }
}
