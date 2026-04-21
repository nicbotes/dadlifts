import { useState, useRef, useEffect } from "react";

// ── PLATE MATH — from config.json ────────────────────────────────────────────
import CFG from "../config.json";
const BAR    = CFG.equipment.bar_kg;
const SNAP   = CFG.equipment.snap_to_kg;
const PLATES = [...CFG.equipment.plates_kg].sort((a,b) => b-a);
const snap5  = x => Math.round(x / SNAP) * SNAP;
const validW = w => Math.max(BAR, snap5(w));
function plates(kg) {
  let load = (kg - BAR) / 2;
  if (load <= 0) return "bar only";
  const used = [];
  PLATES.forEach(p => {
    while (load >= p - 0.01) { used.push(p); load = Math.round((load - p) * 10) / 10; }
  });
  return used.length ? used.join(" + ") + " /side" : "bar only";
}

// ── STORAGE ──────────────────────────────────────────────────────────────────
// API-backed persistence. Falls back gracefully if server unreachable.
import api from './api.js';
const IS_DEV = window.location.search.includes("dev");

async function load() {
  try {
    const [state, weights, progs, deloads, holdCfg] = await Promise.all([
      api.getState().catch(() => ({})),
      api.getWeights().catch(() => ({})),
      api.getProgressions().catch(() => ({})),
      api.getDeloads().catch(() => ({})),
      api.getHoldConfig().catch(() => ({})),
    ]);
    return {
      ...state,
      ...(Object.keys(weights).length && { weights }),
      ...(Object.keys(progs).length   && { progs }),
      ...(Object.keys(deloads).length && { deloads }),
      ...(Object.keys(holdCfg).length && { holdCfg }),
    };
  } catch { return null; }
}

async function save(s) {
  try {
    await api.saveState(s);
    if (s.weights) await api.bulkWeights(s.weights);
    if (s.deloads) {
      await Promise.all(
        Object.entries(s.deloads).map(([id, flagged]) => api.setDeload(id, flagged))
      );
    }
  } catch { /* server unreachable — UI continues */ }
}

async function wipeDev() {
  try { await api.saveState({}); } catch {}
}

// ── MOTIVATIONS ──────────────────────────────────────────────────────────────
// Real quotes only, properly attributed. One per week by year-week number.
// Voices: Aurelius · Epictetus · Seneca · Watts · Herbert · Goggins · Campbell
//         Nietzsche · Dylan Thomas · Nhat Hanh · original purpose lines for the boys.
const MOTIVATIONS = [
  // MARCUS AURELIUS
  { q: "You have power over your mind, not outside events. Realise this, and you will find strength.", a: "Marcus Aurelius" },
  { q: "The impediment to action advances action. What stands in the way becomes the way.", a: "Marcus Aurelius" },
  { q: "Waste no more time arguing what a good man should be. Be one.", a: "Marcus Aurelius" },
  { q: "It is not death that a man should fear, but he should fear never beginning to live.", a: "Marcus Aurelius" },
  { q: "Do not indulge in expectations. The present is enough. The work is enough.", a: "Marcus Aurelius" },
  { q: "Confine yourself to the present.", a: "Marcus Aurelius" },
  { q: "The best revenge is to be unlike him who performed the injury.", a: "Marcus Aurelius" },
  { q: "Accept the things to which fate binds you, and love the people with whom fate brings you together.", a: "Marcus Aurelius" },
  { q: "If it is not right, do not do it; if it is not true, do not say it.", a: "Marcus Aurelius" },
  { q: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", a: "Marcus Aurelius" },
  { q: "The first rule is to keep an untroubled spirit. The second is to look things in the face and know them for what they are.", a: "Marcus Aurelius" },

  // EPICTETUS
  { q: "Make the best use of what is in your power, and take the rest as it happens.", a: "Epictetus" },
  { q: "First say to yourself what you would be; then do what you have to do.", a: "Epictetus" },
  { q: "It's not what happens to you, but how you react to it that matters.", a: "Epictetus" },
  { q: "Seek not the good in external things; seek it in yourself.", a: "Epictetus" },
  { q: "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.", a: "Epictetus" },
  { q: "No man is free who is not master of himself.", a: "Epictetus" },
  { q: "Wealth consists not in having great possessions, but in having few wants.", a: "Epictetus" },

  // SENECA
  { q: "We suffer more in imagination than in reality.", a: "Seneca" },
  { q: "Luck is what happens when preparation meets opportunity.", a: "Seneca" },
  { q: "It is not the man who has too little, but the man who craves more, that is poor.", a: "Seneca" },
  { q: "Begin at once to live, and count each separate day as a separate life.", a: "Seneca" },
  { q: "Difficulties strengthen the mind, as labour does the body.", a: "Seneca" },
  { q: "Retire into yourself as much as you can. Associate with those who will make a better man of you.", a: "Seneca" },
  { q: "Life is long if you know how to use it.", a: "Seneca" },
  { q: "The part of life we really live is small. All the rest of existence is not life but merely time.", a: "Seneca" },

  // ALAN WATTS
  { q: "The only way to make sense out of change is to plunge into it, move with it, and join the dance.", a: "Alan Watts" },
  { q: "You are under no obligation to be the same person you were five minutes ago.", a: "Alan Watts" },
  { q: "The art of living is neither careless drifting on the one hand nor fearful clinging on the other.", a: "Alan Watts" },
  { q: "No valid plans for the future can be made by those who have no capacity for living now.", a: "Alan Watts" },
  { q: "The present moment is the only moment available to us, and it is the door to all moments.", a: "Thich Nhat Hanh" },

  // FRANK HERBERT — DUNE
  { q: "I must not fear. Fear is the mind-killer. Fear is the little-death that brings total obliteration. I will face my fear.", a: "Frank Herbert, Dune" },
  { q: "The mystery of life isn't a problem to solve, but a reality to experience.", a: "Frank Herbert, Dune" },
  { q: "Without change, something sleeps inside us and seldom awakens. The sleeper must awaken.", a: "Frank Herbert, Dune" },
  { q: "Survival is the ability to swim in strange water.", a: "Frank Herbert" },
  { q: "The slow blade penetrates the shield.", a: "Frank Herbert, Dune" },
  { q: "There is no escape — we pay for the violence of our ancestors.", a: "Frank Herbert, Dune" },

  // DAVID GOGGINS
  { q: "We all have the ability to come from nothing to something.", a: "David Goggins" },
  { q: "The most important conversation you'll ever have is the one you have with yourself.", a: "David Goggins" },
  { q: "You are stopping at 40% of what you actually have. The 40% rule.", a: "David Goggins" },
  { q: "Denial is the ultimate comfort zone.", a: "David Goggins" },
  { q: "Life is one long mental journey. You have to be willing to suffer.", a: "David Goggins" },

  // NIETZSCHE
  { q: "He who has a why to live can bear almost any how.", a: "Friedrich Nietzsche" },
  { q: "That which does not kill us makes us stronger.", a: "Friedrich Nietzsche" },
  { q: "The secret for harvesting from existence the greatest fruitfulness and the greatest enjoyment is — to live dangerously.", a: "Friedrich Nietzsche" },
  { q: "One must still have chaos in oneself to be able to give birth to a dancing star.", a: "Friedrich Nietzsche" },

  // JOSEPH CAMPBELL
  { q: "The cave you fear to enter holds the treasure you seek.", a: "Joseph Campbell" },
  { q: "The privilege of a lifetime is being who you are.", a: "Joseph Campbell" },
  { q: "A hero is someone who has given his life to something bigger than himself.", a: "Joseph Campbell" },
  { q: "We must let go of the life we have planned, so as to accept the one that is waiting for us.", a: "Joseph Campbell" },
  { q: "Find a place inside where there's joy, and the joy will burn out the pain.", a: "Joseph Campbell" },

  // DYLAN THOMAS
  { q: "Do not go gentle into that good night. Rage, rage against the dying of the light.", a: "Dylan Thomas" },

  // PURPOSE — originals for the boys (these stay)
  { q: "You are not training for you. You are training for two people who don't know it yet.", a: null },
  { q: "They will remember the dad who showed up — in the park, in the pool, on the floor. Build that dad.", a: null },
  { q: "Two boys. Twenty years. Three sessions a week. Do the math.", a: null },
  { q: "Every rep is a deposit into an account your sons will draw from for decades.", a: null },
  { q: "The weight you lift today is the energy you'll have to chase them at seven.", a: null },
  { q: "Strong fathers raise strong children. Not by telling them — by showing them.", a: null },
];

// Returns a deterministic quote for the current week number of the year
function weeklyMotivation() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  return MOTIVATIONS[week % MOTIVATIONS.length];
}
const DE = ["💪","🔥","⚡","🏋️","💥","🦾","👊","🎯","🚀","🔱","💫","🏆"];
const HE = ["🧘","⏱️","🫁","🔥","💪","⚡","🎯","🏔️","🦅","🌊"];
const FL = ["YOU GOT THIS","COME ON","NEXT ONE","STAY IN IT","FIGHT BACK","THAT'S GROWTH","GRIND TIME","RESET & GO"];
const pick = a => a[Math.floor(Math.random() * a.length)];
let bid = 0;
function doneBurst(cx, cy, emojis) {
  return Array.from({ length: 9 }, () => ({
    id: bid++, type: "done", emoji: pick(emojis), x: cx, y: cy,
    dx: (Math.random() - .5) * 260, dy: -(Math.random() * 200 + 50),
    rot: (Math.random() - .5) * 500, sc: .65 + Math.random() * .8,
  }));
}
function failBurst(cx, cy) {
  return [{ id: bid++, type: "fail", text: pick(FL), x: cx, y: cy }];
}
const BL = new Set();
function emit(p) { BL.forEach(fn => fn(p)); }

