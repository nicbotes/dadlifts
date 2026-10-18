// Beer tracker routes — agent/CLI access to the beer log that lives in the
// app_state blob. The React app writes the blob directly; these routes let an
// agent log, resist, inspect and export without the UI, keeping the
// precalculated `beerInsights` in the blob fresh.
const express = require('express');
const router = express.Router();
const db = require('../db');

// Shared ESM module — loaded once via dynamic import (works from CJS on any modern Node)
let beerModP = null;
function beer() {
  if (!beerModP) beerModP = import('../../src/beer.mjs');
  return beerModP;
}

function readState(token) {
  const row = db.prepare("SELECT value FROM app_state WHERE token=? AND key='main'").get(token);
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

function writeState(token, state) {
  db.prepare(`
    INSERT INTO app_state (token, key, value, updated_at)
    VALUES (?, 'main', ?, datetime('now'))
    ON CONFLICT(token, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(token, JSON.stringify(state));
}

async function recompute(state) {
  const B = await beer();
  state.beerCfg = B.normalizeBeerCfg(state.beerCfg);
  state.beerLog = B.normalizeBeerLog(state.beerLog);
  state.beerInsights = B.computeBeerInsights(state.beerLog, state.beerCfg);
  return state;
}

// GET /api/beer — log + cfg + freshly computed insights
router.get('/', async (req, res) => {
  try {
    const state = readState(req.token);
    if (!state) return res.json({ error: 'no data yet — user has not opened the app' });
    const B = await beer();
    const cfg = B.normalizeBeerCfg(state.beerCfg);
    const log = B.normalizeBeerLog(state.beerLog);
    res.json({ cfg, log, insights: B.computeBeerInsights(log, cfg) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/beer/insights — precalculated block only
router.get('/insights', async (req, res) => {
  try {
    const state = readState(req.token);
    if (!state) return res.json({ error: 'no data yet' });
    const B = await beer();
    res.json(B.computeBeerInsights(state.beerLog, state.beerCfg));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/beer/log  { ml?, abv?, ts?, trigger?, note?, resisted?, swap? }
// ml omitted → cfg.sizeMl. resisted:true → an urge beaten (ml forced to 0).
router.post('/log', async (req, res) => {
  try {
    const state = readState(req.token);
    if (!state) return res.status(404).json({ error: 'no data yet — user has not opened the app' });
    const B = await beer();
    const cfg = B.normalizeBeerCfg(state.beerCfg);
    const entry = B.makeEntry(req.body || {}, cfg);
    state.beerLog = B.normalizeBeerLog(state.beerLog).concat([entry]);
    if (!cfg.startDate) cfg.startDate = B.dayKey(entry.ts, entry.tzOff, cfg.rolloverHour);
    state.beerCfg = cfg;
    await recompute(state);
    writeState(req.token, state);
    res.json({ saved: true, entry, insights: state.beerInsights });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/beer/log/:id
router.delete('/log/:id', async (req, res) => {
  try {
    const state = readState(req.token);
    if (!state) return res.status(404).json({ error: 'no data yet' });
    const before = (state.beerLog || []).length;
    state.beerLog = (state.beerLog || []).filter(e => e && e.id !== req.params.id);
    if (state.beerLog.length === before) return res.status(404).json({ error: 'entry not found' });
    await recompute(state);
    writeState(req.token, state);
    res.json({ deleted: req.params.id, insights: state.beerInsights });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/beer/cfg — partial update
router.put('/cfg', async (req, res) => {
  try {
    const state = readState(req.token);
    if (!state) return res.status(404).json({ error: 'no data yet' });
    const B = await beer();
    state.beerCfg = B.normalizeBeerCfg(Object.assign({}, state.beerCfg || {}, req.body || {}));
    await recompute(state);
    writeState(req.token, state);
    res.json({ saved: true, cfg: state.beerCfg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/beer/export.csv | export.json
router.get('/export.csv', async (req, res) => {
  try {
    const state = readState(req.token) || {};
    const B = await beer();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="beer-log.csv"');
    res.send(B.beerLogToCsv(state.beerLog, state.beerCfg));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/export.json', async (req, res) => {
  try {
    const state = readState(req.token) || {};
    const B = await beer();
    res.setHeader('Content-Disposition', 'attachment; filename="beer-log.json"');
    res.json(B.beerExportJson(state.beerLog, state.beerCfg));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
