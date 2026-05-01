// Storage layer — auto-detects:
// - Standalone mode (GitHub Pages) → localStorage
// - VPS mode → API calls scoped by token in URL path

const STANDALONE = import.meta.env.VITE_STANDALONE === 'true';
const STORAGE_KEY = 'dadlift-standalone-state';

function getApiBase() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const token = parts[0] || '';
  const origin = window.location.origin;
  return token ? `${origin}/${token}` : origin;
}

async function apiReq(method, path, body) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

// Local storage helpers for standalone mode
function localGet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function localSet(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch(e) { console.error('localStorage write failed', e); }
}

// Public API — same shape regardless of mode
const api = STANDALONE ? {
  // Standalone: everything reads from / writes to localStorage
  getState:        async () => localGet(),
  saveState:       async (s) => { localSet(s); return { ok: true }; },
  // No-op stubs for structured table syncs (irrelevant in standalone)
  getWeights:      async () => ({}),
  bulkWeights:     async () => ({}),
  getProgressions: async () => ({}),
  setProgression:  async () => ({}),
  getDeloads:      async () => ({}),
  setDeload:       async () => ({}),
  clearDeloads:    async () => ({}),
  getHoldConfig:   async () => ({}),
  setHoldConfig:   async () => ({}),
} : {
  getState:        ()          => apiReq('GET',    '/api/state/main'),
  saveState:       (s)         => apiReq('PUT',    '/api/state/main', { value: s }),
  getWeights:      ()          => apiReq('GET',    '/api/lifts/weights'),
  setWeight:       (id, w8_kg) => apiReq('PUT',    `/api/lifts/weights/${id}`, { w8_kg }),
  bulkWeights:     (w)         => apiReq('PUT',    '/api/lifts/weights', w),
  getProgressions: ()          => apiReq('GET',    '/api/lifts/progressions'),
  setProgression:  (id, p)     => apiReq('PUT',    `/api/lifts/progressions/${id}`, p),
  getDeloads:      ()          => apiReq('GET',    '/api/lifts/deloads'),
  setDeload:       (id, f)     => apiReq('PUT',    `/api/lifts/deloads/${id}`, { flagged: f }),
  clearDeloads:    ()          => apiReq('DELETE', '/api/lifts/deloads'),
  getHoldConfig:   ()          => apiReq('GET',    '/api/holds/config'),
  setHoldConfig:   (id, cfg)   => apiReq('PUT',    `/api/holds/config/${id}`, cfg),
};

export default api;