function BurstOverlay() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const h = p => {
      setItems(prev => [...prev, ...p]);
      setTimeout(() => setItems(prev => prev.filter(x => !p.find(y => y.id === x.id))), 950);
    };
    BL.add(h); return () => BL.delete(h);
  }, []);
  if (!items.length) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {items.map(p => p.type === "done"
        ? <div key={p.id} style={{
            position: "absolute", left: p.x, top: p.y,
            fontSize: `${20 * p.sc}px`, lineHeight: 1,
            animation: "bfly .85s cubic-bezier(.2,.8,.4,1) forwards",
            "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--rot": `${p.rot}deg`,
          }}>{p.emoji}</div>
        : <div key={p.id} style={{
            position: "absolute", left: p.x - 80, top: p.y, width: 160,
            textAlign: "center", fontFamily: "'Nunito',sans-serif",
            fontSize: 21, letterSpacing: 3, color: "#d94f4f",
            textShadow: "0 0 20px #d94f4f88",
            animation: "frise .9s cubic-bezier(.2,.8,.4,1) forwards",
          }}>{p.text}</div>
      )}
    </div>
  );
}

// ── BARBELL DATA ─────────────────────────────────────────────────────────────
// Lifts from config.json
const LIFTS = Object.fromEntries(
  Object.entries(CFG.lifts).map(([id, l]) => [id, {
    name:    l.name,
    abbr:    l.abbr,
    color:   l.color,
    base8:   l.base8_kg,
    defInc:  l.def_inc_kg,
    defIncD: l.def_inc_double_kg,
    rehab:   l.rehab || false,
  }])
);

const SCHED = [
  { week: 1, label: "W1·D1", lifts: [{ id: "bench", sets: 4, reps: 4, type: "4rep" }, { id: "squat", sets: 4, reps: 8, type: "8rep" }, { id: "ohp", sets: 4, reps: 8, type: "8rep" }, { id: "rows", sets: 4, reps: 8, type: "8rep" }] },
  { week: 1, label: "W1·D2", lifts: [{ id: "bench", sets: 4, reps: 8, type: "8rep" }, { id: "deadlift", sets: 4, reps: 4, type: "4rep" }, { id: "ohp", sets: 4, reps: 4, type: "4rep" }, { id: "rows", sets: 4, reps: 8, type: "8rep" }] },
  { week: 1, label: "W1·D3", lifts: [{ id: "bench", sets: 3, reps: 4, type: "4rep", amrap: true }, { id: "squat", sets: 3, reps: 4, type: "4rep", amrap: true }, { id: "ohp", sets: 4, reps: 8, type: "8rep" }, { id: "rows", sets: 4, reps: 4, type: "4rep" }] },
  { week: 2, label: "W2·D1", lifts: [{ id: "bench", sets: 4, reps: 8, type: "8rep" }, { id: "deadlift", sets: 4, reps: 8, type: "8rep" }, { id: "ohp", sets: 4, reps: 4, type: "4rep" }, { id: "rows", sets: 4, reps: 4, type: "4rep" }] },
  { week: 2, label: "W2·D2", lifts: [{ id: "bench", sets: 4, reps: 4, type: "4rep" }, { id: "squat", sets: 4, reps: 8, type: "8rep" }, { id: "ohp", sets: 4, reps: 8, type: "8rep" }, { id: "rows", sets: 4, reps: 8, type: "8rep" }] },
  { week: 2, label: "W2·D3", lifts: [{ id: "bench", sets: 4, reps: 8, type: "8rep" }, { id: "deadlift", sets: 3, reps: 4, type: "4rep", amrap: true }, { id: "ohp", sets: 3, reps: 4, type: "4rep", amrap: true }, { id: "rows", sets: 4, reps: 8, type: "8rep" }] },
];

const epley = (w, r) => r === 1 ? w : validW(w * (1 + r / 30));
const w4from8 = w8 => validW((w8 / .72) * .8);

function buildLiftHistory(progs, currentWeights) {
  return Array.from({ length: 12 }, (_, s) => {
    const day = SCHED[s % 6];
    const lifts = {};
    day.lifts.forEach(sl => {
      if (LIFTS[sl.id].rehab) return;
      const baseW = currentWeights?.[sl.id] ?? LIFTS[sl.id].base8;
      const inc = progs[sl.id]?.inc ?? LIFTS[sl.id].defInc;
      const w8 = validW(baseW - (11 - s) * (inc * 0.4));
      const w = sl.type === "4rep" ? w4from8(w8) : w8;
      const tr = sl.sets * sl.reps + (sl.amrap ? 6 : 0);
      lifts[sl.id] = { weight: w, volume: w * tr, maxWeight: w, orm: epley(w, sl.reps) };
    });
    return { s, lifts };
  });
}

function initLiftSets() {
  const s = {};
  SCHED.forEach((day, i) => {
    s[i] = {};
    day.lifts.forEach(sl => { s[i][sl.id] = Array(sl.sets + (sl.amrap ? 1 : 0)).fill("idle"); });
  });
  return s;
}

// ── CALISTHENICS CONFIG — from config.json ──────────────────────────────────────
// To advance a skill: edit config.json and redeploy.
const CALI_CONFIG = CFG.calisthenics.map(h => ({
  ...h,
  defSecs:  h.def_secs,
  defSets:  h.def_sets,
  defInc:   h.def_inc,
  isReps:   h.is_reps,
  defReps:  h.def_reps ?? 0,
}));
// Build HOLDS lookup from config
const HOLDS = Object.fromEntries(CALI_CONFIG.map(h => [h.id, h]));

function initHoldCfg() {
  const c = {};
  Object.entries(HOLDS).forEach(([id, h]) => {
    c[id] = { secs: h.defSecs, sets: h.defSets, inc: h.defInc, reps: h.defReps ?? 1 };
  });
  return c;
}

function initHoldSets(cfg) {
  const s = {};
  Object.entries(HOLDS).forEach(([id, h]) => {
    const sets = h.rehab ? 0 : (cfg?.[id]?.sets ?? h.defSets);
    s[id] = Array(sets).fill("idle");
  });
  return s;
}

function buildHoldHistory(holdCfg) {
  return Array.from({ length: 12 }, (_, s) => {
    const holds = {};
    Object.entries(HOLDS).forEach(([id, h]) => {
      const cfg = holdCfg[id];
      const target = cfg.secs ?? 0;
      const inc = cfg.inc ?? h.defInc;
      const past = Math.max(1, target - (11 - s) * (inc * 0.35));
      holds[id] = { secs: Math.round(past), sets: cfg.sets, totalTime: Math.round(past) * cfg.sets };
    });
    return { s, holds };
  });
}

// ── DEFAULT STATE ─────────────────────────────────────────────────────────────
function mkDefault() {
  const holdCfg = initHoldCfg();
  // Working weights stored in state so progression can be tracked
  const weights = {};
  Object.entries(LIFTS).forEach(([id, l]) => {
    weights[id] = l.base8 ? validW(l.base8) : null;
  });
  return {
    mode: 0, bbTab: 0, caliTab: 0, dayIdx: 0,
    liftSets: initLiftSets(),
    deloads: {},
    weights, // current w8 per lift — source of truth
    progs: Object.fromEntries(Object.entries(LIFTS).map(([id, l]) => [id, { inc: l.defInc, incD: l.defIncD }])),
    holdCfg,
    holdSets: initHoldSets(holdCfg),
  };
}

