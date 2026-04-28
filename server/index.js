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

// Agent snapshot — reads app_state blob and returns parsed summary
// This is the correct endpoint for agent queries. Structured tables are empty.
userRouter.get('/api/agent/snapshot', (req, res) => {
  try {
    const token = req.token;
    const row = db.prepare("SELECT value FROM app_state WHERE token=? AND key='main'").get(token);
    if (!row) return res.json({ error: 'no data yet — user has not opened the app' });

    const state = JSON.parse(row.value);
    const SCHED = [
      { label:'W1·D1', week:1 }, { label:'W1·D2', week:1 }, { label:'W1·D3', week:1 },
      { label:'W2·D1', week:2 }, { label:'W2·D2', week:2 }, { label:'W2·D3', week:2 },
    ];

    const sessionLog = state.sessionLog || [];
    const failLog    = state.failLog    || {};
    const deloads    = state.deloads    || {};

    // Build per-lift summary
    const liftSummary = {};
    sessionLog.forEach(session => {
      Object.keys(session.lifts || {}).forEach(id => {
        const e = session.lifts[id];
        if (!liftSummary[id]) liftSummary[id] = { sessions:0, allTimeMax:0, allTimeOrm:0, recentSessions:[] };
        liftSummary[id].sessions++;
        if (e.maxWeight > liftSummary[id].allTimeMax) liftSummary[id].allTimeMax = e.maxWeight;
        if (e.orm       > liftSummary[id].allTimeOrm)  liftSummary[id].allTimeOrm  = e.orm;
        liftSummary[id].recentSessions.push({
          cycle: session.cycle, day: SCHED[session.dayIdx]?.label,
          weight: e.weight, volume: e.volume, orm: e.orm,
        });
      });
    });
    Object.keys(liftSummary).forEach(id => {
      liftSummary[id].recentSessions = liftSummary[id].recentSessions.slice(-5);
    });

    // Parse fails by lift
    const failsByLift = {};
    Object.keys(failLog).forEach(key => {
      const parts = key.split('-');
      const liftId = parts.length === 4 ? parts[2] : parts[1];
      if (!failsByLift[liftId]) failsByLift[liftId] = [];
      failsByLift[liftId].push(failLog[key]);
    });

    const todayIdx = state.dayIdx || 0;

    res.json({
      note: 'All data from app_state blob. Structured tables are empty — ignore them.',
      user: req.user.name,
      generated_at: new Date().toISOString(),
      user_summary: {
        current_cycle: state.cycle || 1,
        current_day:   SCHED[todayIdx]?.label,
        total_sessions_logged: sessionLog.length,
      },
      current_weights:        state.weights || {},
      progression_increments: state.progs   || {},
      active_deloads: Object.keys(deloads).filter(id => deloads[id]),
      todays_sets:    (state.liftSets || {})[todayIdx] || {},
      lift_history:   liftSummary,
      current_cycle_fails: failsByLift,
      hold_config:    state.holdCfg || {},
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
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
