require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.DADLIFT_API_KEY;

if (!API_KEY) {
  console.error('FATAL: DADLIFT_API_KEY not set in .env');
  process.exit(1);
}

// Pre-hash the key — timingSafeEqual needs equal-length buffers.
// SHA-256 both sides so length is always 32 bytes regardless of key length.
const API_KEY_HASH = crypto.createHash('sha256').update(API_KEY).digest();

function timingSafeKeyCheck(provided) {
  if (!provided) return false;
  try {
    const h = crypto.createHash('sha256').update(provided).digest();
    return crypto.timingSafeEqual(API_KEY_HASH, h);
  } catch { return false; }
}

// ── RATE LIMITING ─────────────────────────────────────────────────────────────

// Auth failures: 10 attempts per 15 min per IP — only counts failures
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed auth attempts. Try again in 15 minutes.' },
});

// General: 300 req/min — generous for single user, blocks scanners
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded.' },
});

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

// Health — no auth
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Rate-limit before auth so failed attempts are always counted
app.use(authLimiter);

// Timing-safe auth — constant ~100ms on failure regardless of where comparison fails
app.use((req, res, next) => {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!timingSafeKeyCheck(token)) {
    return setTimeout(() => res.status(401).json({ error: 'Unauthorized' }), 100);
  }
  next();
});

app.use(apiLimiter);

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/lifts', require('./routes/lifts'));
app.use('/api/holds', require('./routes/holds'));
app.use('/api/state', require('./routes/state'));

// ── AGENT SNAPSHOT ────────────────────────────────────────────────────────────
// OpenClaw calls this for a complete training picture
app.get('/api/agent/snapshot', (req, res) => {
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
      generated_at:   new Date().toISOString(),
      weights:        Object.fromEntries(weights.map(r => [r.lift_id, r.w8_kg])),
      progressions:   Object.fromEntries(progressions.map(r => [r.lift_id, { inc: r.inc_kg, incD: r.inc_d_kg }])),
      active_deloads: deloads.map(r => r.lift_id),
      hold_config:    Object.fromEntries(holdCfg.map(r => [r.hold_id, r])),
      recent_sessions: sessions,
      lift_summary:   liftSummary,
      hold_summary:   holdSummary,
      recent_30_days: recentLifts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`DADLIFT API :${PORT}`));
