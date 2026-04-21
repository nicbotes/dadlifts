const express = require('express');
const router = express.Router();
const db = require('../db');

// GET full app state
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM app_state').all();
  const out = {};
  rows.forEach(r => {
    try { out[r.key] = JSON.parse(r.value); }
    catch { out[r.key] = r.value; }
  });
  res.json(out);
});

// PUT a key
router.put('/:key', (req, res) => {
  const { key } = req.params;
  const value = JSON.stringify(req.body.value ?? req.body);
  db.prepare(`
    INSERT INTO app_state (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value);
  res.json({ key, saved: true });
});

// GET a specific key
router.get('/:key', (req, res) => {
  const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get(req.params.key);
  if (!row) return res.status(404).json({ error: 'not found' });
  try { res.json(JSON.parse(row.value)); }
  catch { res.json(row.value); }
});

module.exports = router;
