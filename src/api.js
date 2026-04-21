// API client — BASE already contains the token path (set at build time)
// e.g. VITE_API_BASE = https://yourvps.com/xK9mP2vQr8nL4...
const BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3001').replace(/\/$/, '');

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

const api = {
  getState:        ()          => req('GET',    '/api/state/main'),
  saveState:       (s)         => req('PUT',    '/api/state/main', { value: s }),
  getWeights:      ()          => req('GET',    '/api/lifts/weights'),
  setWeight:       (id, w8_kg) => req('PUT',    `/api/lifts/weights/${id}`, { w8_kg }),
  bulkWeights:     (w)         => req('PUT',    '/api/lifts/weights', w),
  getProgressions: ()          => req('GET',    '/api/lifts/progressions'),
  setProgression:  (id, p)     => req('PUT',    `/api/lifts/progressions/${id}`, p),
  getDeloads:      ()          => req('GET',    '/api/lifts/deloads'),
  setDeload:       (id, f)     => req('PUT',    `/api/lifts/deloads/${id}`, { flagged: f }),
  clearDeloads:    ()          => req('DELETE', '/api/lifts/deloads'),
  getHoldConfig:   ()          => req('GET',    '/api/holds/config'),
  setHoldConfig:   (id, cfg)   => req('PUT',    `/api/holds/config/${id}`, cfg),
  startSession:    (d, c, w)   => req('POST',   '/api/sessions', { schedule_day: d, cycle: c, week: w }),
  completeSession: (id)        => req('PATCH',  `/api/sessions/${id}/complete`),
  getSessions:     (n = 20)    => req('GET',    `/api/sessions?limit=${n}`),
  logSet:          (sid, s)    => req('POST',   `/api/sessions/${sid}/sets`, s),
  logHold:         (sid, h)    => req('POST',   `/api/sessions/${sid}/holds`, h),
  getLiftAnalytics:()          => req('GET',    '/api/lifts/analytics/lifts'),
  getHoldAnalytics:()          => req('GET',    '/api/holds/analytics'),
  getSummary:      ()          => req('GET',    '/api/lifts/analytics/summary'),
  getSnapshot:     ()          => req('GET',    '/api/agent/snapshot'),
};

export default api;
