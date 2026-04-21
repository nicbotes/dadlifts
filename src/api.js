// API client for DADLIFT backend
// Set VITE_API_URL and VITE_API_KEY in .env.local

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const KEY  = import.meta.env.VITE_API_KEY  || '';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}`);
  return res.json();
}

const api = {
  // State — generic UI state persistence
  getState:  ()          => req('GET',  '/api/state/main'),
  saveState: (state)     => req('PUT',  '/api/state/main', { value: state }),

  // Weights
  getWeights:  ()              => req('GET', '/api/lifts/weights'),
  setWeight:   (id, w8_kg)     => req('PUT', `/api/lifts/weights/${id}`, { w8_kg }),
  bulkWeights: (weights)       => req('PUT', '/api/lifts/weights', weights),

  // Progressions
  getProgressions: ()           => req('GET', '/api/lifts/progressions'),
  setProgression:  (id, p)      => req('PUT', `/api/lifts/progressions/${id}`, p),

  // Deloads
  getDeloads:   ()              => req('GET',    '/api/lifts/deloads'),
  setDeload:    (id, flagged)   => req('PUT',    `/api/lifts/deloads/${id}`, { flagged }),
  clearDeloads: ()              => req('DELETE', '/api/lifts/deloads'),

  // Hold config
  getHoldConfig: ()             => req('GET', '/api/holds/config'),
  setHoldConfig: (id, cfg)      => req('PUT', `/api/holds/config/${id}`, cfg),

  // Sessions
  startSession:    (day, cycle, week) => req('POST', '/api/sessions', { schedule_day: day, cycle, week }),
  completeSession: (id)               => req('PATCH', `/api/sessions/${id}/complete`),
  getSessions:     (limit = 20)       => req('GET', `/api/sessions?limit=${limit}`),

  // Set logs
  logSet:  (sessionId, set) => req('POST', `/api/sessions/${sessionId}/sets`, set),
  logHold: (sessionId, h)   => req('POST', `/api/sessions/${sessionId}/holds`, h),

  // Analytics
  getLiftAnalytics: () => req('GET', '/api/lifts/analytics/lifts'),
  getHoldAnalytics: () => req('GET', '/api/holds/analytics'),
  getSummary:       () => req('GET', '/api/lifts/analytics/summary'),

  // Agent snapshot
  getSnapshot: () => req('GET', '/api/agent/snapshot'),
};

export default api;
