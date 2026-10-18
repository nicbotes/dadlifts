// Push notification routes — scoped to the user's token like every other route.
const express = require('express');
const router = express.Router();
const push = require('../push');

// Public VAPID key the browser needs to subscribe
router.get('/key', (_req, res) => {
  try { res.json({ publicKey: push.vapidKeys().publicKey }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Devices subscribed for this user
router.get('/status', (req, res) => {
  res.json({ devices: push.listSubscriptions(req.token) });
});

// POST { subscription: PushSubscriptionJSON }
router.post('/subscribe', (req, res) => {
  try {
    push.saveSubscription(req.token, req.body && req.body.subscription, req.get('user-agent'));
    res.json({ subscribed: true, devices: push.listSubscriptions(req.token).length });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// POST { endpoint }
router.post('/unsubscribe', (req, res) => {
  const endpoint = req.body && req.body.endpoint;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  res.json({ removed: push.removeSubscription(req.token, endpoint) });
});

// Send today's nudge to all of this user's devices right now
router.post('/test', async (req, res) => {
  try { res.json(await push.sendTest(req.token)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Preview the message without sending (agent/CLI)
router.get('/preview', async (req, res) => {
  try {
    const db = require('../db');
    const row = db.prepare("SELECT value FROM app_state WHERE token = ? AND key = 'main'").get(req.token);
    res.json(await push.buildPayload(row ? JSON.parse(row.value) : {}, new Date()));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
