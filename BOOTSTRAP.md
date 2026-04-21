# BOOTSTRAP.md

**For agents setting up DADLIFT for a new user.**

This file tells you what to ask the human, what to do with their answers,
and how to get the app running for them.

---

## Step 1 — Ask the human these questions

Ask all of these before making any changes. You only need to do this once.

---

### About them

```
1. What's your name? (shown in the app)

2. What's your bodyweight in kg?

3. How tall are you in cm?

4. How old are you?

5. In one sentence — what's your training goal?
   (e.g. "get strong for my kids", "hit intermediate benchmarks", "age well")
```

---

### Barbell equipment

```
6. What does your barbell weigh? (standard is 20kg)

7. What plates do you have available?
   List them as pairs, e.g: 2.5kg, 5kg, 10kg, 20kg
   (This determines valid weight increments)
```

---

### Starting weights

For each lift, ask: *"What weight can you currently do for 8 reps with good form?"*
If they don't know, ask for a comfortable 5-rep weight and you can estimate.

```
8.  Deadlift    — 8-rep weight (kg)?  [or skip if they're a beginner]
9.  Back Squat  — 8-rep weight (kg)?
10. Bench Press — 8-rep weight (kg)?
11. OHP         — 8-rep weight (kg)?
12. Bent-Over Row — 8-rep weight (kg)?  [or mark as rehab if injured]
```

If any lift is currently injured or paused, note which one and why.

---

### Calisthenics

```
13. Do you want to include calisthenics / bodyweight skill work?
    (yes/no — if no, the cali section can be hidden)

    If yes, for each skill below, tell me where you currently are:

    FRONT LEVER
    Options: Can't do it yet / Tuck / Advanced Tuck / Straddle / Full
    → Current level?

    DEAD HANG
    → How long can you hang continuously? (seconds)

    HANDSTAND
    Options: Can't do it yet / Wall chest-to-wall holds / Kick-up attempts / Freestanding
    → Current level?

    WALL HANDSTAND PUSH-UP
    Options: Can't do it yet / Negatives only / Partial range / Full ROM / Strict
    → Current level?

    L-SIT
    Options: Can't do it yet / Tucked / One leg extended / Full L-sit
    → Current level?  How long can you hold? (seconds)

    MUSCLE-UP
    Options: Can't do it yet / False grip negatives / Kipping / Strict / Paused (injury)
    → Current level?

    Any other skills you want to track? (e.g. planche, back lever, ring work)
```

---

## Step 2 — Update config.json

Once you have their answers, update `config.json` in the repo root.

Key fields to change:

```json
{
  "user": {
    "name":           "their name",
    "bodyweight_kg":  their weight,
    "height_cm":      their height,
    "age":            their age,
    "goal":           "their goal in one sentence"
  },
  "equipment": {
    "bar_kg":      their bar weight,
    "plates_kg":   [list of plate sizes as pairs],
    "snap_to_kg":  smallest increment (= 2 × smallest plate)
  },
  "lifts": {
    "deadlift":  { "base8_kg": their 8-rep weight, ... },
    "squat":     { "base8_kg": ..., },
    "bench":     { "base8_kg": ..., },
    "ohp":       { "base8_kg": ..., },
    "rows":      { "base8_kg": null, "rehab": true }  ← if injured
  },
  "calisthenics": [
    update currentLevel, goal, note, def_secs/def_reps for each skill
  ]
}
```

The benchmarks section uses bodyweight multipliers (no change needed unless
you want to adjust the tiers — they auto-scale to the user's bodyweight).

---

## Step 3 — Deploy

```bash
# Generate URL token and configure server
node cli/setup.js --restart

# Build frontend (bakes config.json in at build time)
npm run build

# Restart server
pm2 restart dadlift
```

Read the `message` field from `cli/setup.js` output and send it to the user.
It contains their personal URL to save to the home screen.

---

## Step 4 — Tell them

Send the user:

1. Their app URL (from setup.js output)
2. Instructions: *Open in Safari → Share → Add to Home Screen*
3. A quick summary of their starting weights so they can confirm they look right

---

## Estimating starting weights (if they don't know)

If they give you a 5-rep weight, estimate 8-rep weight as ~90% of that.
If they're a complete beginner, use these conservative defaults:
- Deadlift: 60kg
- Squat: 50kg
- Bench: 40kg
- OHP: 30kg

Better to start light — the programme progresses quickly in the first few cycles.

---

## Notes on the programme

- Ivysaur 4-4-8 is a beginner/intermediate barbell programme, 3×/week
- It's appropriate for anyone who can train consistently with a barbell
- The calisthenics section is optional and independent
- Deload rule: 2 failed sets on the same lift → hold weight next cycle
- Minimum weight jump = 2 × smallest plate (e.g. 5kg if smallest plate is 2.5kg)
