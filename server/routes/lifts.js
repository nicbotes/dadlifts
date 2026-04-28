const express = require('express');
const router = express.Router();
const db = require('../db');

// ── WEIGHTS ───────────────────────────────────────────────────────────────────
router.get('/weights', (req, res) => {
  const rows = db.prepare('SELECT lift_id, w8_kg FROM weights WHERE token = ?').all(req.token);
  const out = {};
  rows.forEach(r => { out[r.lift_id] = r.w8_kg; });
  res.json(out);
});

router.put('/weights/:liftId', (req, res) => {
  const { w8_kg } = req.body;
  if (typeof w8_kg !== 'number') return res.status(400).json({ error: 'w8_kg required' });
  db.prepare(`
    INSERT INTO weights (token, lift_id, w8_kg, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(token, lift_id) DO UPDATE SET w8_kg = excluded.w8_kg, updated_at = excluded.updated_at
  `).run(req.token, req.params.liftId, w8_kg);
  res.json({ lift_id: req.params.liftId, w8_kg });
});

router.put('/weights', (req, res) => {
  const upsert = db.prepare(`
    INSERT INTO weights (token, lift_id, w8_kg, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(token, lift_id) DO UPDATE SET w8_kg = excluded.w8_kg, updated_at = excluded.updated_at
  `);
  const tx = db.transaction(weights => {
    for (const [liftId, w8_kg] of Object.entries(weights)) {
      upsert.run(req.token, liftId, w8_kg);
    }
  });
  tx(req.body);
  res.json({ updated: Object.keys(req.body).length });
});

// ── PROGRESSIONS ──────────────────────────────────────────────────────────────
router.get('/progressions', (req, res) => {
  const rows = db.prepare('SELECT lift_id, inc_kg, inc_d_kg FROM progressions WHERE token = ?').all(req.token);
  const out = {};
  rows.forEach(r => { out[r.lift_id] = { inc: r.inc_kg, incD: r.inc_d_kg }; });
  res.json(out);
});

router.put('/progressions/:liftId', (req, res) => {
  const { inc, incD } = req.body;
  db.prepare(`
    INSERT INTO progressions (token, lift_id, inc_kg, inc_d_kg, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(token, lift_id) DO UPDATE SET inc_kg = excluded.inc_kg, inc_d_kg = excluded.inc_d_kg, updated_at = excluded.updated_at
  `).run(req.token, req.params.liftId, inc, incD);
  res.json({ lift_id: req.params.liftId, inc, incD });
});

// ── DELOADS ───────────────────────────────────────────────────────────────────
router.get('/deloads', (req, res) => {
  const rows = db.prepare('SELECT lift_id, flagged FROM deloads WHERE token = ?').all(req.token);
  const out = {};
  rows.forEach(r => { out[r.lift_id] = !!r.flagged; });
  res.json(out);
});

router.put('/deloads/:liftId', (req, res) => {
  const { flagged } = req.body;
  db.prepare(`
    INSERT INTO deloads (token, lift_id, flagged, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(token, lift_id) DO UPDATE SET flagged = excluded.flagged, updated_at = excluded.updated_at
  `).run(req.token, req.params.liftId, flagged ? 1 : 0);
  res.json({ lift_id: req.params.liftId, flagged });
});

router.delete('/deloads', (req, res) => {
  db.prepare("UPDATE deloads SET flagged = 0, updated_at = datetime('now') WHERE token = ?").run(req.token);
  res.json({ cleared: true });
});

// ── SESSIONS + SET LOGS ───────────────────────────────────────────────────────
router.post('/sessions', (req, res) => {
  const { schedule_day, cycle, week } = req.body;
  const result = db.prepare(`
    INSERT INTO sessions (token, schedule_day, cycle, week) VALUES (?, ?, ?, ?)
  `).run(req.token, schedule_day, cycle, week);
  res.json({ id: result.lastInsertRowid, schedule_day, cycle, week });
});

router.patch('/sessions/:id/complete', (req, res) => {
  db.prepare('UPDATE sessions SET completed = 1 WHERE id = ? AND token = ?').run(req.params.id, req.token);
  res.json({ id: req.params.id, completed: true });
});

router.get('/sessions', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const rows = db.prepare('SELECT * FROM sessions WHERE token = ? ORDER BY created_at DESC LIMIT ?').all(req.token, limit);
  res.json(rows);
});

router.post('/sessions/:sessionId/sets', (req, res) => {
  const { lift_id, set_num, status, weight_kg, reps, is_amrap, achieved_kg, achieved_reps } = req.body;
  const result = db.prepare(`
    INSERT INTO set_logs (session_id, token, lift_id, set_num, status, weight_kg, reps, is_amrap, achieved_kg, achieved_reps)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.sessionId, req.token, lift_id, set_num, status, weight_kg, reps, is_amrap ? 1 : 0, achieved_kg ?? null, achieved_reps ?? null);
  res.json({ id: result.lastInsertRowid });
});

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
router.get('/analytics/lifts', (req, res) => {
  const rows = db.prepare(`
    SELECT s.id AS session_id, s.date, s.cycle, s.week, sl.lift_id,
      SUM(CASE WHEN sl.status='done' THEN sl.weight_kg*sl.reps
               WHEN sl.status='fail' AND sl.achieved_kg IS NOT NULL THEN sl.achieved_kg*sl.achieved_reps
               ELSE 0 END) AS volume_kg,
      MAX(sl.weight_kg) AS max_weight_kg,
      MAX(sl.weight_kg*(1+sl.reps/30.0)) AS est_1rm_kg
    FROM set_logs sl JOIN sessions s ON s.id = sl.session_id
    WHERE sl.token = ?
    GROUP BY s.id, sl.lift_id ORDER BY s.date ASC
  `).all(req.token);
  res.json(rows);
});

router.get('/analytics/summary', (req, res) => {
  const rows = db.prepare(`
    SELECT sl.lift_id,
      COUNT(DISTINCT s.id) AS sessions_logged,
      MAX(sl.weight_kg) AS all_time_max_kg,
      MAX(sl.weight_kg*(1+sl.reps/30.0)) AS all_time_est_1rm,
      SUM(CASE WHEN sl.status='fail' THEN 1 ELSE 0 END) AS total_fails,
      SUM(CASE WHEN sl.status='done' THEN 1 ELSE 0 END) AS total_done
    FROM set_logs sl JOIN sessions s ON s.id = sl.session_id
    WHERE sl.token = ?
    GROUP BY sl.lift_id
  `).all(req.token);
  res.json(rows);
});

module.exports = router;
