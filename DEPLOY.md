# DEPLOY.md

## How DΔDLIFTS deploys

**Merge to `main`. That's the only way.**

`.github/workflows/pages.yml` runs on every push to `main`: it builds the
standalone PWA (`VITE_STANDALONE=true npm run build`) and publishes `dist/` to
GitHub Pages at https://nicbotes.github.io/dadlifts/.

The Express backend, CLI and VPS are no longer used — never deploy to them.

If a deploy fails, open the repo's **Actions** tab, find the failed
"Deploy PWA to GitHub Pages" run, fix the error it shows, and merge the fix.

---

## Beer notifications (4:35pm nudge, 7:30pm check-in)

No backend. `.github/workflows/beer-notify.yml` sends a tiny push
(`{ "kind": "nudge" }` or `{ "kind": "checkin" }`) on a schedule; the phone's
service worker shows today's message, which the app pre-computed on the phone.

| Run (UTC cron) | SAST  | What |
|----------------|-------|------|
| `31 14 * * *`  | 16:31 | 4:35pm nudge — something to do instead of a beer |
| `25 17 * * *`  | 19:25 | 7:30pm check-in — stayed dry or had beer? |

Scheduled runs often start a few minutes late, so both fire a few minutes early.
To change a time, edit the cron lines (UTC = SAST − 2h) and merge. For the
nudge, also change `NUDGE_TIME` in `src/beer.mjs` so the message is worked out
for the right moment.

### One-time setup

1. **Phone:** open https://nicbotes.github.io/dadlifts/ → on iPhone, Share →
   Add to Home Screen and open it from the icon (iOS 16.4+).
2. **App:** 🍺 → STATS → *Notifications* → **TURN ON** → **COPY KEY**.
3. **GitHub:** nicbotes/dadlifts → Settings → Secrets and variables → Actions →
   New repository secret:
   - `VAPID_PRIVATE_KEY` — the private key you were given (pairs with the
     public key in `src/push.js`).
   - `PUSH_SUBSCRIPTIONS` — paste the copied device key. It is a JSON list; for a
     second phone, put both objects in the same `[ … ]`.
4. **Test:** Actions → *Beer notifications* → **Run workflow** → pick nudge or
   checkin.

### Notes

- Until both secrets exist, the workflow logs a notice and exits green.
- A device that turns notifications off or reinstalls gets a new key; the run
  log warns "expired". Copy the new key into `PUSH_SUBSCRIPTIONS`.
- Messages are pre-computed for today and the next 6 days each time the app is
  opened or saved. If the app isn't opened for a week, a generic message is shown.
- GitHub disables scheduled workflows in a public repo after 60 days without
  any commits. Re-enable it from the Actions tab if that happens.
- The 7:30pm check-in card also appears in the app on its own after 19:30.
- To rotate keys: generate a new pair (`npx web-push generate-vapid-keys`),
  put the public key in `src/push.js`, the private key in `VAPID_PRIVATE_KEY`,
  merge, then turn notifications off and on again on each phone and update
  `PUSH_SUBSCRIPTIONS`.
