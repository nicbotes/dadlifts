# DADLIFTS — Agent Instructions

## ⚠️ READ THIS FIRST

- **The app is a static PWA on GitHub Pages** (https://nicbotes.github.io/dadlifts/),
  built with `VITE_STANDALONE=true`. All data lives in the phone's browser
  (localStorage key `dadlift-standalone-state`).
- **The backend API is no longer used.** Do not build on, query, or deploy the
  Express server (`server/`), the CLI (`cli/`), or the VPS (13.245.82.245).
  Those files are legacy.
- **Deploy only by merging to `main`.** `.github/workflows/pages.yml` builds and
  publishes the site. Never deploy any other way (no `cli/deploy.js`, no SSH).

## Beer notifications

`.github/workflows/beer-notify.yml` sends Web Push at ~17:00 (nudge) and ~19:30
(check-in) SAST. Setup and how it works: DEPLOY.md and docs/BEER_TRACKER_PLAN.md.

## Before merging

```bash
VITE_STANDALONE=true npm run build   # must pass — it is what Pages builds
```
