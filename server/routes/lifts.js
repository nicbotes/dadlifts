const express = require('express');
const router = express.Router();
const db = require('../db');

// ── WEIGHTS ───────────────────────────────────────────────────────────────────

// GET all current weights
router.get('/weights', (req, res) => {
  const rows = db.prepare('SELECT * FROM weights').all();
  const out = {};
  rows.forEach(r => { out[r.lift_id] = r.w8_kg; });
  res.json(out);
});

// PUT update weight for a lift
router.put('/weights/:liftId', (req, res) => {
  const { liftId } = req.params;
  const { w8_kg } = req.body;
  if (typeof w8_kg !== 'number') return res.status(400).json({ error: 'w8_kg required' });
  db.prepare(`
    INSERT INTO weights (lift_id, w8_kg, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(lift_id) DO UPDATE SET w8_kg = excluded.w8_kg, updated_at = excluded.updated_at
  `).run(liftId, w8_kg);
  res.json({ lift_id: liftId, w8_kg });
});

// PUT bulk update weights (used by advanceCycle)
router.put('/weights', (req, res) => {
  const weights = req.body; // { liftId: w8_kg, ... }
  const upsert = db.prepare(`
    INSERT INTO weights (lift_id, w8_kg, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(lift_id) DO UPDATE SET w8_kg = excluded.w8_kg, updated_at = excluded.updated_at
  `);
  const updateAll = db.transaction((weights) => {
    for (const [liftId, w8_kg] of Object.entries(weights)) {
      upsert.run(liftId, w8_kg);
    }
  });
  updateAll(weights);
  res.json({ updated: Object.keys(weights).length });
});

// ── PROGRESSIONS ──────────────────────────────────────────────────────────────

// GET all progressions
router.get('/progressions', (req, res) => {
  const rows = db.prepare('SELECT * FROM progressions').all();
  const out = {};
  rows.forEach(r => { out[r.lift_id] = { inc: r.inc_kg, incD: r.inc_d_kg }; });
  res.json(out);
});

// PUT update progression for a lift
router.put('/progressions/:liftId', (req, res) => {
  const { liftId } = req.params;
  const { inc, incD } = req.body;
  db.prepare(`
    INSERT INTO progressions (lift_id, inc_kg, inc_d_kg, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(lift_id) DO UPDATE SET inc_kg = excluded.inc_kg, inc_d_kg = excluded.inc_d_kg, updated_at = excluded.updated_at
  `).run(liftId, inc, incD);
  res.json({ lift_id: liftId, inc, incD });
});

// ── DELOADS ───────────────────────────────────────────────────────────────────

// GET all deload flags
router.get('/deloads', (req, res) => {
  const rows = db.prepare('SELECT * FROM deloads').all();
  const out = {};
  rows.forEach(r => { out[r.lift_id] = !!r.flagged; });
  res.json(out);
});

// PUT set deload flag for a lift
router.put('/deloads/:liftId', (req, res) => {
  const { liftId } = req.params;
  const { flagged } = req.body;
  db.prepare(`
    INSERT INTO deloads (lift_id, flagged, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(lift_id) DO UPDATE SET flagged = excluded.flagged, updated_at = excluded.updated_at
  `).run(liftId, flagged ? 1 : 0);
  res.json({ lift_id: liftId, flagged });
});

// DELETE clear all deloads (after cycle advance)
router.delete('/deloads', (req, res) => {
  db.prepare("UPDATE deloads SET flagged = 0, updated_at = datetime('now')").run();
  res.json({ cleared: true });
});

// ── SESSIONS ──────────────────────────────────────────────────────────────────

// POST start a new session
router.post('/sessions', (req, res) => {
  const { schedule_day, cycle, week } = req.body;
  const result = db.prepare(`
    INSERT INTO sessions (schedule_day, cycle, week)
    VALUES (?, ?, ?)
  `).run(schedule_day, cycle, week);
  res.json({ id: result.lastInsertRowid, schedule_day, cycle, week });
});

// PATCH mark session complete
router.patch('/sessions/:id/complete', (req, res) => {
  db.prepare('UPDATE sessions SET completed = 1 WHERE id = ?').run(req.params.id);
  res.json({ id: req.params.id, completed: true });
});

// GET session history (last N sessions)
router.get('/sessions', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const rows = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json(rows);
});

// ── SET LOGS ──────────────────────────────────────────────────────────────────

// POST log a set
router.post('/sessions/:sessionId/sets', (req, res) => {
  const { sessionId } = req.params;
  const { lift_id, set_num, status, weight_kg, reps, is_amrap } = req.body;
  const result = db.prepare(`
    INSERT INTO set_logs (session_id, lift_id, set_num, status, weight_kg, reps, is_amrap)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(sessionId, lift_id, set_num, status, weight_kg, reps, is_amrap ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

// PUT update a set (toggle done/fail)
router.put('/sets/:setId', (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE set_logs SET status = ?, logged_at = datetime('now') WHERE id = ?")
    .run(status, req.params.setId);
  res.json({ id: req.params.setId, status });
});

// GET all sets for a session
router.get('/sessions/:sessionId/sets', (req, res) => {
  const rows = db.prepare('SELECT * FROM set_logs WHERE session_id = ? ORDER BY lift_id, set_num')
    .all(req.params.sessionId);
  res.json(rows);
});

// ── ANALYTICS ─────────────────────────────────────────────────────────────────

// GET lift history — volume, max weight, estimated 1RM per session
router.get('/analytics/lifts', (req, res) => {
  const rows = db.prepare(`
    SELECT
      s.id          AS session_id,
      s.date,
      s.cycle,
      s.week,
      sl.lift_id,
      SUM(CASE WHEN sl.status = 'done' THEN sl.weight_kg * sl.reps ELSE 0 END) AS volume_kg,
      MAX(sl.weight_kg) AS max_weight_kg,
      MAX(sl.weight_kg * (1 + sl.reps / 30.0)) AS est_1rm_kg,
      SUM(CASE WHEN sl.status = 'fail' THEN 1 ELSE 0 END) AS fail_count,
      SUM(CASE WHEN sl.status = 'done' THEN 1 ELSE 0 END) AS done_count
    FROM set_logs sl
    JOIN sessions s ON s.id = sl.session_id
    WHERE sl.status IN ('done', 'fail')
    GROUP BY s.id, sl.lift_id
    ORDER BY s.date ASC, sl.lift_id
  `).all();
  res.json(rows);
});

// GET agent-friendly summary — "how is my deadlift going"
router.get('/analytics/summary', (req, res) => {
  const summary = db.prepare(`
    SELECT
      sl.lift_id,
      COUNT(DISTINCT s.id)  AS sessions_logged,
      MAX(sl.weight_kg)     AS all_time_max_kg,
      MAX(sl.weight_kg * (1 + sl.reps / 30.0)) AS all_time_est_1rm,
      SUM(CASE WHEN sl.status = 'fail' THEN 1 ELSE 0 END) AS total_fails,
      SUM(CASE WHEN sl.status = 'done' THEN 1 ELSE 0 END) AS total_done
    FROM set_logs sl
    JOIN sessions s ON s.id = sl.session_id
    GROUP BY sl.lift_id
  `).all();

  const recent = db.prepare(`
    SELECT sl.lift_id, MAX(sl.weight_kg) as recent_max, s.date
    FROM set_logs sl
    JOIN sessions s ON s.id = sl.session_id
    WHERE s.date >= date('now', '-30 days')
    GROUP BY sl.lift_id
  `).all();

  res.json({ summary, recent_30_days: recent });
});

module.exports = router;