// ── STYLES ───────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@900&family=Space+Mono:wght@400;700&family=Fraunces:ital,opsz,wght@1,9..144,900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#FAFAF5;--card:#FFFFFF;--lift:#F4F4EE;--rule:#E0E0D8;
  --ink:#111111;--mid:#666666;--sub:#999999;--light:#E8E8E0;
  --green:#06C270;--green-bg:#DCFCE7;
  --red:#FF3B3B;--red-bg:#FEE2E2;
  --yellow:#FFD93D;--yellow-bg:#FFF9C4;
  --orange:#FF5C00;--purple:#8B5CF6;--blue:#0085FF;--teal:#2DD4BF;
}
html{-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--ink);font-family:'Space Mono',monospace;font-size:13px;-webkit-font-smoothing:antialiased;overscroll-behavior:none}

/* top bar */
.bar{display:flex;align-items:center;gap:8px;padding:0 14px;height:56px;background:var(--bg);border-bottom:3px solid var(--ink);position:sticky;top:0;z-index:50;overflow:hidden}
.bar-title{font-family:'Nunito',sans-serif;font-size:28px;font-weight:900;letter-spacing:-1px;flex-shrink:0;line-height:1}
.bar-title .dl{background:var(--ink);color:var(--orange);padding:0 5px 2px;border-radius:4px}
.bar-gap{flex:1;min-width:0}
.sdot{width:8px;height:8px;border-radius:50%;background:var(--light);border:2px solid var(--rule);transition:all .3s;flex-shrink:0}
.sdot.on{background:var(--green);border-color:var(--green)}
.mtabs{display:flex;border:3px solid var(--ink);border-radius:100px;overflow:hidden;flex-shrink:0;box-shadow:2px 2px 0 var(--ink)}
.mtab{padding:0 10px;height:34px;font-size:16px;background:var(--card);color:var(--mid);border:none;cursor:pointer;transition:background .1s;-webkit-tap-highlight-color:transparent;flex-shrink:0}
.mtab.on{color:#fff}
.stabs{display:flex;border:3px solid var(--ink);border-radius:100px;overflow:hidden;flex-shrink:0;box-shadow:2px 2px 0 var(--ink)}
.stab{padding:0 12px;height:34px;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;background:var(--card);color:var(--mid);border:none;cursor:pointer;transition:all .1s;white-space:nowrap;-webkit-tap-highlight-color:transparent}
.stab.on{background:var(--orange);color:#fff}

/* week tag */
.wtag{display:inline-flex;gap:6px;align-items:center;background:var(--yellow);border:3px solid var(--ink);border-radius:100px;padding:3px 12px;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:14px;box-shadow:2px 2px 0 var(--ink)}
.wtag strong{color:var(--ink)}

/* page */
.pg{padding:16px 14px 80px;max-width:375px;margin:0 auto}

/* day selector */
.drow{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.dbt{height:36px;padding:0 14px;border:3px solid var(--ink);border-radius:100px;background:var(--card);color:var(--mid);cursor:pointer;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;box-shadow:2px 2px 0 var(--ink);transition:transform 80ms,box-shadow 80ms;display:flex;align-items:center;-webkit-tap-highlight-color:transparent}
.dbt:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.dbt.on{color:#fff;box-shadow:2px 2px 0 var(--ink)}

.shead{font-family:'Nunito',sans-serif;font-size:26px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;margin-bottom:14px;line-height:1}
.stack{display:flex;flex-direction:column;gap:10px}

/* barbell card */
.bc{background:var(--card);border:3px solid var(--ink);border-radius:16px;overflow:hidden;box-shadow:5px 5px 0 var(--ink);transition:box-shadow .15s,border-color .15s}
.bc.done{border-color:var(--green);box-shadow:5px 5px 0 var(--green)}
.bc.fail{border-color:var(--red);box-shadow:5px 5px 0 var(--red)}
.bc-dl{padding:8px 14px;background:var(--red-bg);border-bottom:3px solid var(--red);color:var(--red);font-size:11px;font-weight:700;letter-spacing:1px;border-radius:12px 12px 0 0}
.bc-top{display:flex;align-items:stretch;padding:13px 12px 8px 14px;gap:10px}
.bc-bar{width:14px;height:14px;border-radius:50%;border:3px solid var(--ink);flex-shrink:0;margin-top:4px}
.bc-inf{flex:1;min-width:0}
.bc-n{font-family:'Nunito',sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;line-height:1.1;margin-bottom:5px}
.bc-wrow{display:flex;align-items:baseline;gap:6px;margin-bottom:3px}
.bc-w{font-family:'Nunito',sans-serif;font-size:62px;font-weight:900;line-height:1;letter-spacing:-3px}
.bc-w sub{font-family:'Space Mono',monospace;font-size:16px;color:var(--mid);letter-spacing:0;margin-left:2px;font-weight:700;vertical-align:baseline}
.bc-plates{font-size:12px;color:var(--mid);margin-bottom:4px}
.bc-sch{font-family:'Nunito',sans-serif;font-size:26px;font-weight:900;letter-spacing:-1px;display:flex;align-items:center;gap:8px;line-height:1}
.bc-pct{font-family:'Space Mono',monospace;font-size:11px;color:var(--mid);font-weight:700;background:var(--light);border:2px solid var(--rule);border-radius:100px;padding:1px 8px}
.apill{font-family:'Space Mono',monospace;font-size:9px;font-weight:700;letter-spacing:1px;background:var(--yellow);border:2px solid var(--ink);border-radius:100px;padding:2px 8px;color:var(--ink)}
.bc-dots{display:flex;flex-direction:column;gap:5px;padding-top:6px;align-self:flex-start;flex-shrink:0}
.dot{width:11px;height:11px;border-radius:50%;border:3px solid var(--light);background:transparent;transition:all .1s;flex-shrink:0}
.dot.done{background:var(--green);border-color:var(--green)}
.dot.fail{background:var(--red);border-color:var(--red)}
.dot.sq{border-radius:4px}

/* set buttons */
.bc-sets{display:flex;gap:6px;padding:0 12px 14px;border-top:2px solid var(--light);padding-top:10px;margin-top:2px}
.sb{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1}
.sb-l{font-size:10px;color:var(--mid);font-weight:700;letter-spacing:1px}
.sb-l.am{color:var(--orange)}
.sbp{display:flex;width:100%;border:3px solid var(--ink);border-radius:12px;overflow:hidden;box-shadow:2px 2px 0 var(--ink)}
.sd,.sf{flex:1;height:52px;border:none;background:var(--bg);color:var(--light);font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .08s,color .08s;-webkit-tap-highlight-color:transparent}
.sd{border-right:2px solid var(--light)}
.sd:active:not(.on){background:var(--green-bg);color:var(--green)}
.sf:active:not(.on){background:var(--red-bg);color:var(--red)}
.sd.on{background:var(--green-bg);color:var(--green)}
.sf.on{background:var(--red-bg);color:var(--red)}

/* hold card */
.hc{background:var(--card);border:3px solid var(--ink);border-radius:16px;overflow:hidden;box-shadow:5px 5px 0 var(--ink);transition:box-shadow .15s,border-color .15s}
.hc.done{border-color:var(--green);box-shadow:5px 5px 0 var(--green)}
.hc.fail{border-color:var(--red);box-shadow:5px 5px 0 var(--red)}
.hc-top{display:flex;align-items:stretch;padding:13px 12px 8px 14px;gap:10px}
.hc-inf{flex:1;min-width:0}
.hc-n{font-family:'Nunito',sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;line-height:1.1;margin-bottom:5px}
.hc-t{font-family:'Nunito',sans-serif;font-size:58px;font-weight:900;line-height:1;letter-spacing:-3px}
.hc-t sub{font-family:'Space Mono',monospace;font-size:15px;color:var(--mid);letter-spacing:0;margin-left:2px;font-weight:700;vertical-align:baseline}
.hc-goal{font-size:12px;color:var(--mid);margin-top:4px;font-style:italic}
.hc-sets{display:flex;gap:6px;padding:0 12px 14px;border-top:2px solid var(--light);padding-top:10px;margin-top:2px}
.hsp{display:flex;width:100%;border:3px solid var(--ink);border-radius:12px;overflow:hidden;box-shadow:2px 2px 0 var(--ink)}
.hsd,.hsf{flex:1;height:52px;border:none;background:var(--bg);color:var(--light);font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .08s,color .08s;-webkit-tap-highlight-color:transparent}
.hsd{border-right:2px solid var(--light)}
.hsd:active:not(.on){background:var(--green-bg);color:var(--green)}
.hsf:active:not(.on){background:var(--red-bg);color:var(--red)}
.hsd.on{background:var(--green-bg);color:var(--green)}
.hsf.on{background:var(--red-bg);color:var(--red)}

/* rehab card */
.rrow{display:flex;align-items:center;gap:12px;padding:14px;background:var(--light);border:3px solid var(--ink);border-radius:16px;box-shadow:4px 4px 0 var(--ink)}
.rbar{width:14px;height:14px;border-radius:50%;border:3px solid var(--ink);flex-shrink:0}
.rn{font-family:'Nunito',sans-serif;font-size:19px;font-weight:900;text-transform:uppercase;color:var(--mid);line-height:1.1}
.rv{font-family:'Nunito',sans-serif;font-size:15px;font-weight:900;color:var(--sub)}
.rs{font-size:10px;color:var(--sub);margin-top:2px;font-weight:700;letter-spacing:1px}

/* analytics */
.asec{margin-bottom:24px}
.at{font-family:'Nunito',sans-serif;font-size:22px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;border-bottom:3px solid var(--ink);padding-bottom:8px;margin-bottom:14px}
.lac{background:var(--card);border:3px solid var(--ink);border-radius:14px;margin-bottom:8px;box-shadow:4px 4px 0 var(--ink)}
.lach{display:flex;align-items:center;gap:10px;padding:13px 14px;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;border-radius:12px}
.lach:active{background:var(--lift)}
.la-ab{font-family:'Nunito',sans-serif;font-size:22px;font-weight:900;line-height:1;letter-spacing:-0.5px;text-transform:uppercase}
.la-nm{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--mid);margin-top:2px}
.la-st{margin-left:auto;display:flex;gap:14px}
.la-sv{font-family:'Nunito',sans-serif;font-size:20px;font-weight:900;line-height:1;letter-spacing:-0.5px}
.la-sl{font-size:9px;font-weight:700;letter-spacing:1px;color:var(--mid);text-transform:uppercase;margin-top:3px}
.la-ch{font-size:11px;color:var(--sub);transition:transform .2s;margin-left:5px;flex-shrink:0}
.la-ch.op{transform:rotate(90deg)}
.lacb{padding:0 14px 14px}
.ctabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
.ctab{padding:6px 14px;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border:3px solid var(--ink);border-radius:100px;background:var(--bg);color:var(--mid);cursor:pointer;transition:all .1s;-webkit-tap-highlight-color:transparent;box-shadow:2px 2px 0 var(--ink)}
.ctab:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.ctab.on{color:#fff;font-weight:700}
.clbl{font-size:10px;color:var(--mid);font-weight:700;margin-bottom:6px}

/* config */
.cdiv{border-top:2px solid var(--rule);margin-top:12px;padding-top:10px}
.chd{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--mid);margin-bottom:8px}
.cr{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.cl{font-size:11px;font-weight:700;color:var(--mid);width:80px;flex-shrink:0}
.cst{display:flex;align-items:center;border:3px solid var(--ink);border-radius:12px;overflow:hidden;box-shadow:2px 2px 0 var(--ink)}
.cb{width:40px;height:40px;background:var(--card);border:none;color:var(--ink);cursor:pointer;font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
.cb:active{background:var(--lift)}
.cv{min-width:52px;text-align:center;font-family:'Space Mono',monospace;font-size:12px;font-weight:700;padding:5px 4px;background:var(--bg);color:var(--ink);border:none;border-left:2px solid var(--light);border-right:2px solid var(--light)}
.crst{font-size:10px;font-weight:700;letter-spacing:1px;color:var(--mid);background:none;border:3px solid var(--rule);border-radius:100px;padding:6px 14px;cursor:pointer;font-family:'Space Mono',monospace;margin-top:5px;-webkit-tap-highlight-color:transparent}

/* deload */
.dlr{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--red-bg);border:3px solid var(--red);border-radius:12px;margin-bottom:6px;box-shadow:3px 3px 0 var(--ink)}

/* footer */
.fh{margin-top:20px;padding-top:14px;border-top:3px solid var(--ink);font-size:10px;font-weight:700;color:var(--mid);letter-spacing:1px;display:flex;justify-content:space-between;align-items:center}
.fhb{background:none;border:3px solid var(--ink);border-radius:100px;color:var(--ink);padding:8px 16px;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;cursor:pointer;box-shadow:2px 2px 0 var(--ink);transition:transform 80ms,box-shadow 80ms;-webkit-tap-highlight-color:transparent}
.fhb:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}

/* goal badge */
.gbadge{font-size:11px;font-weight:700;background:var(--yellow-bg);border:2px solid var(--ink);border-radius:100px;padding:4px 12px;display:inline-block;margin-bottom:12px}

/* signature */
.sig{margin-top:40px;padding-bottom:20px;text-align:center;font-size:11px;color:var(--light);letter-spacing:1.5px;font-style:italic;line-height:1.8}
.sig span{display:block;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--rule);margin-top:2px;font-style:normal;font-weight:700}

/* motivation */
.motd{background:var(--yellow);border:3px solid var(--ink);border-radius:16px;padding:16px;margin-bottom:18px;box-shadow:4px 4px 0 var(--ink)}
.motd-q{font-family:'Fraunces',serif;font-style:italic;font-size:16px;line-height:1.55;color:var(--ink);margin-bottom:8px}
.motd-a{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--mid)}

/* export */
.xsec{margin-top:26px;padding-top:16px;border-top:3px solid var(--rule)}
.xhd{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--mid);margin-bottom:12px}
.xrow{display:flex;gap:8px;flex-wrap:wrap}
.xbtn{flex:1;min-width:100px;padding:11px 10px;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:1px;border:3px solid var(--ink);border-radius:100px;background:var(--card);color:var(--mid);cursor:pointer;text-align:center;box-shadow:2px 2px 0 var(--ink);transition:transform 80ms,box-shadow 80ms;-webkit-tap-highlight-color:transparent}
.xbtn:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.xbtn.primary{background:var(--orange);border-color:var(--orange);color:#fff}
.xtxt{width:100%;margin-top:8px;padding:12px;background:var(--lift);border:3px solid var(--ink);border-radius:12px;color:var(--ink);font-family:'Space Mono',monospace;font-size:11px;resize:vertical;min-height:80px;letter-spacing:.5px}

@keyframes bfly{
  0%{transform:translate(0,0) rotate(0) scale(1);opacity:1}
  70%{opacity:1}
  100%{transform:translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(.3);opacity:0}
}
@keyframes frise{
  0%{transform:translateY(0) scale(.6);opacity:0}
  15%{transform:translateY(-8px) scale(1.05);opacity:1}
  70%{opacity:1}
  100%{transform:translateY(-80px) scale(.9);opacity:0}
}
`;;

// ── MINI CHART ───────────────────────────────────────────────────────────────
function MiniChart({ data, color }) {
  if (!data || data.length < 2) {
    return <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 9, letterSpacing: "1px", fontWeight: 700 }}>LOG SESSIONS TO SEE CHART</div>;
  }
  const W = 340, H = 58, P = 2;
  const vals = data.map(d => d.y);
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
  const px = i => P + (i / (data.length - 1)) * (W - P * 2);
  const py = v => P + (1 - (v - mn) / rng) * (H - P * 2);
  const pts = data.map((d, i) => [px(i), py(d.y)]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = line + ` L${pts[pts.length - 1][0]},${H} L${P},${H} Z`;
  const gid = `g${color.replace("#", "")}`;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map(p => <line key={p} x1={P} y1={H * p / 100} x2={W - P} y2={H * p / 100} stroke="#E0E0D8" strokeWidth=".5" />)}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 2.5 : 1.2} fill={color} />)}
      <text x={P} y={H - 1} fontSize="7" fill="#999" fontFamily="Space Mono">{Math.round(mn)}</text>
      <text x={P} y="9" fontSize="7" fill="#999" fontFamily="Space Mono">{Math.round(mx)}</text>
      <text x={W - P} y={H - 1} fontSize="7" fill="#999" fontFamily="Space Mono" textAnchor="end">now</text>
    </svg>
  );
}

// ── BARBELL CARD ─────────────────────────────────────────────────────────────
function BarbellCard({ id, sl, wt, sets, onDone, onFail, deload }) {
  const l = LIFTS[id];
  const { reps, type, amrap } = sl;
  const tot = sets.length;
  const reg = amrap ? tot - 1 : tot;
  const doneN = sets.filter(s => s === "done").length;
  const failN = sets.filter(s => s === "fail").length;
  const allDone = doneN === tot && failN === 0;
  const pct = type === "4rep" ? "80%" : "72%";

  return (
    <div className={`bc${failN ? " fail" : allDone ? " done" : ""}`}>
      {deload && <div className="bc-dl">⚠ 2 FAILS — HOLD WEIGHT NEXT CYCLE · {validW(wt * .9)} kg if needed</div>}
      <div className="bc-top">
        <div className="bc-bar" style={{ background: l.color }} />
        <div className="bc-inf">
          <div className="bc-n">{l.name}</div>
          <div className="bc-wrow">
            <div className="bc-w" style={{ color: l.color }}>{wt}<sub>kg</sub></div>
            <div className="bc-plates">{plates(wt)}</div>
          </div>
          <div className="bc-sch" style={{ color: l.color }}>
            {amrap ? `${reg}×${reps} + AMRAP` : `${tot}×${reps}`}
            <span className="bc-pct">@ {pct}</span>
            {amrap && <span className="apill">AMRAP</span>}
          </div>
        </div>
        <div className="bc-dots">
          {sets.map((s, i) => {
            const isA = amrap && i === tot - 1;
            return <div key={i} className={`dot${s === "done" ? " done" : s === "fail" ? " fail" : ""}${isA ? " sq" : ""}`} style={isA && s === "idle" ? { background: "#252510" } : {}} />;
          })}
        </div>
      </div>
      <div className="bc-sets">
        {sets.map((state, i) => {
          const isA = amrap && i === tot - 1;
          return (
            <div key={i} className="sb">
              <div className={`sb-l${isA ? " am" : ""}`}>{isA ? "AMRP" : `S${i + 1}`}</div>
              <div className="sbp">
                <button
                  className={`sd${state === "done" ? " on" : ""}`}
                  onClick={e => {
                    if (state !== "done") { const r = e.currentTarget.getBoundingClientRect(); emit(doneBurst(r.left + r.width / 2, r.top + r.height / 2, DE)); }
                    onDone(i);
                  }}
                >✓</button>
                <button
                  className={`sf${state === "fail" ? " on" : ""}`}
                  onClick={e => {
                    if (state !== "fail") { const r = e.currentTarget.getBoundingClientRect(); emit(failBurst(r.left + r.width / 2, r.top + r.height / 2)); }
                    onFail(i);
                  }}
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── HOLD CARD ─────────────────────────────────────────────────────────────────
function HoldCard({ id, cfg, sets, onDone, onFail }) {
  const h = HOLDS[id];
  const tot = sets.length;
  const doneN = sets.filter(s => s === "done").length;
  const failN = sets.filter(s => s === "fail").length;
  const allDone = doneN === tot && failN === 0 && tot > 0;
  const displayVal = h.isReps ? (cfg.reps || 0) : cfg.secs;
  const displayUnit = h.isReps ? "reps" : "sec";

  // Rehab — show paused card, no buttons
  if (h.rehab) {
    return (
      <div className="rrow">
        <div className="rbar" style={{ background: h.color }} />
        <div>
          <div className="rn">{h.emoji} {h.name}</div>
          <div className="rv">PAUSED</div>
          <div className="rs">{h.note}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`hc${failN ? " fail" : allDone ? " done" : ""}`}>
      <div className="hc-top">
        <div className="bc-bar" style={{ background: h.color, width: 14, height: 14, borderRadius: "50%", border: "3px solid #111", flexShrink: 0, marginTop: 4 }} />
        <div className="hc-inf">
          <div className="hc-n">{h.emoji} {h.name}</div>
          <div className="hc-t" style={{ color: h.color }}>{displayVal}<sub>{displayUnit}</sub></div>
          <div className="hc-goal">{h.goal}</div>
          <div style={{fontSize:11,color:"var(--mid)",marginTop:2,lineHeight:1.4,fontWeight:700}}>{h.note}</div>
        </div>
        <div className="bc-dots">
          {sets.map((s, i) => <div key={i} className={`dot${s === "done" ? " done" : s === "fail" ? " fail" : ""}`} />)}
        </div>
      </div>
      <div className="hc-sets">
        {sets.map((state, i) => (
          <div key={i} className="sb">
            <div className="sb-l">S{i + 1}</div>
            <div className="hsp">
              <button
                className={`hsd${state === "done" ? " on" : ""}`}
                onClick={e => {
                  if (state !== "done") { const r = e.currentTarget.getBoundingClientRect(); emit(doneBurst(r.left + r.width / 2, r.top + r.height / 2, HE)); }
                  onDone(i);
                }}
              >✓</button>
              <button
                className={`hsf${state === "fail" ? " on" : ""}`}
                onClick={e => {
                  if (state !== "fail") { const r = e.currentTarget.getBoundingClientRect(); emit(failBurst(r.left + r.width / 2, r.top + r.height / 2)); }
                  onFail(i);
                }}
              >✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LIFT STATS CARD ───────────────────────────────────────────────────────────
function LiftStats({ id, history, progs, onProg }) {
  const l = LIFTS[id];
  const [open, setOpen] = useState(false);
  const [ct, setCt] = useState("volume");
  const ls = history.map(h => h.lifts[id]).filter(Boolean);
  const volD = ls.map((x, i) => ({ x: i, y: x.volume }));
  const maxD = ls.map((x, i) => ({ x: i, y: x.maxWeight }));
  const ormD = ls.map((x, i) => ({ x: i, y: x.orm }));
  const chartD = ct === "volume" ? volD : ct === "max" ? maxD : ormD;
  const p = progs[id] ?? {};
  const inc = p.inc ?? l.defInc;
  const incD = p.incD ?? l.defIncD;
  const step = (f, d) => {
    const cur = f === "inc" ? inc : incD;
    onProg(id, { ...p, [f]: Math.max(5, validW(cur + d)) });
  };

  return (
    <div className="lac">
      <div className="lach" onClick={() => setOpen(o => !o)}>
        <div style={{ width: 3, alignSelf: "stretch", background: l.color, flexShrink: 0 }} />
        <div style={{ marginLeft: 7 }}>
          <div className="la-ab" style={{ color: l.color }}>{l.abbr}</div>
          <div className="la-nm">{l.name}</div>
        </div>
        <div className="la-st">
          <div style={{ textAlign: "right" }}>
            <div className="la-sv" style={{ color: l.color }}>{ormD[ormD.length - 1]?.y ?? "—"}<span style={{ fontSize: 9, color: "var(--sub)" }}>kg</span></div>
            <div className="la-sl">1rm</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="la-sv" style={{ color: "var(--mid)" }}>{maxD.length ? Math.max(...maxD.map(d => d.y)) : "—"}<span style={{ fontSize: 9, color: "var(--sub)" }}>kg</span></div>
            <div className="la-sl">max</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="la-sv" style={{ color: "var(--mid)" }}>{volD[volD.length - 1] ? Math.round(volD[volD.length - 1].y) : "—"}</div>
            <div className="la-sl">vol</div>
          </div>
        </div>
        <div className={`la-ch${open ? " op" : ""}`}>▶</div>
      </div>
      {open && (
        <div className="lacb">
          <div className="ctabs">
            {["volume", "max", "orm"].map(t => (
              <button key={t} className={`ctab${ct === t ? " on" : ""}`}
                style={ct === t ? { background: l.color, borderColor: l.color } : {}}
                onClick={() => setCt(t)}>
                {t === "volume" ? "VOL" : t === "max" ? "MAX WT" : "1RM"}
              </button>
            ))}
          </div>
          <div className="clbl">{ct === "volume" ? "Total volume (kg·reps)" : ct === "max" ? "Max weight (kg)" : "Estimated 1RM (kg)"}</div>
          <MiniChart data={chartD} color={l.color} />
          <div className="cdiv">
            <div className="chd">Progression / cycle · min 5kg</div>
            <div className="cr">
              <div className="cl">Base jump</div>
              <div className="cst">
                <button className="cb" onClick={() => step("inc", -5)}>−</button>
                <span className="cv">{inc}kg</span>
                <button className="cb" onClick={() => step("inc", 5)}>+</button>
              </div>
            </div>
            <div className="cr">
              <div className="cl">AMRAP ≥8</div>
              <div className="cst">
                <button className="cb" onClick={() => step("incD", -5)}>−</button>
                <span className="cv">{incD}kg</span>
                <button className="cb" onClick={() => step("incD", 5)}>+</button>
              </div>
            </div>
            <button className="crst" onClick={() => onProg(id, { inc: l.defInc, incD: l.defIncD })}>reset ({l.defInc}/{l.defIncD}kg)</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HOLD STATS CARD ───────────────────────────────────────────────────────────
function HoldStats({ id, history, holdCfg, onCfg }) {
  const h = HOLDS[id];
  const [open, setOpen] = useState(false);
  const [ct, setCt] = useState("hold");
  const hs = history.map(s => s.holds[id]).filter(Boolean);
  const holdD = hs.map((x, i) => ({ x: i, y: x.secs }));
  const volD = hs.map((x, i) => ({ x: i, y: x.totalTime }));
  const chartD = ct === "hold" ? holdD : volD;
  const cfg = holdCfg[id];
  const best = holdD.length ? Math.max(...holdD.map(d => d.y)) : 0;

  return (
    <div className="lac">
      <div className="lach" onClick={() => setOpen(o => !o)}>
        <div style={{ width: 3, alignSelf: "stretch", background: h.color, flexShrink: 0 }} />
        <div style={{ marginLeft: 7 }}>
          <div className="la-ab" style={{ color: h.color }}>{h.emoji} {h.abbr}</div>
          <div className="la-nm">{h.name}</div>
        </div>
        <div className="la-st">
          <div style={{ textAlign: "right" }}>
            <div className="la-sv" style={{ color: h.color }}>{h.isReps ? cfg.reps : cfg.secs}<span style={{ fontSize: 9, color: "var(--sub)" }}>{h.isReps ? "r" : "s"}</span></div>
            <div className="la-sl">target</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="la-sv" style={{ color: "var(--mid)" }}>{best || "—"}<span style={{ fontSize: 9, color: "var(--sub)" }}>s</span></div>
            <div className="la-sl">best</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="la-sv" style={{ color: "var(--mid)" }}>{cfg.sets}</div>
            <div className="la-sl">sets</div>
          </div>
        </div>
        <div className={`la-ch${open ? " op" : ""}`}>▶</div>
      </div>
      {open && (
        <div className="lacb">
          <div className="gbadge">{h.emoji} NOW: {h.currentLevel}</div>
          <div style={{fontSize:11,color:"var(--mut2)",marginBottom:12,lineHeight:1.6}}>
            📈 {h.progression}
          </div>
          <div className="ctabs">
            {["hold", "vol"].map(t => (
              <button key={t} className={`ctab${ct === t ? " on" : ""}`}
                style={ct === t ? { background: h.color, borderColor: h.color } : {}}
                onClick={() => setCt(t)}>
                {t === "hold" ? "HOLD TIME" : "TOTAL VOL"}
              </button>
            ))}
          </div>
          <div className="clbl">{ct === "hold" ? "Target hold (sec)" : "Total hold / session (sec)"} · {chartD.length} sessions</div>
          <MiniChart data={chartD} color={h.color} />
          <div className="cdiv">
            <div className="chd">Configuration</div>
            {!h.isReps && (
              <div className="cr">
                <div className="cl">Target sec</div>
                <div className="cst">
                  <button className="cb" onClick={() => onCfg(id, { ...cfg, secs: Math.max(1, cfg.secs - 1) })}>−</button>
                  <span className="cv">{cfg.secs}s</span>
                  <button className="cb" onClick={() => onCfg(id, { ...cfg, secs: cfg.secs + 1 })}>+</button>
                </div>
              </div>
            )}
            {h.isReps && (
              <div className="cr">
                <div className="cl">Target reps</div>
                <div className="cst">
                  <button className="cb" onClick={() => onCfg(id, { ...cfg, reps: Math.max(1, cfg.reps - 1) })}>−</button>
                  <span className="cv">{cfg.reps}r</span>
                  <button className="cb" onClick={() => onCfg(id, { ...cfg, reps: cfg.reps + 1 })}>+</button>
                </div>
              </div>
            )}
            <div className="cr">
              <div className="cl">Sets</div>
              <div className="cst">
                <button className="cb" onClick={() => onCfg(id, { ...cfg, sets: Math.max(1, cfg.sets - 1) })}>−</button>
                <span className="cv">{cfg.sets}</span>
                <button className="cb" onClick={() => onCfg(id, { ...cfg, sets: cfg.sets + 1 })}>+</button>
              </div>
            </div>
            {!h.isReps && cfg.inc > 0 && (
              <div className="cr">
                <div className="cl">+sec/cycle</div>
                <div className="cst">
                  <button className="cb" onClick={() => onCfg(id, { ...cfg, inc: Math.max(1, cfg.inc - 1) })}>−</button>
                  <span className="cv">+{cfg.inc}s</span>
                  <button className="cb" onClick={() => onCfg(id, { ...cfg, inc: cfg.inc + 1 })}>+</button>
                </div>
              </div>
            )}
            <button className="crst" onClick={() => onCfg(id, { secs: h.defSecs, sets: h.defSets, inc: h.defInc, reps: h.defReps ?? 1 })}>reset defaults</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── BENCHMARKS ───────────────────────────────────────────────────────────────
// Source: Kilgore (2023) recreational standards + OpenPowerlifting 2025 data
// Scaled to 95kg male. All values are 1RM in kg.
// Benchmarks from config.json — scaled to user bodyweight
const BW = CFG.user.bodyweight_kg;
const TIER_LABELS = [
  { key: "beginner",     label: "Beginner",     note_suffix: "× BW" },
  { key: "intermediate", label: "Intermediate", note_suffix: "× BW · your goal" },
  { key: "advanced",     label: "Advanced",     note_suffix: "× BW" },
  { key: "elite",        label: "Elite",        note_suffix: "× BW · top 25% competitive" },
];
const LIFT_COLORS = Object.fromEntries(Object.entries(LIFTS).map(([id,l])=>[id,l.color]));
const STANDARDS = Object.fromEntries(
  Object.entries(CFG.benchmarks)
    .filter(([k]) => !k.startsWith('_'))
    .map(([id, b]) => [id, {
      label:  LIFTS[id]?.name ?? id,
      color:  LIFT_COLORS[id] ?? '#888',
      source: CFG.benchmarks._source,
      tiers:  TIER_LABELS.map(t => ({
        label: t.label,
        kg:    Math.round(BW * b[`${t.key}_multiplier`] / 5) * 5,
        note:  `${b[`${t.key}_multiplier`]}${t.note_suffix}`,
      })),
    }])
);
// CSS for benchmarks — added inline to the css string additions
const bmCss = `
.bm-card{background:var(--card);border:3px solid var(--ink);border-radius:14px;margin-bottom:8px;box-shadow:4px 4px 0 var(--ink);overflow:hidden}
.bm-head{display:flex;align-items:center;gap:10px;padding:12px 14px}
.bm-name{font-family:'Nunito',sans-serif;font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px}
.bm-orm{margin-left:auto;text-align:right}
.bm-orm-val{font-family:'Nunito',sans-serif;font-size:24px;font-weight:900;line-height:1;letter-spacing:-1px}
.bm-orm-lbl{font-size:9px;font-weight:700;letter-spacing:1px;color:var(--mid);text-transform:uppercase}
.bm-tiers{padding:0 14px 14px}
.bm-tier{margin-bottom:10px}
.bm-tier-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px}
.bm-tier-name{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--mid)}
.bm-tier-kg{font-family:'Nunito',sans-serif;font-size:17px;font-weight:900;line-height:1;letter-spacing:-0.5px}
.bm-tier-note{font-size:9px;color:var(--mid);letter-spacing:.5px;font-weight:700}
.bm-track{height:10px;background:var(--light);border:2px solid var(--ink);border-radius:100px;overflow:hidden}
.bm-fill{height:100%;transition:width .6s ease;border-radius:100px}
.bm-src{font-size:9px;color:var(--sub);margin-top:10px;letter-spacing:.5px;font-style:italic;font-weight:700}
.bm-achieved{font-size:9px;font-weight:700;letter-spacing:1px;background:var(--green-bg);border:2px solid var(--green);border-radius:100px;padding:1px 7px;margin-left:6px;color:var(--green);vertical-align:middle}
`;

function Benchmarks({ currentOrms }) {
  return (
    <div>
      <style>{bmCss}</style>
      {Object.entries(STANDARDS).map(([id, std]) => {
        const orm = currentOrms[id] || 0;
        const maxTier = std.tiers[std.tiers.length - 1].kg;
        const pct = Math.min(100, (orm / maxTier) * 100);
        // Which tier are we at?
        const reachedIdx = std.tiers.reduce((acc, t, i) => orm >= t.kg ? i : acc, -1);

        return (
          <div key={id} className="bm-card">
            <div className="bm-head">
              <div style={{ width: 3, alignSelf: "stretch", background: std.color, flexShrink: 0 }} />
              <div style={{ marginLeft: 6 }}>
                <div className="bm-name" style={{ color: std.color }}>{std.label}</div>
              </div>
              <div className="bm-orm">
                <div className="bm-orm-val" style={{ color: orm > 0 ? std.color : "var(--mut)" }}>
                  {orm > 0 ? `${orm}kg` : "—"}
                </div>
                <div className="bm-orm-lbl">est 1RM</div>
              </div>
            </div>
            <div className="bm-tiers">
              {std.tiers.map((tier, i) => {
                const achieved = orm >= tier.kg;
                const isNext = i === reachedIdx + 1;
                const tierPct = Math.min(100, orm > 0 ? (orm / tier.kg) * 100 : 0);
                return (
                  <div key={i} className="bm-tier">
                    <div className="bm-tier-head">
                      <span className="bm-tier-name" style={{ color: achieved ? std.color : isNext ? "var(--text)" : "var(--mut)" }}>
                        {tier.label}
                        {achieved && <span className="bm-achieved">✓</span>}
                        {isNext && !achieved && <span style={{ fontSize: 8, color: std.color, marginLeft: 6, letterSpacing: 1 }}>← NEXT</span>}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <span className="bm-tier-kg" style={{ color: achieved ? std.color : isNext ? "var(--text)" : "var(--mut2)" }}>{tier.kg}kg</span>
                        <span style={{ fontSize: 8, color: "var(--sub)", marginLeft: 5 }}>{tier.note}</span>
                      </div>
                    </div>
                    <div className="bm-track">
                      <div className="bm-fill" style={{
                        width: `${achieved ? 100 : tierPct}%`,
                        background: achieved ? std.color : isNext ? std.color + "88" : "var(--mut)",
                      }} />
                    </div>
                  </div>
                );
              })}
              <div className="bm-src">{std.source}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [st, _setSt] = useState(mkDefault);
  const saveT = useRef(null);

  useEffect(() => {
    load().then(saved => {
      if (saved) _setSt(prev => ({ ...prev, ...saved }));
      setReady(true);
    });
  }, []);

  function setSt(upd) {
    _setSt(prev => {
      const next = typeof upd === "function" ? upd(prev) : { ...prev, ...upd };
      clearTimeout(saveT.current);
      setSaving(true);
      saveT.current = setTimeout(() => save(next).then(() => setSaving(false)), 800);
      return next;
    });
  }

  const swX = useRef(null);
  const onTS = e => { swX.current = e.touches[0].clientX; };
  const onTE = e => {
    if (swX.current === null) return;
    const dx = e.changedTouches[0].clientX - swX.current;
    if (Math.abs(dx) > 50) {
      if (st.mode === 0) setSt({ bbTab: dx < 0 ? 1 : 0 });
      else setSt({ caliTab: dx < 0 ? 1 : 0 });
    }
    swX.current = null;
  };

  const liftHistory = buildLiftHistory(st.progs, st.weights);
  const holdHistory = buildHoldHistory(st.holdCfg);
  const today = SCHED[st.dayIdx];
  const todaySets = st.liftSets[st.dayIdx];
  const acc = LIFTS[today.lifts.find(sl => !LIFTS[sl.id].rehab)?.id]?.color || "#E85D04";

  // Use weights from state (so progression changes are live)
  // Fall back to LIFTS base8 if weights not yet in saved state (migration)
  const wts = {};
  Object.entries(LIFTS).forEach(([id, l]) => {
    const w8 = st.weights?.[id] ?? (l.base8 ? validW(l.base8) : null);
    wts[id] = w8 ? { w8, w4: w4from8(w8) } : { w8: null, w4: null };
  });

  // Advance to next cycle: increment weights unless deloaded, then clear deloads + reset sets
  function advanceCycle() {
    setSt(p => {
      const c = structuredClone(p);
      Object.entries(LIFTS).forEach(([id, l]) => {
        if (l.rehab || !c.weights?.[id]) return;
        if (c.deloads[id]) {
          // deloaded — stay at current weight, don't increment
        } else {
          const prog = c.progs[id] ?? { inc: l.defInc, incD: l.defIncD };
          c.weights[id] = validW(c.weights[id] + prog.inc);
        }
      });
      c.deloads = {};
      c.liftSets = initLiftSets();
      c.dayIdx = 0;
      return c;
    });
  }

  function markLiftDone(lid, si) {
    setSt(p => { const c = structuredClone(p); c.liftSets[st.dayIdx][lid][si] = c.liftSets[st.dayIdx][lid][si] === "done" ? "idle" : "done"; return c; });
  }
  function markLiftFail(lid, si) {
    setSt(p => {
      const c = structuredClone(p);
      c.liftSets[st.dayIdx][lid][si] = c.liftSets[st.dayIdx][lid][si] === "fail" ? "idle" : "fail";
      const failCount = c.liftSets[st.dayIdx][lid].filter(s => s === "fail").length;
      c.deloads = { ...c.deloads, [lid]: failCount >= 2 };
      return c;
    });
  }
  function markHoldDone(hid, si) {
    setSt(p => { const c = structuredClone(p); c.holdSets[hid][si] = c.holdSets[hid][si] === "done" ? "idle" : "done"; return c; });
  }
  function markHoldFail(hid, si) {
    setSt(p => { const c = structuredClone(p); c.holdSets[hid][si] = c.holdSets[hid][si] === "fail" ? "idle" : "fail"; return c; });
  }
  function updHoldCfg(id, val) {
    setSt(p => {
      const c = structuredClone(p);
      c.holdCfg[id] = val;
      const ns = val.sets ?? p.holdCfg[id].sets;
      const cur = c.holdSets[id] || [];
      c.holdSets[id] = Array(ns).fill("idle").map((_, i) => cur[i] || "idle");
      return c;
    });
  }

  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");

  function doExport() {
    setShowExport(true);
    setImportText(JSON.stringify(st, null, 2));
  }
  function doImport() {
    try {
      const parsed = JSON.parse(importText);
      setSt(prev => ({ ...prev, ...parsed }));
      setImportMsg("✓ Imported successfully");
      setTimeout(() => setImportMsg(""), 3000);
    } catch {
      setImportMsg("✕ Invalid JSON — check your data");
      setTimeout(() => setImportMsg(""), 3000);
    }
  }

  const atab = st.mode === 0 ? st.bbTab : st.caliTab;
  const setAtab = t => st.mode === 0 ? setSt({ bbTab: t }) : setSt({ caliTab: t });

  if (!ready) {
    return (
      <>
        <style>{css}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#999", fontSize: 10, letterSpacing: "2px", fontWeight: 700, background: "#FAFAF5" }}>LOADING…</div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <BurstOverlay />
      <div onTouchStart={onTS} onTouchEnd={onTE}>

        {/* TOP BAR */}
        <div className="bar">
          <div className="bar-title">DAD<span className="dl">LIFT</span></div>
          {IS_DEV && <div style={{fontSize:9,letterSpacing:1,color:'#000',background:'#FFD93D',padding:'2px 8px',flexShrink:0,fontWeight:700,border:'2px solid #111',borderRadius:100}}>DEV</div>}
          <div className="bar-gap" />
          <div className={`sdot${saving ? " on" : ""}`} />
          <div className="mtabs">
            <button className={`mtab${st.mode === 0 ? " on" : ""}`}
              style={st.mode === 0 ? { background: acc } : {}}
              onClick={() => setSt({ mode: 0 })}>🏋️</button>
            <button className={`mtab${st.mode === 1 ? " on" : ""}`}
              style={st.mode === 1 ? { background: "#A78BFA" } : {}}
              onClick={() => setSt({ mode: 1 })}>🤸</button>
          </div>
          <div className="stabs">
            <button className={`stab${atab === 0 ? " on" : ""}`} onClick={() => setAtab(0)}>TRAIN</button>
            <button className={`stab${atab === 1 ? " on" : ""}`} onClick={() => setAtab(1)}>STATS</button>
          </div>
        </div>

        {/* BARBELL TRAIN */}
        {st.mode === 0 && atab === 0 && (
          <div className="pg">
            <div className="wtag">CYCLE <strong>4</strong> · WEEK <strong>{today.week}</strong></div>
            {(() => { const m = weeklyMotivation(); return (
              <div className="motd">
                <div className="motd-q">"{m.q}"</div>
                {m.a && <div className="motd-a">— {m.a}</div>}
              </div>
            ); })()}
            <div className="drow">
              {SCHED.map((s, i) => (
                <button key={i} className={`dbt${i === st.dayIdx ? " on" : ""}`}
                  style={i === st.dayIdx ? { background: acc, borderColor: acc } : {}}
                  onClick={() => setSt({ dayIdx: i })}>{s.label}</button>
              ))}
            </div>
            <div className="shead" style={{ color: acc }}>
              {today.label} <span style={{ color: "var(--mid)", fontSize: 14 }}>/ {today.lifts.length} LIFTS</span>
            </div>
            <div className="stack">
              {today.lifts.map(sl => {
                if (LIFTS[sl.id].rehab) {
                  return (
                    <div key={sl.id} className="rrow">
                      <div className="rbar" style={{ background: LIFTS[sl.id].color }} />
                      <div>
                        <div className="rn">{LIFTS[sl.id].name}</div>
                        <div className="rv">REHAB</div>
                        <div className="rs">SUBSTITUTE OK</div>
                      </div>
                    </div>
                  );
                }
                const w = sl.type === "4rep" ? wts[sl.id].w4 : wts[sl.id].w8;
                return (
                  <BarbellCard key={sl.id} id={sl.id} sl={sl} wt={w}
                    sets={todaySets[sl.id]}
                    onDone={si => markLiftDone(sl.id, si)}
                    onFail={si => markLiftFail(sl.id, si)}
                    deload={!!st.deloads[sl.id]} />
                );
              })}
            </div>
            <div className="fh">
              <span>SWIPE ← STATS</span>
              <div style={{display:'flex',gap:6}}>
                <button className="fhb" style={{borderColor:'var(--green)',color:'var(--green)'}}
                  onClick={()=>{ if(window.confirm("End cycle + advance weights?\n\nDeloaded lifts hold at current weight. All others increment.")) advanceCycle(); }}>
                  END CYCLE ↑
                </button>
                <button className="fhb" onClick={() => setAtab(1)}>STATS ▶</button>
              </div>
            </div>
            <div className="sig">
              built between sets
              <span>dadlift · for the boys</span>
            </div>
          </div>
        )}
        {st.mode === 0 && atab === 1 && (
          <div className="pg">
            <div style={{ fontSize: 10, color: "var(--mid)", letterSpacing: "1.5px", marginBottom: 14, fontWeight: 700 }}>TAP LIFT TO EXPAND · SWIPE → TRAIN</div>
            <div className="asec">
              <div className="at">Barbell Performance</div>
              {Object.keys(LIFTS).filter(id => !LIFTS[id].rehab).map(id => (
                <LiftStats key={id} id={id} history={liftHistory} progs={st.progs}
                  onProg={(id, v) => setSt(p => ({ ...p, progs: { ...p.progs, [id]: v } }))} />
              ))}
            </div>

            {/* BENCHMARKS */}
            <div className="asec">
              <div className="at">Strength Benchmarks</div>
              <div style={{fontSize:11,color:"var(--mut2)",lineHeight:1.6,marginBottom:12}}>
                Based on Kilgore (2023) & OpenPowerlifting data (58k drug-tested lifters, 2025). Scaled to 95kg male. 1RM targets.
              </div>
              <Benchmarks currentOrms={{
                deadlift: epley(wts.deadlift.w8 || 0, 8),
                squat:    epley(wts.squat.w8    || 0, 8),
                bench:    epley(wts.bench.w8    || 0, 8),
                ohp:      epley(wts.ohp.w8      || 0, 8),
              }}/>
            </div>

            {Object.entries(st.deloads).some(([, v]) => v) && (
              <div className="asec">
                <div className="at">Flagged Deloads</div>
                {Object.entries(st.deloads).filter(([, v]) => v).map(([id]) => (
                  <div key={id} className="dlr">
                    <span style={{ color: LIFTS[id].color, fontSize: 14, fontFamily: "'Nunito',sans-serif", fontWeight: 900 }}>{LIFTS[id].name}</span>
                    <span style={{ color: "var(--red)", fontFamily: "'Nunito',sans-serif", fontSize: 20 }}>
                      {validW((wts[id].w8 || 0) * .9)} kg
                      <span style={{ fontSize: 11, color: "var(--mid)", marginLeft: 5 }}>next</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="xsec">
              <div className="xhd">Data · Export / Import {IS_DEV && <span style={{color:'#F7B731',marginLeft:6}}>DEV MODE</span>}</div>
              <div style={{ fontSize: 11, color: "var(--mid)", marginBottom: 10, lineHeight: 1.6 }}>
                {IS_DEV
                  ? "DEV build — data saved to separate key. Production data is untouched."
                  : "PRODUCTION — data is preserved. Export JSON to back up or move to another device."}
              </div>
              <div className="xrow">
                <button className="xbtn primary" onClick={doExport}>EXPORT</button>
                <button className="xbtn" onClick={() => { setShowExport(true); setImportText(""); }}>IMPORT</button>
                {IS_DEV && <button className="xbtn" style={{borderColor:'var(--red)',color:'var(--red)'}}
                  onClick={async () => { if(window.confirm("Wipe dev data?")) { await wipeDev(); setSt(mkDefault()); }}}>WIPE DEV</button>}
              </div>
              {showExport && (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    className="xtxt"
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="Paste exported JSON here to import..."
                    spellCheck={false}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button className="xbtn primary" onClick={doImport}>APPLY</button>
                    <button className="xbtn" onClick={() => { setShowExport(false); setImportMsg(""); }}>CLOSE</button>
                  </div>
                  {importMsg && <div style={{ marginTop: 6, fontSize: 11, color: importMsg.startsWith("✓") ? "var(--green)" : "var(--red)", letterSpacing: "1px" }}>{importMsg}</div>}
                </div>
              )}
            </div>
            <div className="sig">
              built between sets
              <span>dadlift · for the boys</span>
            </div>
          </div>
        )}

        {/* CALI TRAIN */}
        {st.mode === 1 && atab === 0 && (
          <div className="pg">
            <div className="shead" style={{ color: "#A78BFA" }}>
              HOLDS & SKILLS <span style={{ color: "var(--mid)", fontSize: 16 }}>/ {Object.keys(HOLDS).length}</span>
            </div>
            {(() => { const m = weeklyMotivation(); return (
              <div className="motd" style={{borderLeftColor:'#A78BFA'}}>
                <div className="motd-q">"{m.q}"</div>
                {m.a && <div className="motd-a">— {m.a}</div>}
              </div>
            ); })()}
            <div style={{ fontSize: 12, color: "var(--mid)", letterSpacing: "1px", marginBottom: 14, lineHeight: 1.6 }}>
              ✓ completed · ✕ dropped early
            </div>
            <div className="stack">
              {Object.entries(HOLDS).map(([id]) => (
                <HoldCard key={id} id={id} cfg={st.holdCfg[id]}
                  sets={st.holdSets[id] ?? Array(st.holdCfg[id].sets).fill("idle")}
                  onDone={si => markHoldDone(id, si)}
                  onFail={si => markHoldFail(id, si)} />
              ))}
            </div>
            <div className="fh">
              <span>SWIPE ← STATS</span>
              <button className="fhb" onClick={() => setAtab(1)}>STATS ▶</button>
            </div>
            <div className="sig">
              built between sets
              <span>dadlift · for the boys</span>
            </div>
          </div>
        )}

        {/* CALI STATS */}
        {st.mode === 1 && atab === 1 && (
          <div className="pg">
            <div style={{ fontSize: 10, color: "var(--mid)", letterSpacing: "1.5px", marginBottom: 14, fontWeight: 700 }}>TAP TO EXPAND · SWIPE → TRAIN</div>
            <div className="asec">
              <div className="at">Skills & Holds</div>
              {Object.keys(HOLDS).filter(id => !HOLDS[id].rehab).map(id => (
                <HoldStats key={id} id={id} history={holdHistory}
                  holdCfg={st.holdCfg} onCfg={updHoldCfg} />
              ))}
            </div>
            <div className="sig">
              built between sets
              <span>dadlift · for the boys</span>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
