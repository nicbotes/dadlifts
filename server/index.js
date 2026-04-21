require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app   = express();
const PORT  = process.env.PORT  || 3001;
const TOKEN = process.env.DADLIFT_URL_TOKEN;

if (!TOKEN) {
  console.error('FATAL: DADLIFT_URL_TOKEN not set — run: node cli/setup.js --restart');
  process.exit(1);
}

app.use(express.json({ limit: '1mb' }));
app.use(cors());

// Everything lives under /:token/ — unguessable URL is the only auth
const r = express.Router();

// API routes
r.use('/api/lifts',  require('./routes/lifts'));
r.use('/api/holds',  require('./routes/holds'));
r.use('/api/state',  require('./routes/state'));
r.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Agent snapshot
r.get('/api/agent/snapshot', (req, res) => {
  const db = require('./db');
  try {
    const weights      = db.prepare('SELECT * FROM weights').all();
    const progressions = db.prepare('SELECT * FROM progressions').all();
    const deloads      = db.prepare('SELECT * FROM deloads WHERE flagged = 1').all();
    const sessions     = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10').all();
    const holdCfg      = db.prepare('SELECT * FROM hold_config').all();
    const liftSummary  = db.prepare(`
      SELECT sl.lift_id,
        MAX(sl.weight_kg) AS all_time_max_kg,
        MAX(sl.weight_kg * (1 + sl.reps / 30.0)) AS all_time_est_1rm,
        COUNT(DISTINCT s.id) AS sessions_logged,
        SUM(CASE WHEN sl.status='fail' THEN 1 ELSE 0 END) AS total_fails,
        SUM(CASE WHEN sl.status='done' THEN 1 ELSE 0 END) AS total_done
      FROM set_logs sl JOIN sessions s ON s.id = sl.session_id
      GROUP BY sl.lift_id
    `).all();
    const holdSummary  = db.prepare(`
      SELECT hl.hold_id,
        MAX(hl.target_secs) AS max_hold_secs,
        SUM(CASE WHEN hl.status='done' THEN 1 ELSE 0 END) AS total_done,
        SUM(CASE WHEN hl.status='fail' THEN 1 ELSE 0 END) AS total_fails
      FROM hold_logs hl GROUP BY hl.hold_id
    `).all();
    const recentLifts  = db.prepare(`
      SELECT sl.lift_id, MAX(sl.weight_kg) AS recent_max, s.date
      FROM set_logs sl JOIN sessions s ON s.id = sl.session_id
      WHERE s.date >= date('now', '-30 days')
      GROUP BY sl.lift_id
    `).all();
    res.json({
      generated_at:    new Date().toISOString(),
      weights:         Object.fromEntries(weights.map(r => [r.lift_id, r.w8_kg])),
      progressions:    Object.fromEntries(progressions.map(r => [r.lift_id, { inc: r.inc_kg, incD: r.inc_d_kg }])),
      active_deloads:  deloads.map(r => r.lift_id),
      hold_config:     Object.fromEntries(holdCfg.map(r => [r.hold_id, r])),
      recent_sessions: sessions,
      lift_summary:    liftSummary,
      hold_summary:    holdSummary,
      recent_30_days:  recentLifts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve built frontend under the token path
const DIST = path.join(__dirname, '../dist');
r.use(express.static(DIST));
r.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

// Mount everything under the token — any other path returns 404
app.use(`/${TOKEN}`, r);
app.use('*', (_req, res) => res.status(404).end());

app.listen(PORT, () => console.log(`DADLIFT :${PORT}/${TOKEN}/`));
