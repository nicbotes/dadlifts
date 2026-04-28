// API client — token is read from the URL path at runtime.
// URL shape: https://yourvps.com/:token/
// This means one build serves all users — no per-user builds needed.

function getBase() {
  // Extract token from pathname: /:token/...
  const parts = window.location.pathname.split('/').filter(Boolean);
  const token = parts[0] || '';
  const origin = window.location.origin;
  return token ? `${origin}/${token}` : origin;
}

async function req(method, path, body) {
  const res = await fetch(`${getBase()}${path}`, {
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
  getSummary:      ()          => req('GET',    '/api/lifts/analytics/summary'),
  getHoldAnalytics:()          => req('GET',    '/api/holds/analytics'),
  getSnapshot:     ()          => req('GET',    '/api/agent/snapshot'),
};

export default api;
