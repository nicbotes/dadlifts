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

`.github/workflows/beer-notify.yml` sends Web Push for the afternoon nudge and the
evening check-in. Crons are 12:31 and 15:25 SAST, set 4 hours early because
GitHub's scheduler has been running about 4 hours late. Setup and how it works: DEPLOY.md and docs/BEER_TRACKER_PLAN.md.

## Before merging

```bash
VITE_STANDALONE=true npm run build   # must pass — it is what Pages builds
```
