// Browser side of the daily beer nudge (Web Push).
// Works only in the server (VPS) build, over HTTPS. On iPhone the app must be
// added to the Home Screen first (iOS 16.4+) — Safari tabs cannot receive push.
import api from './api.js';

const STANDALONE = import.meta.env.VITE_STANDALONE === 'true';

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
// state: 'on' | 'off' | 'no-server' | 'insecure' | 'ios-install' | 'denied' | 'unsupported'
export async function pushStatus() {
  if (STANDALONE) return { state: 'no-server', reason: 'Notifications need the server version of the app (your personal link), not the GitHub Pages copy.' };
  if (!window.isSecureContext) return { state: 'insecure', reason: 'Notifications need HTTPS. Your app link starts with http://, so the phone blocks them. See DEPLOY.md → HTTPS.' };
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!hasApis) {
    if (isIos() && !isInstalled()) return { state: 'ios-install', reason: 'On iPhone: Share → Add to Home Screen, open DADLIFTS from the icon, then enable here. Needs iOS 16.4+.' };
    return { state: 'unsupported', reason: "This browser doesn't support web push notifications." };
  }
  if (Notification.permission === 'denied') return { state: 'denied', reason: 'Notifications are blocked for this app. Allow them in your phone settings, then come back.' };
  try {
    const reg = await registration();
    const sub = reg && (await reg.pushManager.getSubscription());
    return { state: sub ? 'on' : 'off', reason: '' };
  } catch (e) {
    return { state: 'unsupported', reason: 'Could not start notifications: ' + e.message };
  }
}

// Must be called straight from a tap (iOS needs the permission prompt in a user gesture).
export async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications blocked. Allow them in settings.' : 'Permission not granted.');
  const reg = await registration();
  const { publicKey } = await api.pushKey();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
  await api.pushSubscribe(sub.toJSON());
  return sub;
}

export async function disablePush() {
  const reg = await registration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) return;
  await api.pushUnsubscribe(sub.endpoint).catch(() => {});
  await sub.unsubscribe();
}

export async function testPush() {
  return api.pushTest();
}

export function deviceTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg'; }
  catch (_) { return 'Africa/Johannesburg'; }
}
