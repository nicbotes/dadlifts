require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.DADLIFT_API_KEY;

if (!API_KEY) {
  console.error('FATAL: DADLIFT_API_KEY not set in .env');
  process.exit(1);
}

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*',
}));
app.use(express.json());

// Auth — simple bearer key
app.use((req, res, next) => {
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/lifts', require('./routes/lifts'));
app.use('/api/holds', require('./routes/holds'));
app.use('/api/state', require('./routes/state'));

// Health check (no auth)
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── AGENT ENDPOINT ────────────────────────────────────────────────────────────
// Single endpoint for OpenClaw to get a full picture of training state
app.get('/api/agent/snapshot', (req, res) => {
  const db = require('./db');
  try {
    const weights     = db.prepare('SELECT * FROM weights').all();
    const progressions = db.prepare('SELECT * FROM progressions').all();
    const deloads     = db.prepare('SELECT * FROM deloads WHERE flagged = 1').all();
    const sessions    = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10').all();
    const liftSummary = db.prepare(`
      SELECT
        sl.lift_id,
        MAX(sl.weight_kg) as all_time_max_kg,
        MAX(sl.weight_kg * (1 + sl.reps / 30.0)) as all_time_est_1rm,
        COUNT(DISTINCT s.id) as sessions_logged,
        SUM(CASE WHEN sl.status = 'fail' THEN 1 ELSE 0 END) as total_fails
      FROM set_logs sl
      JOIN sessions s ON s.id = sl.session_id
      GROUP BY sl.lift_id
    `).all();
    const holdSummary = db.prepare(`
      SELECT
        hl.hold_id,
        MAX(hl.target_secs) as max_hold_secs,
        SUM(CASE WHEN hl.status = 'done' THEN 1 ELSE 0 END) as total_done,
        SUM(CASE WHEN hl.status = 'fail' THEN 1 ELSE 0 END) as total_fails
      FROM hold_logs hl
      GROUP BY hl.hold_id
    `).all();

    res.json({
      generated_at: new Date().toISOString(),
      weights:      Object.fromEntries(weights.map(r => [r.lift_id, r.w8_kg])),
      progressions: Object.fromEntries(progressions.map(r => [r.lift_id, { inc: r.inc_kg, incD: r.inc_d_kg }])),
      active_deloads: deloads.map(r => r.lift_id),
      recent_sessions: sessions,
      lift_summary: liftSummary,
      hold_summary: holdSummary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`DADLIFT API running on :${PORT}`);
});
