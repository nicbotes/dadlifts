const express = require('express');
const router = express.Router();
const db = require('../db');

// GET full state for this user
router.get('/', (req, res) => {
  const { token } = req;
  const rows = db.prepare('SELECT key, value FROM app_state WHERE token = ?').all(token);
  const out = {};
  rows.forEach(r => {
    try { out[r.key] = JSON.parse(r.value); }
    catch { out[r.key] = r.value; }
  });
  res.json(out);
});

// GET specific key
router.get('/:key', (req, res) => {
  const { token } = req;
  const row = db.prepare('SELECT value FROM app_state WHERE token = ? AND key = ?').get(token, req.params.key);
  if (!row) return res.status(404).json({ error: 'not found' });
  try { res.json(JSON.parse(row.value)); }
  catch { res.json(row.value); }
});

// PUT a key
router.put('/:key', (req, res) => {
  const { token } = req;
  const value = JSON.stringify(req.body.value ?? req.body);
  db.prepare(`
    INSERT INTO app_state (token, key, value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(token, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(token, req.params.key, value);
  res.json({ key: req.params.key, saved: true });
});

module.exports = router;
