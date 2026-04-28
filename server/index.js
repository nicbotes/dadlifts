require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '1mb' }));
app.use(cors());
app.set('trust proxy', 1);

// Health — no auth
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── TOKEN ROUTER ──────────────────────────────────────────────────────────────
// All user routes live under /:token/
// Token must exist in the users table — otherwise 404
const userRouter = express.Router({ mergeParams: true });

// Inject token into every request, verify it exists
userRouter.use((req, res, next) => {
  const { token } = req.params;
  const user = db.prepare('SELECT name FROM users WHERE token = ?').get(token);
  if (!user) return res.status(404).end();
  req.token = token;
  req.user  = user;
  next();
});

// API routes — scoped to this user's token
userRouter.use('/api/lifts', require('./routes/lifts'));
userRouter.use('/api/holds', require('./routes/holds'));
userRouter.use('/api/state', require('./routes/state'));
userRouter.get('/api/health', (_req, res) => res.json({ ok: true }));

// Agent snapshot for this user
userRouter.get('/api/agent/snapshot', (req, res) => {
  try {
    const token = req.token;
    const weights     = db.prepare('SELECT lift_id, w8_kg FROM weights WHERE token = ?').all(token);
    const progs       = db.prepare('SELECT lift_id, inc_kg, inc_d_kg FROM progressions WHERE token = ?').all(token);
    const deloads     = db.prepare('SELECT lift_id FROM deloads WHERE token = ? AND flagged = 1').all(token);
    const sessions    = db.prepare('SELECT * FROM sessions WHERE token = ? ORDER BY created_at DESC LIMIT 10').all(token);
    const holdCfg     = db.prepare('SELECT * FROM hold_config WHERE token = ?').all(token);
    const liftSummary = db.prepare(`
      SELECT sl.lift_id,
        MAX(sl.weight_kg) AS all_time_max_kg,
        MAX(sl.weight_kg*(1+sl.reps/30.0)) AS all_time_est_1rm,
        COUNT(DISTINCT s.id) AS sessions_logged,
        SUM(CASE WHEN sl.status='fail' THEN 1 ELSE 0 END) AS total_fails
      FROM set_logs sl JOIN sessions s ON s.id = sl.session_id
      WHERE sl.token = ? GROUP BY sl.lift_id
    `).all(token);

    res.json({
      generated_at:    new Date().toISOString(),
      user:            req.user.name,
      weights:         Object.fromEntries(weights.map(r => [r.lift_id, r.w8_kg])),
      progressions:    Object.fromEntries(progs.map(r => [r.lift_id, { inc: r.inc_kg, incD: r.inc_d_kg }])),
      active_deloads:  deloads.map(r => r.lift_id),
      hold_config:     Object.fromEntries(holdCfg.map(r => [r.hold_id, r])),
      recent_sessions: sessions,
      lift_summary:    liftSummary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve built frontend — each token gets the same SPA
const DIST = path.join(__dirname, '../dist');
userRouter.use(express.static(DIST));
userRouter.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

// Mount under token path
app.use('/:token', userRouter);
app.use('*', (_req, res) => res.status(404).end());

app.listen(PORT, () => console.log(`DADLIFTS :${PORT} — multi-tenant`));
