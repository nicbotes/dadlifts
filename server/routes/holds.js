const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/config', (req, res) => {
  const rows = db.prepare('SELECT * FROM hold_config WHERE token = ?').all(req.token);
  const out = {};
  rows.forEach(r => { out[r.hold_id] = { secs: r.target_secs, reps: r.target_reps, sets: r.sets, inc: r.inc }; });
  res.json(out);
});

router.put('/config/:holdId', (req, res) => {
  const { secs, reps, sets, inc } = req.body;
  db.prepare(`
    INSERT INTO hold_config (token, hold_id, target_secs, target_reps, sets, inc, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(token, hold_id) DO UPDATE SET
      target_secs = excluded.target_secs, target_reps = excluded.target_reps,
      sets = excluded.sets, inc = excluded.inc, updated_at = excluded.updated_at
  `).run(req.token, req.params.holdId, secs ?? null, reps ?? null, sets, inc);
  res.json({ hold_id: req.params.holdId, secs, reps, sets, inc });
});

router.post('/sessions/:sessionId/holds', (req, res) => {
  const { hold_id, set_num, status, target_secs, target_reps } = req.body;
  const result = db.prepare(`
    INSERT INTO hold_logs (session_id, token, hold_id, set_num, status, target_secs, target_reps)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.sessionId, req.token, hold_id, set_num, status, target_secs ?? null, target_reps ?? null);
  res.json({ id: result.lastInsertRowid });
});

router.get('/analytics', (req, res) => {
  const rows = db.prepare(`
    SELECT s.id AS session_id, s.date, s.cycle, hl.hold_id,
      hl.target_secs, hl.target_reps,
      SUM(CASE WHEN hl.status='done' THEN 1 ELSE 0 END) AS done_count,
      SUM(CASE WHEN hl.status='fail' THEN 1 ELSE 0 END) AS fail_count,
      SUM(CASE WHEN hl.status='done' THEN COALESCE(hl.target_secs,0) ELSE 0 END) AS total_hold_secs
    FROM hold_logs hl JOIN sessions s ON s.id = hl.session_id
    WHERE hl.token = ?
    GROUP BY s.id, hl.hold_id ORDER BY s.date ASC
  `).all(req.token);
  res.json(rows);
});

module.exports = router;
