import { useState, useEffect, useRef } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const BW = 95;
const BAR = 20;
const SNAP = 5;
const PLATE_SIZES = [20, 10, 5, 2.5];

function snapW(w) { return Math.max(BAR, Math.round(w / SNAP) * SNAP); }
function plates(kg) {
  let load = (kg - BAR) / 2;
  if (load <= 0) return "bar only";
  const used = [];
  PLATE_SIZES.forEach(function(p) {
    while (load >= p - 0.01) { used.push(p); load = Math.round((load - p) * 10) / 10; }
  });
  return used.length ? used.join(" + ") + " /side" : "bar only";
}
function epley(w, r) { return r === 1 ? w : snapW(w * (1 + r / 30)); }
function w4from8(w8) { return snapW((w8 / 0.72) * 0.8); }

// ── LIFTS ─────────────────────────────────────────────────────────────────────
const LIFTS = {
  deadlift: { name:"Deadlift",      abbr:"DL",  color:"#E85D04", base8:100, defInc:5, defIncD:10, rehab:false },
  squat:    { name:"Back Squat",    abbr:"BS",  color:"#F7B731", base8:80,  defInc:5, defIncD:10, rehab:false },
  bench:    { name:"Bench Press",   abbr:"BP",  color:"#48CAE4", base8:70,  defInc:5, defIncD:10, rehab:false },
  ohp:      { name:"OHP",           abbr:"OHP", color:"#74C69D", base8:45,  defInc:5, defIncD:5,  rehab:false },
  rows:     { name:"Bent-Over Row", abbr:"ROW", color:"#9D8DF1", base8:null,defInc:5, defIncD:10, rehab:true  },
};

const SCHED = [
  { week:1, label:"W1·D1", lifts:[{id:"bench",sets:4,reps:4,type:"4rep"},{id:"squat",sets:4,reps:8,type:"8rep"},{id:"ohp",sets:4,reps:8,type:"8rep"},{id:"rows",sets:4,reps:8,type:"8rep"}] },
  { week:1, label:"W1·D2", lifts:[{id:"bench",sets:4,reps:8,type:"8rep"},{id:"deadlift",sets:4,reps:4,type:"4rep"},{id:"ohp",sets:4,reps:4,type:"4rep"},{id:"rows",sets:4,reps:8,type:"8rep"}] },
  { week:1, label:"W1·D3", lifts:[{id:"bench",sets:3,reps:4,type:"4rep",amrap:true},{id:"squat",sets:3,reps:4,type:"4rep",amrap:true},{id:"ohp",sets:4,reps:8,type:"8rep"},{id:"rows",sets:4,reps:4,type:"4rep"}] },
  { week:2, label:"W2·D1", lifts:[{id:"bench",sets:4,reps:8,type:"8rep"},{id:"deadlift",sets:4,reps:8,type:"8rep"},{id:"ohp",sets:4,reps:4,type:"4rep"},{id:"rows",sets:4,reps:4,type:"4rep"}] },
  { week:2, label:"W2·D2", lifts:[{id:"bench",sets:4,reps:4,type:"4rep"},{id:"squat",sets:4,reps:8,type:"8rep"},{id:"ohp",sets:4,reps:8,type:"8rep"},{id:"rows",sets:4,reps:8,type:"8rep"}] },
  { week:2, label:"W2·D3", lifts:[{id:"bench",sets:4,reps:8,type:"8rep"},{id:"deadlift",sets:3,reps:4,type:"4rep",amrap:true},{id:"ohp",sets:3,reps:4,type:"4rep",amrap:true},{id:"rows",sets:4,reps:8,type:"8rep"}] },
];

// ── CALISTHENICS ──────────────────────────────────────────────────────────────
const HOLDS = {
  frontlever: { name:"Front Lever",   abbr:"FL",   color:"#F87171", emoji:"🦅", progression:"Tuck → Adv Tuck → Straddle → Full",    currentLevel:"Advanced Tuck",     goal:"Build to 15s → Straddle",    note:"Hips extended, near horizontal.",          defSecs:7,  defSets:5, defInc:1, isReps:false, rehab:false },
  deadhang:   { name:"Dead Hang",     abbr:"HNG",  color:"#34D399", emoji:"🪝", progression:"30s → 60s → weighted",                  currentLevel:"Building to 60s",   goal:"60s continuous hold",        note:"Full hang, active shoulders.",             defSecs:30, defSets:4, defInc:5, isReps:false, rehab:false },
  handstand:  { name:"Wall Handstand",abbr:"WHS",  color:"#60A5FA", emoji:"🤸", progression:"Wall-facing → 60s → freestanding",      currentLevel:"Wall-facing holds", goal:"60s wall-facing → kick-up",  note:"Chest to wall. Correct alignment.",         defSecs:20, defSets:4, defInc:5, isReps:false, rehab:false },
  hspushup:   { name:"Wall HSPU",     abbr:"HSPU", color:"#FBBF24", emoji:"💪", progression:"Negatives → partial → full → strict",   currentLevel:"Negatives + partial",goal:"Strict from negatives",     note:"~55kg OHP threshold. Control descent.",    defSecs:0,  defSets:4, defInc:0, isReps:true, defReps:3,  rehab:false },
  lsit:       { name:"L-Sit",         abbr:"LS",   color:"#F472B6", emoji:"🪑", progression:"Tucked → One leg → Full → 20s",         currentLevel:"Tucked L-Sit",      goal:"Tucked to 20s → extend one", note:"Stay tucked. Build hip flexors + abs.",    defSecs:10, defSets:4, defInc:2, isReps:false, rehab:false },
  muscleup:   { name:"Muscle-Up",     abbr:"MU",   color:"#9D8DF1", emoji:"🔝", progression:"False grip neg → kipping → strict",     currentLevel:"PAUSED",            goal:"Paused — brachioradialis",   note:"Resume when elbow clear.",                 defSecs:0,  defSets:0, defInc:0, isReps:true, defReps:0,  rehab:true  },
};

// ── BENCHMARKS ────────────────────────────────────────────────────────────────
const STANDARDS = {
  deadlift: { label:"Deadlift",    color:"#E85D04", tiers:[{label:"Beginner",kg:115},{label:"Intermediate",kg:160,goal:true},{label:"Advanced",kg:205},{label:"Elite",kg:260}] },
  squat:    { label:"Back Squat",  color:"#F7B731", tiers:[{label:"Beginner",kg:100},{label:"Intermediate",kg:140,goal:true},{label:"Advanced",kg:180},{label:"Elite",kg:230}] },
  bench:    { label:"Bench Press", color:"#48CAE4", tiers:[{label:"Beginner",kg:73}, {label:"Intermediate",kg:95, goal:true},{label:"Advanced",kg:115},{label:"Elite",kg:150}] },
  ohp:      { label:"OHP",         color:"#74C69D", tiers:[{label:"Beginner",kg:50}, {label:"Intermediate",kg:70, goal:true},{label:"Advanced",kg:90}, {label:"Elite",kg:115}] },
};

// ── MOTIVATIONS ───────────────────────────────────────────────────────────────
const MOTIVATIONS = [
  { q:"You have power over your mind, not outside events. Realise this, and you will find strength.", a:"Marcus Aurelius" },
  { q:"The impediment to action advances action. What stands in the way becomes the way.", a:"Marcus Aurelius" },
  { q:"Waste no more time arguing what a good man should be. Be one.", a:"Marcus Aurelius" },
  { q:"It is not death that a man should fear, but he should fear never beginning to live.", a:"Marcus Aurelius" },
  { q:"Confine yourself to the present.", a:"Marcus Aurelius" },
  { q:"Accept the things to which fate binds you, and love the people with whom fate brings you together.", a:"Marcus Aurelius" },
  { q:"Make the best use of what is in your power, and take the rest as it happens.", a:"Epictetus" },
  { q:"First say to yourself what you would be; then do what you have to do.", a:"Epictetus" },
  { q:"No man is free who is not master of himself.", a:"Epictetus" },
  { q:"We suffer more in imagination than in reality.", a:"Seneca" },
  { q:"Difficulties strengthen the mind, as labour does the body.", a:"Seneca" },
  { q:"Begin at once to live, and count each separate day as a separate life.", a:"Seneca" },
  { q:"Life is long if you know how to use it.", a:"Seneca" },
  { q:"The only way to make sense out of change is to plunge into it, move with it, and join the dance.", a:"Alan Watts" },
  { q:"You are under no obligation to be the same person you were five minutes ago.", a:"Alan Watts" },
  { q:"I must not fear. Fear is the mind-killer. Fear is the little-death that brings total obliteration. I will face my fear.", a:"Frank Herbert, Dune" },
  { q:"Without change, something sleeps inside us and seldom awakens. The sleeper must awaken.", a:"Frank Herbert, Dune" },
  { q:"The slow blade penetrates the shield.", a:"Frank Herbert, Dune" },
  { q:"You are stopping at 40% of what you actually have. The 40% rule.", a:"David Goggins" },
  { q:"The most important conversation you'll ever have is the one you have with yourself.", a:"David Goggins" },
  { q:"He who has a why to live can bear almost any how.", a:"Friedrich Nietzsche" },
  { q:"That which does not kill us makes us stronger.", a:"Friedrich Nietzsche" },
  { q:"The cave you fear to enter holds the treasure you seek.", a:"Joseph Campbell" },
  { q:"A hero is someone who has given his life to something bigger than himself.", a:"Joseph Campbell" },
  { q:"Do not go gentle into that good night. Rage, rage against the dying of the light.", a:"Dylan Thomas" },
  { q:"You're not training to be impressive. You're training to still be there.", a:null },
  { q:"Three sessions a week. A few decades of being able to get on the floor with them.", a:null },
  { q:"The goal isn't to be the strongest in the room. It's to still be in the room at 60.", a:null },
  { q:"Health isn't a vanity project. It's how you stay present for the people who need you.", a:null },
  { q:"Participate. Don't just watch.", a:null },
];

function getWeeklyMotivation() {
  var now = new Date();
  var start = new Date(now.getFullYear(), 0, 1);
  var week = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  return MOTIVATIONS[week % MOTIVATIONS.length];
}

const FAIL_TEXTS = ["YOU GOT THIS","COME ON","NEXT ONE","STAY IN IT","FIGHT BACK","THAT'S GROWTH","GRIND TIME","RESET & GO"];
const DONE_EMOJIS = ["💪","🔥","⚡","🏋️","💥","🦾","👊","🎯","🚀","🔱","💫","🏆"];
const HOLD_EMOJIS = ["🧘","⏱️","🫁","🔥","💪","⚡","🎯","🏔️","🦅","🌊"];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── STORAGE ───────────────────────────────────────────────────────────────────
// API-backed persistence — token read from URL path at runtime
import api from './api.js';

async function loadState() {
  try {
    // Load blob first
    var state = await api.getState().catch(function() { return null; });
    if (!state) return null;

    // Merge structured tables — CLI updates take precedence over blob
    var weights     = await api.getWeights().catch(function() { return {}; });
    var progs       = await api.getProgressions().catch(function() { return {}; });
    var deloads     = await api.getDeloads().catch(function() { return {}; });
    var holdCfg     = await api.getHoldConfig().catch(function() { return {}; });

    // Only override if structured table has data (non-empty)
    if (Object.keys(weights).length)  state.weights  = Object.assign({}, state.weights,  weights);
    if (Object.keys(progs).length)    state.progs    = Object.assign({}, state.progs,    progs);
    if (Object.keys(deloads).length)  state.deloads  = Object.assign({}, state.deloads,  deloads);
    if (Object.keys(holdCfg).length)  state.holdCfg  = Object.assign({}, state.holdCfg,  holdCfg);

    return normalizeState(state);
  } catch(e) { return null; }
}

async function saveState(data) {
  try {
    // Save full blob
    await api.saveState(data);

    // Also sync structured tables so CLI/agent queries stay accurate
    if (data.weights)  await api.bulkWeights(data.weights).catch(function(){});
    if (data.deloads) {
      Object.keys(data.deloads).forEach(function(id) {
        api.setDeload(id, data.deloads[id]).catch(function(){});
      });
    }
    if (data.progs) {
      Object.keys(data.progs).forEach(function(id) {
        api.setProgression(id, data.progs[id]).catch(function(){});
      });
    }
    if (data.holdCfg) {
      Object.keys(data.holdCfg).forEach(function(id) {
        var cfg = data.holdCfg[id];
        api.setHoldConfig(id, { secs: cfg.secs, reps: cfg.reps, sets: cfg.sets, inc: cfg.inc }).catch(function(){});
      });
    }
  } catch(e) {}
}

// ── DEFAULT STATE ─────────────────────────────────────────────────────────────
function makeDefaultWeights() {
  var weights = {};
  Object.keys(LIFTS).forEach(function(id) {
    weights[id] = LIFTS[id].base8 ? snapW(LIFTS[id].base8) : null;
  });
  return weights;
}

function makeDefaultProgs() {
  var progs = {};
  Object.keys(LIFTS).forEach(function(id) {
    progs[id] = { inc: LIFTS[id].defInc, incD: LIFTS[id].defIncD };
  });
  return progs;
}

function makeDefaultLiftSets() {
  var result = {};
  SCHED.forEach(function(day, i) {
    result[i] = {};
    day.lifts.forEach(function(sl) {
      result[i][sl.id] = Array(sl.sets + (sl.amrap ? 1 : 0)).fill("idle");
    });
  });
  return result;
}

function makeDefaultHoldCfg() {
  var cfg = {};
  Object.keys(HOLDS).forEach(function(id) {
    var h = HOLDS[id];
    cfg[id] = { secs: h.defSecs, sets: h.defSets, inc: h.defInc, reps: h.defReps || 1 };
  });
  return cfg;
}

function makeDefaultHoldSets(holdCfg) {
  var result = {};
  Object.keys(HOLDS).forEach(function(id) {
    var h = HOLDS[id];
    var count = h.rehab ? 0 : (holdCfg[id] ? holdCfg[id].sets : h.defSets);
    result[id] = Array(count).fill("idle");
  });
  return result;
}

function makeDefault() {
  var holdCfg = makeDefaultHoldCfg();
  return {
    mode: 0, bbTab: 0, caliTab: 0, dayIdx: 0, cycle: 1, sessionLog: [],
    weights: makeDefaultWeights(),
    progs: makeDefaultProgs(),
    liftSets: makeDefaultLiftSets(),
    deloads: {},
    holdCfg: holdCfg,
    holdSets: makeDefaultHoldSets(holdCfg),
  };
}

function normalizeState(raw) {
  var base = makeDefault();
  var state = Object.assign({}, base, raw || {});
  state.weights = Object.assign({}, base.weights, state.weights || {});
  state.progs = Object.assign({}, base.progs, state.progs || {});
  state.liftSets = Object.assign({}, base.liftSets, state.liftSets || {});
  state.deloads = Object.assign({}, base.deloads, state.deloads || {});
  state.holdCfg = Object.assign({}, base.holdCfg, state.holdCfg || {});
  state.holdSets = Object.assign({}, base.holdSets, state.holdSets || {});
  state.failLog = Object.assign({}, state.failLog || {});
  state.sessionLog = Array.isArray(state.sessionLog) ? state.sessionLog : [];
  if (!Number.isFinite(Number(state.mode))) state.mode = base.mode;
  if (!Number.isFinite(Number(state.bbTab))) state.bbTab = base.bbTab;
  if (!Number.isFinite(Number(state.caliTab))) state.caliTab = base.caliTab;
  if (!Number.isFinite(Number(state.dayIdx)) || !SCHED[state.dayIdx]) state.dayIdx = base.dayIdx;
  if (!Number.isFinite(Number(state.cycle))) state.cycle = base.cycle;
  return state;
}

// ── BURST SYSTEM ──────────────────────────────────────────────────────────────
var burstId = 0;
var burstListeners = new Set();

function emitBurst(particles) {
  burstListeners.forEach(function(fn) { fn(particles); });
}

function makeDoneBurst(cx, cy, emojis) {
  return Array.from({ length: 9 }, function() {
    return {
      id: burstId++, type: "done",
      emoji: pickRandom(emojis), x: cx, y: cy,
      dx: (Math.random() - 0.5) * 260,
      dy: -(Math.random() * 200 + 50),
      rot: (Math.random() - 0.5) * 500,
      sc: 0.65 + Math.random() * 0.8,
    };
  });
}

function makeFailBurst(cx, cy) {
  return [{ id: burstId++, type: "fail", text: pickRandom(FAIL_TEXTS), x: cx, y: cy }];
}

function BurstOverlay() {
  var pair = useState([]);
  var items = pair[0];
  var setItems = pair[1];

  useEffect(function() {
    function handler(particles) {
      setItems(function(prev) { return prev.concat(particles); });
      setTimeout(function() {
        setItems(function(prev) {
          var ids = new Set(particles.map(function(p) { return p.id; }));
          return prev.filter(function(p) { return !ids.has(p.id); });
        });
      }, 950);
    }
    burstListeners.add(handler);
    return function() { burstListeners.delete(handler); };
  }, []);

  if (!items.length) return null;

  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9999, overflow:"hidden" }}>
      {items.map(function(p) {
        if (p.type === "done") {
          return (
            <div key={p.id} style={{
              position:"absolute", left:p.x, top:p.y,
              fontSize: (20 * p.sc) + "px", lineHeight:1,
              animation:"bfly .85s cubic-bezier(.2,.8,.4,1) forwards",
              "--dx": p.dx + "px", "--dy": p.dy + "px", "--rot": p.rot + "deg",
            }}>{p.emoji}</div>
          );
        }
        return (
          <div key={p.id} style={{
            position:"absolute", left: p.x - 80, top:p.y, width:160,
            textAlign:"center", fontFamily:"'Nunito',sans-serif",
            fontSize:20, fontWeight:900, color:"#FF3B3B",
            animation:"frise .9s cubic-bezier(.2,.8,.4,1) forwards",
          }}>{p.text}</div>
        );
      })}
    </div>
  );
}

// ── MINI CHART ────────────────────────────────────────────────────────────────
function MiniChart(props) {
  var data = props.data;
  var color = props.color;
  if (!data || data.length === 0) {
    return <div style={{ height:60, display:"flex", alignItems:"center", justifyContent:"center", color:"#999", fontSize:9, letterSpacing:"1px", fontWeight:700 }}>LOG SESSIONS TO SEE CHART</div>;
  }
  var W = 320, H = 56, P = 8;
  var vals = data.map(function(d) { return d.y; });
  var mn = Math.min.apply(null, vals);
  var mx = Math.max.apply(null, vals);
  var rng = mx - mn || 1;
  // With 1 point, centre it
  function px(i) { return data.length === 1 ? W / 2 : P + (i / (data.length - 1)) * (W - P * 2); }
  function py(v) { return data.length === 1 ? H / 2 : P + (1 - (v - mn) / rng) * (H - P * 2); }
  var pts = data.map(function(d, i) { return [px(i), py(d.y)]; });
  var gid = "g" + color.replace("#", "");
  if (data.length === 1) {
    return (
      <svg width="100%" height={H} viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none">
        <circle cx={pts[0][0]} cy={pts[0][1]} r={6} fill={color} />
        <text x={pts[0][0] + 10} y={pts[0][1] + 4} fontSize="10" fill={color} fontFamily="Space Mono" fontWeight="700">{Math.round(data[0].y)}</text>
        <text x={P} y={H - 2} fontSize="8" fill="#ccc" fontFamily="Space Mono">session 1</text>
      </svg>
    );
  }
  var line = pts.map(function(p, i) { return (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
  var last = pts[pts.length - 1];
  var area = line + " L" + last[0] + "," + H + " L" + P + "," + H + " Z";
  return (
    <svg width="100%" height={H} viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={"url(#" + gid + ")"} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" />
      {pts.map(function(pt, i) {
        return <circle key={i} cx={pt[0]} cy={pt[1]} r={i === pts.length - 1 ? 3 : 1.5} fill={color} />;
      })}
    </svg>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────
var css = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@900&family=Space+Mono:wght@400;700&family=Fraunces:ital,opsz,wght@1,9..144,900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#FAFAF5;--card:#FFFFFF;--lift:#F4F4EE;--rule:#E0E0D8;--light:#E8E8E0;
  --ink:#111111;--mid:#666666;--sub:#999999;
  --green:#06C270;--green-bg:#DCFCE7;
  --red:#FF3B3B;--red-bg:#FEE2E2;
  --yellow:#FFD93D;--orange:#FF5C00;--purple:#8B5CF6;
}
html{-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--ink);font-family:'Space Mono',monospace;font-size:13px;-webkit-font-smoothing:antialiased;overscroll-behavior:none}
.bar{display:flex;align-items:center;gap:5px;padding:max(env(safe-area-inset-top),8px) 10px 0;height:calc(52px + max(env(safe-area-inset-top),8px));background:var(--bg);border-bottom:3px solid var(--ink);position:sticky;top:0;z-index:1000;overflow:hidden}
.logo{font-family:'Nunito',sans-serif;font-size:22px;font-weight:900;letter-spacing:-1px;line-height:1;flex-shrink:0}

.bar-gap{flex:1}
.sdot{width:8px;height:8px;border-radius:50%;background:var(--light);border:2px solid var(--rule);transition:all .3s;flex-shrink:0}
.sdot.on{background:var(--green);border-color:var(--green)}
.mtabs{display:flex;border:2px solid var(--ink);border-radius:100px;overflow:hidden;flex-shrink:0;box-shadow:2px 2px 0 var(--ink)}
.mtab{padding:0 8px;height:30px;font-size:14px;background:var(--card);color:var(--mid);border:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.stabs{display:flex;border:2px solid var(--ink);border-radius:100px;overflow:hidden;flex-shrink:0;box-shadow:2px 2px 0 var(--ink)}
.stab{padding:0 9px;height:30px;font-family:'Space Mono',monospace;font-size:9px;font-weight:700;letter-spacing:0.5px;background:var(--card);color:var(--mid);border:none;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent}
.stab.on{background:var(--orange);color:#fff}
.pg{padding:14px 12px 80px;max-width:390px;margin:0 auto}
.motd{background:var(--yellow);border:3px solid var(--ink);border-radius:16px;padding:14px 16px;margin-bottom:16px;box-shadow:4px 4px 0 var(--ink)}
.motd-q{font-family:'Fraunces',serif;font-style:italic;font-size:15px;line-height:1.55;color:var(--ink);margin-bottom:6px}
.motd-a{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--mid)}
.wtag{display:inline-flex;gap:6px;align-items:center;background:var(--yellow);border:3px solid var(--ink);border-radius:100px;padding:3px 12px;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:12px;box-shadow:2px 2px 0 var(--ink)}
.drow{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px}
.dbt{height:34px;padding:0 12px;border:3px solid var(--ink);border-radius:100px;background:var(--card);color:var(--mid);cursor:pointer;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;box-shadow:2px 2px 0 var(--ink);transition:transform 80ms,box-shadow 80ms;display:flex;align-items:center;-webkit-tap-highlight-color:transparent}
.dbt:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.dbt.on{color:#fff;box-shadow:2px 2px 0 var(--ink)}
.shead{font-family:'Nunito',sans-serif;font-size:24px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;margin-bottom:12px;line-height:1;color:var(--orange)}
.stack{display:flex;flex-direction:column;gap:8px}
.bc{background:var(--card);border:3px solid var(--ink);border-radius:16px;overflow:hidden;box-shadow:5px 5px 0 var(--ink);transition:box-shadow .12s,border-color .12s}
.bc.isdone{border-color:var(--green);box-shadow:5px 5px 0 var(--green)}
.bc.isfail{border-color:var(--red);box-shadow:5px 5px 0 var(--red)}
.bc-dl{padding:7px 14px;background:var(--red-bg);border-bottom:3px solid var(--red);color:var(--red);font-size:11px;font-weight:700;letter-spacing:1px}
.bc-top{display:flex;align-items:stretch;padding:12px 12px 8px 14px;gap:10px}
.bc-dot{width:14px;height:14px;border-radius:50%;border:3px solid var(--ink);flex-shrink:0;margin-top:4px}
.bc-inf{flex:1;min-width:0}
.bc-name{font-family:'Nunito',sans-serif;font-size:19px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;line-height:1.1;margin-bottom:4px}
.bc-wrow{display:flex;align-items:baseline;gap:6px;margin-bottom:2px}
.bc-w{font-family:'Nunito',sans-serif;font-size:58px;font-weight:900;line-height:1;letter-spacing:-3px}
.bc-kg{font-family:'Space Mono',monospace;font-size:15px;color:var(--mid);font-weight:700}
.bc-plates{display:inline-block;font-size:13px;font-weight:700;color:#fff;background:var(--ink);border-radius:6px;padding:3px 9px;margin-bottom:6px;letter-spacing:0.5px}
.bc-sch{font-family:'Nunito',sans-serif;font-size:24px;font-weight:900;letter-spacing:-1px;display:flex;align-items:center;gap:8px;line-height:1}
.bc-pct{font-family:'Space Mono',monospace;font-size:11px;color:var(--mid);font-weight:700;background:var(--light);border:2px solid var(--rule);border-radius:100px;padding:1px 8px}
.amrap-tag{font-family:'Space Mono',monospace;font-size:9px;font-weight:700;letter-spacing:1px;background:var(--yellow);border:2px solid var(--ink);border-radius:100px;padding:2px 8px;color:var(--ink)}
.bc-sdots{display:flex;flex-direction:column;gap:5px;padding-top:5px;align-self:flex-start;flex-shrink:0}
.dot{width:11px;height:11px;border-radius:50%;border:3px solid var(--light);background:transparent;transition:all .1s}
.dot.done{background:var(--green);border-color:var(--green)}
.dot.fail{background:var(--red);border-color:var(--red)}
.dot.sq{border-radius:4px}
.sets-row{display:flex;gap:5px;padding:0 10px 12px;border-top:2px solid var(--light);padding-top:8px;margin-top:2px}
.sblk{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1}
.slbl{font-size:10px;color:var(--mid);font-weight:700;letter-spacing:1px}
.slbl.am{color:var(--orange)}
.spair{display:flex;width:100%;border:3px solid var(--ink);border-radius:12px;overflow:hidden;box-shadow:2px 2px 0 var(--ink)}
.sd,.sf{flex:1;height:50px;border:none;background:var(--bg);color:var(--light);font-size:19px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .08s,color .08s;-webkit-tap-highlight-color:transparent}
.sd{border-right:2px solid var(--light)}
.sd:active{background:var(--green-bg);color:var(--green)}
.sf:active{background:var(--red-bg);color:var(--red)}
.sd.on{background:var(--green-bg);color:var(--green)}
.sf.on{background:var(--red-bg);color:var(--red)}
.hc{background:var(--card);border:3px solid var(--ink);border-radius:16px;overflow:hidden;box-shadow:5px 5px 0 var(--ink);transition:box-shadow .12s,border-color .12s}
.hc.isdone{border-color:var(--green);box-shadow:5px 5px 0 var(--green)}
.hc.isfail{border-color:var(--red);box-shadow:5px 5px 0 var(--red)}
.hc-top{display:flex;align-items:stretch;padding:12px 12px 8px 14px;gap:10px}
.hc-inf{flex:1;min-width:0}
.hc-name{font-family:'Nunito',sans-serif;font-size:19px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;margin-bottom:4px}
.hc-val{font-family:'Nunito',sans-serif;font-size:54px;font-weight:900;line-height:1;letter-spacing:-3px}
.hc-unit{font-family:'Space Mono',monospace;font-size:14px;color:var(--mid);font-weight:700;margin-left:2px}
.hc-goal{font-size:12px;color:var(--mid);margin-top:3px;font-style:italic;font-weight:700}
.hc-note{font-size:11px;color:var(--mid);margin-top:2px;line-height:1.4;font-weight:700}
.hc-sets{display:flex;gap:5px;padding:0 10px 12px;border-top:2px solid var(--light);padding-top:8px;margin-top:2px}
.hsd,.hsf{flex:1;height:50px;border:none;background:var(--bg);color:var(--light);font-size:19px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .08s,color .08s;-webkit-tap-highlight-color:transparent}
.hsd{border-right:2px solid var(--light)}
.hsd:active{background:var(--green-bg);color:var(--green)}
.hsf:active{background:var(--red-bg);color:var(--red)}
.hsd.on{background:var(--green-bg);color:var(--green)}
.hsf.on{background:var(--red-bg);color:var(--red)}
.rehab-card{display:flex;align-items:center;gap:12px;padding:14px;background:var(--light);border:3px solid var(--ink);border-radius:16px;box-shadow:4px 4px 0 var(--ink)}
.rehab-name{font-family:'Nunito',sans-serif;font-size:18px;font-weight:900;text-transform:uppercase;color:var(--mid)}
.rehab-sub{font-size:11px;color:var(--sub);font-weight:700;margin-top:2px}
.at{font-family:'Nunito',sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;border-bottom:3px solid var(--orange);padding-bottom:7px;margin-bottom:12px;color:var(--orange)}
.asec{margin-bottom:22px}
.lac{background:var(--card);border:3px solid var(--ink);border-radius:14px;margin-bottom:7px;box-shadow:4px 4px 0 var(--ink)}
.lach{display:flex;align-items:center;gap:8px;padding:12px 13px;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
.lach:active{background:var(--lift)}
.la-ab{font-family:'Nunito',sans-serif;font-size:21px;font-weight:900;line-height:1;letter-spacing:-0.5px;text-transform:uppercase}
.la-nm{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--mid);margin-top:2px}
.la-st{margin-left:auto;display:flex;gap:12px}
.la-sv{font-family:'Nunito',sans-serif;font-size:19px;font-weight:900;line-height:1;letter-spacing:-0.5px}
.la-sl{font-size:9px;font-weight:700;letter-spacing:1px;color:var(--mid);text-transform:uppercase;margin-top:2px}
.la-ch{font-size:10px;color:var(--sub);transition:transform .2s;margin-left:4px;flex-shrink:0}
.la-ch.op{transform:rotate(90deg)}
.lacb{padding:0 13px 13px}
.ctabs{display:flex;gap:5px;margin-bottom:8px;flex-wrap:wrap}
.ctab{padding:5px 12px;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border:3px solid var(--ink);border-radius:100px;background:var(--bg);color:var(--mid);cursor:pointer;box-shadow:2px 2px 0 var(--ink);transition:transform 80ms,box-shadow 80ms;-webkit-tap-highlight-color:transparent}
.ctab:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.ctab.on{color:#fff;font-weight:700}
.clbl{font-size:10px;color:var(--mid);font-weight:700;margin-bottom:5px}
.cdiv{border-top:2px solid var(--rule);margin-top:10px;padding-top:8px}
.chd{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--mid);margin-bottom:7px}
.crow{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.clabel{font-size:11px;font-weight:700;color:var(--mid);width:78px;flex-shrink:0}
.cst{display:flex;align-items:center;border:3px solid var(--ink);border-radius:12px;overflow:hidden;box-shadow:2px 2px 0 var(--ink)}
.cb{width:38px;height:38px;background:var(--card);border:none;color:var(--ink);cursor:pointer;font-size:17px;font-weight:700;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
.cb:active{background:var(--lift)}
.cv{min-width:50px;text-align:center;font-family:'Space Mono',monospace;font-size:12px;font-weight:700;padding:4px;background:var(--bg);color:var(--ink);border:none;border-left:2px solid var(--light);border-right:2px solid var(--light)}
.crst{font-size:10px;font-weight:700;letter-spacing:1px;color:var(--mid);background:none;border:3px solid var(--rule);border-radius:100px;padding:5px 12px;cursor:pointer;font-family:'Space Mono',monospace;margin-top:4px;-webkit-tap-highlight-color:transparent}
.gbadge{font-size:11px;font-weight:700;background:#FFF9C4;border:2px solid var(--ink);border-radius:100px;padding:4px 12px;display:inline-block;margin-bottom:10px}
.bm-card{background:var(--card);border:3px solid var(--ink);border-radius:14px;margin-bottom:8px;box-shadow:4px 4px 0 var(--ink);overflow:hidden}
.bm-head{display:flex;align-items:center;gap:10px;padding:11px 13px}
.bm-dot{width:14px;height:14px;border-radius:50%;border:3px solid var(--ink);flex-shrink:0}
.bm-name{font-family:'Nunito',sans-serif;font-size:19px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;color:var(--ink)}
.bm-orm{margin-left:auto;text-align:right}
.bm-orm-val{font-family:'Nunito',sans-serif;font-size:22px;font-weight:900;line-height:1;letter-spacing:-0.5px}
.bm-orm-lbl{font-size:9px;font-weight:700;letter-spacing:1px;color:var(--ink);text-transform:uppercase;opacity:0.5}
.bm-tiers{padding:0 13px 13px}
.bm-tier{margin-bottom:8px}
.bm-tier-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px}
.bm-tier-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink)}
.bm-tier-kg{font-family:'Nunito',sans-serif;font-size:16px;font-weight:900;line-height:1;letter-spacing:-0.5px;color:var(--ink)}
.bm-track{height:10px;background:var(--light);border:2px solid var(--ink);border-radius:100px;overflow:hidden}
.bm-fill{height:100%;transition:width .6s ease;border-radius:100px}
.bm-src{font-size:9px;color:var(--mid);margin-top:8px;font-style:italic;font-weight:700}
.bm-achieved{font-size:9px;font-weight:700;background:var(--green-bg);border:2px solid var(--green);border-radius:100px;padding:1px 7px;margin-left:6px;color:var(--green)}
.dlr{display:flex;justify-content:space-between;align-items:center;padding:11px 13px;background:var(--red-bg);border:3px solid var(--red);border-radius:12px;margin-bottom:6px;box-shadow:3px 3px 0 var(--ink)}
.xsec{margin-top:24px;padding-top:14px;border-top:3px solid var(--rule)}
.xhd{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--mid);margin-bottom:10px}
.xrow{display:flex;gap:7px;flex-wrap:wrap}
.xbtn{flex:1;min-width:90px;padding:10px 8px;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:1px;border:3px solid var(--ink);border-radius:100px;background:var(--card);color:var(--mid);cursor:pointer;text-align:center;box-shadow:2px 2px 0 var(--ink);transition:transform 80ms,box-shadow 80ms;-webkit-tap-highlight-color:transparent}
.xbtn:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.xbtn.pri{background:var(--orange);border-color:var(--orange);color:#fff}
.xtxt{width:100%;margin-top:8px;padding:10px;background:var(--lift);border:3px solid var(--ink);border-radius:12px;color:var(--ink);font-family:'Space Mono',monospace;font-size:11px;resize:vertical;min-height:80px}
.fh{margin-top:18px;padding-top:12px;border-top:3px solid var(--ink);font-size:10px;font-weight:700;color:var(--ink);letter-spacing:1px;display:flex;justify-content:space-between;align-items:center}
.fhb{background:none;border:3px solid var(--ink);border-radius:100px;color:var(--ink);padding:7px 14px;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;cursor:pointer;box-shadow:2px 2px 0 var(--ink);transition:transform 80ms,box-shadow 80ms;-webkit-tap-highlight-color:transparent}
.fhb:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.sig{margin-top:36px;padding-bottom:16px;text-align:center;font-size:11px;color:var(--light);letter-spacing:1.5px;font-style:italic;line-height:1.8}
.sig span{display:block;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--rule);margin-top:2px;font-style:normal;font-weight:700}

.fail-log{margin-top:12px;padding-top:10px;border-top:2px solid var(--rule)}
.fail-log-hd{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--mid);margin-bottom:8px}
.fail-entry{display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--red-bg);border:2px solid var(--red);border-radius:10px;margin-bottom:5px}
.fail-entry-set{font-size:9px;font-weight:700;letter-spacing:1px;color:var(--red);text-transform:uppercase;min-width:32px}
.fail-entry-val{font-family:'Nunito',sans-serif;font-size:18px;font-weight:900;color:var(--red);letter-spacing:-0.5px}
.fail-entry-unit{font-size:10px;color:var(--red);font-weight:700;margin-left:1px}
.fail-entry-sep{font-size:11px;color:var(--mid);font-weight:700;margin:0 4px}
.fail-entry-day{margin-left:auto;font-size:9px;color:var(--mid);font-weight:700;letter-spacing:1px}

.celebrate-banner{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:150;pointer-events:none}
.celebrate-card{background:#fff;border:4px solid var(--ink);border-radius:24px;padding:28px 36px;text-align:center;box-shadow:8px 8px 0 var(--ink);animation:popIn .35s cubic-bezier(.2,1.4,.4,1) forwards}
.celebrate-title{font-family:'Nunito',sans-serif;font-size:42px;font-weight:900;line-height:1;letter-spacing:-1px;margin-bottom:6px}
.celebrate-sub{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--mid)}
@keyframes popIn{0%{transform:scale(0.6);opacity:0}100%{transform:scale(1);opacity:1}}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:200;display:flex;align-items:flex-end;justify-content:center;padding:0 0 20px}
.modal{background:var(--card);border:3px solid var(--ink);border-radius:20px 20px 16px 16px;width:100%;max-width:390px;padding:20px 20px 24px;box-shadow:0 -4px 0 var(--ink)}
.modal-title{font-family:'Nunito',sans-serif;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:var(--mid);margin-bottom:4px}
.modal-lift{font-family:'Nunito',sans-serif;font-size:24px;font-weight:900;text-transform:uppercase;margin-bottom:18px;letter-spacing:-0.5px}
.modal-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding:12px 14px;background:var(--lift);border:2px solid var(--rule);border-radius:12px}
.modal-row-label{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--mid)}
.modal-row-val{font-family:'Nunito',sans-serif;font-size:36px;font-weight:900;line-height:1;letter-spacing:-1px}
.modal-row-unit{font-size:13px;color:var(--mid);font-family:'Space Mono',monospace;font-weight:700;margin-left:2px}
.modal-row-target{font-size:11px;color:var(--mid);font-weight:700;margin-top:2px}
.modal-dec{width:52px;height:52px;border:3px solid var(--ink);border-radius:12px;background:var(--card);font-size:22px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 var(--ink);transition:transform 80ms,box-shadow 80ms;-webkit-tap-highlight-color:transparent;font-family:'Nunito',sans-serif}
.modal-dec:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.modal-actions{display:flex;gap:8px;margin-top:4px}
.modal-btn{flex:1;padding:13px;border:3px solid var(--ink);border-radius:100px;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;box-shadow:2px 2px 0 var(--ink);transition:transform 80ms,box-shadow 80ms;-webkit-tap-highlight-color:transparent;background:var(--card);color:var(--ink)}
.modal-btn:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.modal-btn-confirm{background:var(--red);border-color:var(--red);color:#fff}

@keyframes bfly{0%{transform:translate(0,0) rotate(0) scale(1);opacity:1}70%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(.3);opacity:0}}
@keyframes frise{0%{transform:translateY(0) scale(.6);opacity:0}15%{transform:translateY(-8px) scale(1.05);opacity:1}70%{opacity:1}100%{transform:translateY(-80px) scale(.9);opacity:0}}
`;


// ── FAIL MODAL ────────────────────────────────────────────────────────────────
function prevPlateWeight(kg) {
  // Step down to previous valid plate increment
  var result = Math.max(BAR, snapW(kg - SNAP));
  return result;
}

function FailModal(props) {
  var liftName = props.liftName;
  var liftColor = props.liftColor;
  var targetWeight = props.targetWeight;
  var targetReps = props.targetReps;
  var setNum = props.setNum;
  var onConfirm = props.onConfirm;
  var onCancel = props.onCancel;

  var weightPair = useState(targetWeight);
  var achievedWeight = weightPair[0];
  var setAchievedWeight = weightPair[1];

  var repsPair = useState(Math.max(1, targetReps - 1));
  var achievedReps = repsPair[0];
  var setAchievedReps = repsPair[1];

  return (
    <div className="modal-overlay" onClick={function(e) { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal">
        <div className="modal-title">Set {setNum} — what did you get?</div>
        <div className="modal-lift" style={{ color: liftColor }}>{liftName}</div>

        <div className="modal-row">
          <div>
            <div className="modal-row-label">Weight</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <div className="modal-row-val" style={{ color: achievedWeight < targetWeight ? "var(--red)" : liftColor }}>{achievedWeight}</div>
              <div className="modal-row-unit">kg</div>
            </div>
            <div className="modal-row-target">goal {targetWeight}kg · {plates(achievedWeight)}</div>
          </div>
          <button className="modal-dec"
            onClick={function() { setAchievedWeight(function(w) { return prevPlateWeight(w); }) }}
            disabled={achievedWeight <= BAR}>↓</button>
        </div>

        <div className="modal-row">
          <div>
            <div className="modal-row-label">Reps</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <div className="modal-row-val" style={{ color: achievedReps < targetReps ? "var(--red)" : liftColor }}>{achievedReps}</div>
              <div className="modal-row-unit">reps</div>
            </div>
            <div className="modal-row-target">goal {targetReps} reps</div>
          </div>
          <button className="modal-dec"
            onClick={function() { setAchievedReps(function(r) { return Math.max(0, r - 1); }) }}
            disabled={achievedReps <= 0}>↓</button>
        </div>

        <div className="modal-actions">
          <button className="modal-btn" onClick={onCancel}>CANCEL</button>
          <button className="modal-btn modal-btn-confirm"
            onClick={function() { onConfirm({ weight: achievedWeight, reps: achievedReps }); }}>
            LOG FAIL
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BARBELL CARD ──────────────────────────────────────────────────────────────
function BarbellCard(props) {
  var id = props.id, sl = props.sl, wt = props.wt, sets = props.sets, onDone = props.onDone, onFail = props.onFail, deload = props.deload;
  var lift = LIFTS[id];
  var tot = sets.length;
  var reg = sl.amrap ? tot - 1 : tot;
  var doneN = sets.filter(function(s) { return s === "done"; }).length;
  var failN = sets.filter(function(s) { return s === "fail"; }).length;
  var allDone = doneN === tot && failN === 0;
  var pct = sl.type === "4rep" ? "80%" : "72%";

  var modalPair = useState(null); // null or { setIdx }
  var activeModal = modalPair[0];
  var setActiveModal = modalPair[1];

  return (
    <div className={"bc" + (allDone ? " isdone" : failN ? " isfail" : "")}>
      {deload && <div className="bc-dl">⚠ 2 FAILS — HOLD WEIGHT NEXT CYCLE</div>}
      <div className="bc-top">
        <div className="bc-dot" style={{ background: lift.color }} />
        <div className="bc-inf">
          <div className="bc-name">{lift.name}</div>
          <div className="bc-wrow">
            <div className="bc-w" style={{ color: lift.color }}>{wt}</div>
            <div className="bc-kg">kg</div>
          </div>
          <div className="bc-plates">{plates(wt)}</div>
          <div className="bc-sch" style={{ color: lift.color }}>
            {sl.amrap ? reg + "×" + sl.reps + " + AMRAP" : tot + "×" + sl.reps}
            <span className="bc-pct">@ {pct}</span>
            {sl.amrap && <span className="amrap-tag">AMRAP</span>}
          </div>
        </div>
        <div className="bc-sdots">
          {sets.map(function(s, i) {
            var isAmrap = sl.amrap && i === tot - 1;
            var cls = "dot" + (isAmrap ? " sq" : "") + (s === "done" ? " done" : s === "fail" ? " fail" : "");
            var extraStyle = isAmrap && s === "idle" ? { borderColor: "#FFD93D" } : {};
            return <div key={i} className={cls} style={extraStyle} />;
          })}
        </div>
      </div>
      <div className="sets-row">
        {sets.map(function(state, i) {
          var isAmrap = sl.amrap && i === tot - 1;
          return (
            <div key={i} className="sblk">
              <div className={"slbl" + (isAmrap ? " am" : "")}>{isAmrap ? "AMRP" : "S" + (i + 1)}</div>
              <div className="spair">
                <button
                  className={"sd" + (state === "done" ? " on" : "")}
                  onClick={function(e) {
                    if (state !== "done") {
                      var rect = e.currentTarget.getBoundingClientRect();
                      emitBurst(makeDoneBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, DONE_EMOJIS));
                    }
                    onDone(i);
                  }}
                >✓</button>
                <button
                  className={"sf" + (state === "fail" ? " on" : "")}
                  onClick={function(e) {
                    if (state === "fail") { onFail(i); return; } // toggle off
                    setActiveModal({ setIdx: i });
                  }}
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>
      {activeModal !== null && (
        <FailModal
          liftName={lift.name}
          liftColor={lift.color}
          targetWeight={wt}
          targetReps={sl.reps}
          setNum={activeModal.setIdx + 1}
          onCancel={function() { setActiveModal(null); }}
          onConfirm={function(result) {
            var rect = { left: window.innerWidth / 2, top: window.innerHeight / 2 };
            emitBurst(makeFailBurst(rect.left, rect.top));
            onFail(activeModal.setIdx, result);
            setActiveModal(null);
          }}
        />
      )}
    </div>
  );
}

// ── HOLD CARD ─────────────────────────────────────────────────────────────────
function HoldCard(props) {
  var id = props.id, cfg = props.cfg || {}, sets = props.sets || [], onDone = props.onDone, onFail = props.onFail;
  var hold = HOLDS[id];
  var tot = sets.length;
  var doneN = sets.filter(function(s) { return s === "done"; }).length;
  var failN = sets.filter(function(s) { return s === "fail"; }).length;
  var allDone = doneN === tot && failN === 0 && tot > 0;
  var displayVal = hold.isReps ? (cfg.reps || 0) : cfg.secs;
  var displayUnit = hold.isReps ? "reps" : "sec";

  if (hold.rehab) {
    return (
      <div className="rehab-card">
        <div className="bc-dot" style={{ background: hold.color }} />
        <div>
          <div className="rehab-name">{hold.emoji} {hold.name}</div>
          <div style={{ fontSize:14, fontFamily:"'Nunito',sans-serif", fontWeight:900, color:"var(--sub)" }}>PAUSED</div>
          <div className="rehab-sub">{hold.note}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={"hc" + (allDone ? " isdone" : failN ? " isfail" : "")}>
      <div className="hc-top">
        <div className="bc-dot" style={{ background: hold.color }} />
        <div className="hc-inf">
          <div className="hc-name">{hold.emoji} {hold.name}</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
            <div className="hc-val" style={{ color: hold.color }}>{displayVal}</div>
            <div className="hc-unit">{displayUnit}</div>
          </div>
          <div className="hc-goal">{hold.goal}</div>
          <div className="hc-note">{hold.note}</div>
        </div>
        <div className="bc-sdots">
          {sets.map(function(s, i) {
            return <div key={i} className={"dot" + (s === "done" ? " done" : s === "fail" ? " fail" : "")} />;
          })}
        </div>
      </div>
      <div className="hc-sets">
        {sets.map(function(state, i) {
          return (
            <div key={i} className="sblk">
              <div className="slbl">S{i + 1}</div>
              <div className="spair">
                <button
                  className={"hsd" + (state === "done" ? " on" : "")}
                  onClick={function(e) {
                    if (state !== "done") {
                      var rect = e.currentTarget.getBoundingClientRect();
                      emitBurst(makeDoneBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, HOLD_EMOJIS));
                    }
                    onDone(i);
                  }}
                >✓</button>
                <button
                  className={"hsf" + (state === "fail" ? " on" : "")}
                  onClick={function(e) {
                    if (state !== "fail") {
                      var rect = e.currentTarget.getBoundingClientRect();
                      emitBurst(makeFailBurst(rect.left + rect.width / 2, rect.top + rect.height / 2));
                    }
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

// ── LIFT STATS ────────────────────────────────────────────────────────────────
function LiftStats(props) {
  var id = props.id, history = props.history || [], progs = props.progs || {}, onProg = props.onProg, failLog = props.failLog || {}, weight = props.weight, onWeight = props.onWeight;
  var lift = LIFTS[id];
  var pair1 = useState(false); var open = pair1[0]; var setOpen = pair1[1];
  var pair2 = useState("volume"); var ct = pair2[0]; var setCt = pair2[1];
  var ls = history
    .filter(function(entry) { return entry && entry.lifts && entry.lifts[id]; })
    .map(function(entry) { return entry.lifts[id]; });
  var volD = ls.map(function(x, i) { return { x:i, y:x.volume }; });
  var maxD = ls.map(function(x, i) { return { x:i, y:x.maxWeight }; });
  var ormD = ls.map(function(x, i) { return { x:i, y:x.orm }; });
  var chartD = ct === "volume" ? volD : ct === "max" ? maxD : ormD;
  var prog = progs[id] || {};
  var inc = prog.inc || lift.defInc;
  var incD = prog.incD || lift.defIncD;

  function stepProg(field, delta) {
    var cur = field === "inc" ? inc : incD;
    var updated = Object.assign({}, prog);
    updated[field] = Math.max(5, snapW(cur + delta));
    onProg(id, updated);
  }

  var lastOrm = ormD.length ? ormD[ormD.length - 1].y : null;
  var maxMax = maxD.length ? Math.max.apply(null, maxD.map(function(d) { return d.y; })) : null;
  var lastVol = volD.length ? Math.round(volD[volD.length - 1].y) : null;

  // Parse fail log entries for this lift
  var failEntries = [];
  Object.keys(failLog).forEach(function(key) {
    var parts = key.split("-");
    // Key format: cycle-dayIdx-liftId-setIdx (new) or dayIdx-liftId-setIdx (legacy)
    var cycle, dayIdx, liftId, setIdx;
    if (parts.length === 4) {
      cycle = parseInt(parts[0]); dayIdx = parseInt(parts[1]); liftId = parts[2]; setIdx = parseInt(parts[3]);
    } else {
      cycle = 1; dayIdx = parseInt(parts[0]); liftId = parts[1]; setIdx = parseInt(parts[2]);
    }
    if (liftId === id) {
      var result = failLog[key];
      if (!result || typeof result !== "object") return;
      var weight = Number(result.weight);
      var reps = Number(result.reps);
      if (!Number.isFinite(weight) || !Number.isFinite(reps)) return;
      var day = SCHED[dayIdx] || {};
      failEntries.push({
        key:key,
        cycle:cycle,
        dayIdx:dayIdx,
        setIdx:setIdx,
        dayLabel:"C" + cycle + " " + (day.label || ("D" + dayIdx)),
        weight:weight,
        reps:reps
      });
    }
  });
  // Sort by dayIdx then setIdx
  failEntries.sort(function(a, b) { return a.dayIdx - b.dayIdx || a.setIdx - b.setIdx; });

  return (
    <div className="lac">
      <div className="lach" onClick={function() { setOpen(function(o) { return !o; }); }}>
        <div style={{ width:3, alignSelf:"stretch", background:lift.color, flexShrink:0, borderRadius:2 }} />
        <div style={{ marginLeft:7 }}>
          <div className="la-ab" style={{ color:lift.color }}>{lift.abbr}</div>
          <div className="la-nm">{lift.name}</div>
        </div>
        <div className="la-st">
          <div style={{ textAlign:"right" }}>
            <div className="la-sv" style={{ color:lift.color }}>{lastOrm || "—"}<span style={{ fontSize:9, color:"var(--mid)", fontWeight:700 }}>kg</span></div>
            <div className="la-sl">1rm</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div className="la-sv" style={{ color:"var(--mid)" }}>{maxMax || "—"}<span style={{ fontSize:9, color:"var(--mid)", fontWeight:700 }}>kg</span></div>
            <div className="la-sl">max</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div className="la-sv" style={{ color:"var(--mid)" }}>{lastVol || "—"}</div>
            <div className="la-sl">vol</div>
          </div>
        </div>
        <div className={"la-ch" + (open ? " op" : "")}>▶</div>
      </div>
      {open && (
        <div className="lacb">
          <div className="ctabs">
            {["volume","max","orm"].map(function(t) {
              return (
                <button key={t} className={"ctab" + (ct === t ? " on" : "")}
                  style={ct === t ? { background:lift.color, borderColor:lift.color } : {}}
                  onClick={function() { setCt(t); }}>
                  {t === "volume" ? "VOL" : t === "max" ? "MAX WT" : "1RM"}
                </button>
              );
            })}
          </div>
          <div className="clbl">{ct === "volume" ? "Total volume (kg·reps)" : ct === "max" ? "Max weight (kg)" : "Estimated 1RM (kg)"}</div>
          <MiniChart data={chartD} color={lift.color} />
          <div className="cdiv">
            <div className="chd">Working weight (8-rep)</div>
            <div className="crow">
              <div className="clabel" style={{color:lift.color,fontWeight:900,fontSize:13}}>{lift.abbr}</div>
              <div className="cst">
                <button className="cb" onClick={function() { if (weight && weight > BAR) onWeight(id, snapW(weight - SNAP)); }}>−</button>
                <span className="cv" style={{color:lift.color,fontWeight:900}}>{weight || "—"}<span style={{fontSize:9,opacity:0.6,marginLeft:2}}>kg</span></span>
                <button className="cb" onClick={function() { onWeight(id, snapW((weight || lift.base8 || BAR) + SNAP)); }}>+</button>
              </div>
            </div>
            <div style={{fontSize:9,color:"var(--mid)",letterSpacing:1,marginTop:-4,marginBottom:8}}>
              4-rep auto: {weight ? w4from8(weight) : "—"}kg
            </div>
          </div>

          <div className="cdiv">
            <div className="chd">Progression / cycle</div>
            <div className="crow">
              <div className="clabel">Base jump</div>
              <div className="cst">
                <button className="cb" onClick={function() { stepProg("inc", -5); }}>−</button>
                <span className="cv">{inc}kg</span>
                <button className="cb" onClick={function() { stepProg("inc", 5); }}>+</button>
              </div>
            </div>
            <div className="crow">
              <div className="clabel">AMRAP ≥8</div>
              <div className="cst">
                <button className="cb" onClick={function() { stepProg("incD", -5); }}>−</button>
                <span className="cv">{incD}kg</span>
                <button className="cb" onClick={function() { stepProg("incD", 5); }}>+</button>
              </div>
            </div>
            <button className="crst" onClick={function() { onProg(id, { inc:lift.defInc, incD:lift.defIncD }); }}>reset defaults</button>
          </div>
          {failEntries.length > 0 && (
            <div className="fail-log">
              <div className="fail-log-hd">Failed sets this cycle</div>
              {failEntries.map(function(entry) {
                return (
                  <div key={entry.key} className="fail-entry">
                    <div className="fail-entry-set">S{entry.setIdx + 1}</div>
                    <div>
                      <span className="fail-entry-val">{entry.weight}</span>
                      <span className="fail-entry-unit">kg</span>
                      <span className="fail-entry-sep">×</span>
                      <span className="fail-entry-val">{entry.reps}</span>
                      <span className="fail-entry-unit">reps</span>
                    </div>
                    <div className="fail-entry-day">{entry.dayLabel}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── HOLD STATS ────────────────────────────────────────────────────────────────
function HoldStats(props) {
  var id = props.id, history = props.history || [], holdCfg = props.holdCfg || {}, onCfg = props.onCfg;
  var hold = HOLDS[id];
  var pair1 = useState(false); var open = pair1[0]; var setOpen = pair1[1];
  var pair2 = useState("hold"); var ct = pair2[0]; var setCt = pair2[1];
  var hs = history
    .filter(function(e) { return e && e.holds && e.holds[id]; })
    .map(function(e) { return e.holds[id]; });
  var holdD = hs.map(function(x, i) { return { x:i, y:x.secs }; });
  var volD  = hs.map(function(x, i) { return { x:i, y:x.totalTime }; });
  var chartD = ct === "hold" ? holdD : volD;
  var cfg = holdCfg[id] || {};
  var best = holdD.length ? Math.max.apply(null, holdD.map(function(d) { return d.y; })) : 0;

  return (
    <div className="lac">
      <div className="lach" onClick={function() { setOpen(function(o) { return !o; }); }}>
        <div style={{ width:3, alignSelf:"stretch", background:hold.color, flexShrink:0, borderRadius:2 }} />
        <div style={{ marginLeft:7 }}>
          <div className="la-ab" style={{ color:hold.color }}>{hold.emoji} {hold.abbr}</div>
          <div className="la-nm">{hold.name}</div>
        </div>
        <div className="la-st">
          <div style={{ textAlign:"right" }}>
            <div className="la-sv" style={{ color:hold.color }}>{hold.isReps ? cfg.reps : cfg.secs}<span style={{ fontSize:9, color:"var(--mid)", fontWeight:700 }}>{hold.isReps ? "r" : "s"}</span></div>
            <div className="la-sl">target</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div className="la-sv" style={{ color:"var(--mid)" }}>{best || "—"}<span style={{ fontSize:9, color:"var(--mid)", fontWeight:700 }}>s</span></div>
            <div className="la-sl">best</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div className="la-sv" style={{ color:"var(--mid)" }}>{cfg.sets}</div>
            <div className="la-sl">sets</div>
          </div>
        </div>
        <div className={"la-ch" + (open ? " op" : "")}>▶</div>
      </div>
      {open && (
        <div className="lacb">
          <div className="gbadge">{hold.emoji} NOW: {hold.currentLevel}</div>
          <div style={{ fontSize:11, color:"var(--mid)", marginBottom:10, lineHeight:1.6, fontWeight:700 }}>📈 {hold.progression}</div>
          <div className="ctabs">
            {["hold","vol"].map(function(t) {
              return (
                <button key={t} className={"ctab" + (ct === t ? " on" : "")}
                  style={ct === t ? { background:hold.color, borderColor:hold.color } : {}}
                  onClick={function() { setCt(t); }}>
                  {t === "hold" ? "HOLD TIME" : "TOTAL VOL"}
                </button>
              );
            })}
          </div>
          <div className="clbl">{ct === "hold" ? "Target hold (sec)" : "Total hold / session (sec)"}</div>
          <MiniChart data={chartD} color={hold.color} />
          <div className="cdiv">
            <div className="chd">Configuration</div>
            {!hold.isReps && (
              <div className="crow">
                <div className="clabel">Target sec</div>
                <div className="cst">
                  <button className="cb" onClick={function() { onCfg(id, Object.assign({}, cfg, { secs: Math.max(1, cfg.secs - 1) })); }}>−</button>
                  <span className="cv">{cfg.secs}s</span>
                  <button className="cb" onClick={function() { onCfg(id, Object.assign({}, cfg, { secs: cfg.secs + 1 })); }}>+</button>
                </div>
              </div>
            )}
            {hold.isReps && (
              <div className="crow">
                <div className="clabel">Target reps</div>
                <div className="cst">
                  <button className="cb" onClick={function() { onCfg(id, Object.assign({}, cfg, { reps: Math.max(1, cfg.reps - 1) })); }}>−</button>
                  <span className="cv">{cfg.reps}r</span>
                  <button className="cb" onClick={function() { onCfg(id, Object.assign({}, cfg, { reps: cfg.reps + 1 })); }}>+</button>
                </div>
              </div>
            )}
            <div className="crow">
              <div className="clabel">Sets</div>
              <div className="cst">
                <button className="cb" onClick={function() { onCfg(id, Object.assign({}, cfg, { sets: Math.max(1, cfg.sets - 1) })); }}>−</button>
                <span className="cv">{cfg.sets}</span>
                <button className="cb" onClick={function() { onCfg(id, Object.assign({}, cfg, { sets: cfg.sets + 1 })); }}>+</button>
              </div>
            </div>
            <button className="crst" onClick={function() { onCfg(id, { secs:hold.defSecs, sets:hold.defSets, inc:hold.defInc, reps:hold.defReps || 1 }); }}>reset defaults</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── BENCHMARKS ────────────────────────────────────────────────────────────────
function Benchmarks(props) {
  var currentOrms = props.currentOrms;
  return (
    <div>
      {Object.keys(STANDARDS).map(function(id) {
        var std = STANDARDS[id];
        var orm = currentOrms[id] || 0;
        var maxKg = std.tiers[std.tiers.length - 1].kg;
        var reachedIdx = -1;
        std.tiers.forEach(function(t, i) { if (orm >= t.kg) reachedIdx = i; });
        return (
          <div key={id} className="bm-card">
            <div className="bm-head">
              <div className="bm-dot" style={{ background:std.color }} />
              <div className="bm-name" style={{ color:std.color }}>{std.label}</div>
              <div className="bm-orm">
                <div className="bm-orm-val" style={{ color: orm > 0 ? std.color : "var(--mid)" }}>{orm > 0 ? orm + "kg" : "—"}</div>
                <div className="bm-orm-lbl">est 1RM</div>
              </div>
            </div>
            <div className="bm-tiers">
              {std.tiers.map(function(tier, i) {
                var achieved = orm >= tier.kg;
                var isNext = i === reachedIdx + 1;
                var pct = Math.min(100, orm > 0 ? (orm / tier.kg) * 100 : 0);
                return (
                  <div key={i} className="bm-tier">
                    <div className="bm-tier-head">
                      <span className="bm-tier-label" style={{ color: achieved ? std.color : isNext ? "var(--ink)" : "var(--mid)" }}>
                        {tier.label}
                        {achieved && <span className="bm-achieved">✓</span>}
                        {isNext && !achieved && <span style={{ fontSize:9, color:std.color, marginLeft:6, fontWeight:700, background: std.color + '22', borderRadius:4, padding:'1px 5px' }}>← NEXT</span>}
                        {tier.goal && !achieved && <span style={{ fontSize:8, color:"var(--mid)", marginLeft:4, fontWeight:700 }}> · goal</span>}
                      </span>
                      <span className="bm-tier-kg" style={{ color: achieved ? std.color : isNext ? "var(--ink)" : "var(--mid)" }}>{tier.kg}kg</span>
                    </div>
                    <div className="bm-track">
                      {(function() {
                        var prevKg = i === 0 ? 0 : std.tiers[i-1].kg;
                        var rangePct = achieved ? 100 : Math.min(100, Math.max(0, orm > prevKg ? ((orm - prevKg) / (tier.kg - prevKg)) * 100 : 0));
                        return <div className="bm-fill" style={{ width: rangePct + "%", background: achieved ? std.color : isNext ? std.color + "cc" : "var(--light)" }} />;
                      })()}
                    </div>
                  </div>
                );
              })}
              <div className="bm-src">Kilgore 2023 · OpenPowerlifting 2025 · {BW}kg male</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── HISTORY BUILDERS ──────────────────────────────────────────────────────────
// Build history from real session log entries
// Each entry: { cycle, dayIdx, lifts: { liftId: { weight, volume, maxWeight, orm } } }
function buildLiftHistory(sessionLog) {
  return (sessionLog || []).map(function(entry, idx) {
    return { idx: idx, lifts: entry.lifts || {} };
  });
}

function buildHoldHistory(sessionLog) {
  return (sessionLog || []).map(function(entry, idx) {
    return { idx: idx, holds: entry.holds || {} };
  });
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  var readyPair = useState(false); var ready = readyPair[0]; var setReady = readyPair[1];
  var savingPair = useState(false); var saving = savingPair[0]; var setSaving = savingPair[1];
  var stPair = useState(makeDefault); var st = stPair[0]; var _setSt = stPair[1];
  var saveTimer = useRef(null);
  var swipeX = useRef(null);

  var showExportPair = useState(false); var showExport = showExportPair[0]; var setShowExport = showExportPair[1];
  var confirmCyclePair = useState(false); var confirmCycle = confirmCyclePair[0]; var setConfirmCycle = confirmCyclePair[1];
  var celebratePair = useState(false); var celebrating = celebratePair[0]; var setCelebrating = celebratePair[1];
  var importTextPair = useState(""); var importText = importTextPair[0]; var setImportText = importTextPair[1];
  var importMsgPair = useState(""); var importMsg = importMsgPair[0]; var setImportMsg = importMsgPair[1];

  useEffect(function() {
    loadState().then(function(saved) {
      if (saved) { _setSt(function(prev) { return normalizeState(Object.assign({}, prev, saved)); }); }
      setReady(true);
    });
  }, []);

  function setSt(upd) {
    _setSt(function(prev) {
      var next = normalizeState(typeof upd === "function" ? upd(prev) : Object.assign({}, prev, upd));
      clearTimeout(saveTimer.current);
      setSaving(true);
      saveTimer.current = setTimeout(function() {
        saveState(next).then(function() { setSaving(false); });
      }, 800);
      return next;
    });
  }

  var atab = st.mode === 0 ? st.bbTab : st.caliTab;
  function setAtab(t) {
    window.scrollTo(0, 0);
    st.mode === 0 ? setSt({ bbTab:t }) : setSt({ caliTab:t });
  }

  var today = SCHED[st.dayIdx] || SCHED[0];
  var todaySets = (st.liftSets || {})[st.dayIdx] || makeDefaultLiftSets()[st.dayIdx];
  var firstActiveLift = today.lifts.find(function(sl) { return !LIFTS[sl.id].rehab; });
  var acc = firstActiveLift ? LIFTS[firstActiveLift.id].color : "#FF5C00";

  var wts = {};
  Object.keys(LIFTS).forEach(function(id) {
    var lift = LIFTS[id];
    var w8 = (st.weights && st.weights[id]) ? st.weights[id] : (lift.base8 ? snapW(lift.base8) : null);
    wts[id] = w8 ? { w8:w8, w4:w4from8(w8) } : { w8:null, w4:null };
  });

  var liftHistory = buildLiftHistory(st.sessionLog);
  var holdHistory = buildHoldHistory(st.sessionLog);


  // Build session snapshot from a given state — used to update log live
  function buildSessionSnapshot(state) {
    var dayIdx = state.dayIdx;
    var daySchedule = SCHED[dayIdx];
    var curWts = {};
    Object.keys(LIFTS).forEach(function(id) {
      var lift = LIFTS[id];
      var w8 = (state.weights && state.weights[id]) ? state.weights[id] : (lift.base8 ? snapW(lift.base8) : null);
      curWts[id] = w8 ? { w8:w8, w4:w4from8(w8) } : { w8:null, w4:null };
    });
    var lifts = {};
    var holds = {};
    daySchedule.lifts.forEach(function(sl) {
      if (LIFTS[sl.id].rehab) return;
      var sets = (state.liftSets[dayIdx] || {})[sl.id] || [];
      var doneSets = sets.filter(function(s) { return s === "done"; }).length;
      var failSets = sets.filter(function(s) { return s === "fail"; }).length;
      if (doneSets === 0 && failSets === 0) return;
      var wEntry = curWts[sl.id];
      var wt = sl.type === "4rep" ? wEntry.w4 : wEntry.w8;
      if (!wt) return;
      var volume = wt * doneSets * sl.reps;
      sets.forEach(function(setState, si) {
        if (setState !== "fail") return;
        var key = dayIdx + "-" + sl.id + "-" + si;
        var failResult = (state.failLog || {})[key];
        if (failResult) {
          volume += failResult.weight * failResult.reps;
        } else {
          volume += wt * Math.floor(sl.reps / 2);
        }
      });
      lifts[sl.id] = { weight:wt, volume:volume, maxWeight:wt, orm:epley(wt, sl.reps) };
    });
    Object.keys(HOLDS).forEach(function(id) {
      if (HOLDS[id].rehab) return;
      var sets = state.holdSets[id] || [];
      var doneSets = sets.filter(function(s) { return s === "done"; }).length;
      if (doneSets === 0) return;
      var cfg = state.holdCfg[id] || {};
      holds[id] = { secs:cfg.secs||0, sets:doneSets, totalTime:(cfg.secs||0)*doneSets };
    });
    if (Object.keys(lifts).length === 0 && Object.keys(holds).length === 0) return null;
    return { cycle:state.cycle||1, dayIdx:dayIdx, lifts:lifts, holds:holds };
  }

  function logCurrentSession() {
    setSt(function(prev) { return upsertSession(prev); });
  }


  // Pure function — takes next state, returns it with session log upserted
  function upsertSession(state) {
    var dayIdx = state.dayIdx;
    var daySchedule = SCHED[dayIdx];
    var curWts = {};
    Object.keys(LIFTS).forEach(function(id) {
      var lift = LIFTS[id];
      var w8 = (state.weights && state.weights[id]) ? state.weights[id] : (lift.base8 ? snapW(lift.base8) : null);
      curWts[id] = w8 ? { w8:w8, w4:w4from8(w8) } : { w8:null, w4:null };
    });
    var lifts = {};
    var holds = {};
    daySchedule.lifts.forEach(function(sl) {
      if (LIFTS[sl.id].rehab) return;
      var sets = (state.liftSets[dayIdx] || {})[sl.id] || [];
      var doneSets = sets.filter(function(s) { return s === "done"; }).length;
      var failSets = sets.filter(function(s) { return s === "fail"; }).length;
      if (doneSets === 0 && failSets === 0) return;
      var wEntry = curWts[sl.id];
      var wt = sl.type === "4rep" ? wEntry.w4 : wEntry.w8;
      if (!wt) return;
      var volume = wt * doneSets * sl.reps;
      sets.forEach(function(setState, si) {
        if (setState !== "fail") return;
        var key = dayIdx + "-" + sl.id + "-" + si;
        var failResult = (state.failLog || {})[key];
        if (failResult) {
          volume += failResult.weight * failResult.reps;
        } else {
          volume += wt * Math.floor(sl.reps / 2);
        }
      });
      lifts[sl.id] = { weight:wt, volume:volume, maxWeight:wt, orm:epley(wt, sl.reps) };
    });
    Object.keys(HOLDS).forEach(function(id) {
      if (HOLDS[id].rehab) return;
      var sets = state.holdSets[id] || [];
      var doneSets = sets.filter(function(s) { return s === "done"; }).length;
      if (doneSets === 0) return;
      var cfg = state.holdCfg[id] || {};
      holds[id] = { secs:cfg.secs||0, sets:doneSets, totalTime:(cfg.secs||0)*doneSets };
    });
    if (Object.keys(lifts).length === 0 && Object.keys(holds).length === 0) return state;
    var snapshot = { cycle:state.cycle||1, dayIdx:dayIdx, lifts:lifts, holds:holds };
    var log = (state.sessionLog || []).slice();
    // Deduplicate: replace existing entry for same cycle+day, else append
    var existingIdx = -1;
    log.forEach(function(entry, i) {
      if (entry.cycle === snapshot.cycle && entry.dayIdx === snapshot.dayIdx) existingIdx = i;
    });
    if (existingIdx >= 0) {
      log[existingIdx] = snapshot;
    } else {
      log.push(snapshot);
    }
    // Keep log bounded — max 200 sessions (~3+ years), drop oldest
    if (log.length > 200) log = log.slice(log.length - 200);
    return Object.assign({}, state, { sessionLog: log });
  }


  function finishSession() {
    logCurrentSession();
    var isLastDay = st.dayIdx === SCHED.length - 1;
    setCelebrating(true);
    // Fire a big burst from centre screen
    emitBurst(Array.from({ length: 24 }, function() {
      return {
        id: burstId++, type: "done",
        emoji: pickRandom(["🎉","💪","🔥","⚡","🏆","🎊","💥","🦾","🚀","⭐","🏅","✨"]),
        x: window.innerWidth / 2, y: window.innerHeight / 2,
        dx: (Math.random() - 0.5) * 400,
        dy: -(Math.random() * 350 + 100),
        rot: (Math.random() - 0.5) * 720,
        sc: 0.8 + Math.random() * 1.2,
      };
    }));
    setTimeout(function() {
      setCelebrating(false);
      if (isLastDay) {
        advanceCycle();
      } else {
        setSt(function(prev) {
          return Object.assign({}, prev, { dayIdx: prev.dayIdx + 1 });
        });
      }
    }, 1800);
  }

  function advanceCycle() {
    setSt(function(prev) {
      var next = JSON.parse(JSON.stringify(prev));
      Object.keys(LIFTS).forEach(function(id) {
        var lift = LIFTS[id];
        if (lift.rehab || !next.weights || !next.weights[id]) return;
        if (!next.deloads[id]) {
          var prog = next.progs[id] || { inc:lift.defInc, incD:lift.defIncD };
          next.weights[id] = snapW(next.weights[id] + prog.inc);
        }
      });
      next.deloads = {};
      next.liftSets = makeDefaultLiftSets();
      next.dayIdx = 0;
      next.cycle = (next.cycle || 1) + 1;
      // Clear failLog entries from completed cycle (they're now in sessionLog history)
      var newCycle = next.cycle;
      var oldCycle = newCycle - 1;
      var cleanedLog = {};
      Object.keys(next.failLog || {}).forEach(function(key) {
        var parts = key.split("-");
        var keyCycle = parts.length === 4 ? parseInt(parts[0]) : 1;
        if (keyCycle >= newCycle) cleanedLog[key] = next.failLog[key];
      });
      next.failLog = cleanedLog;
      return next;
    });
  }

  function markLiftDone(lid, si) {
    setSt(function(prev) {
      var next = JSON.parse(JSON.stringify(prev));
      var cur = next.liftSets[prev.dayIdx][lid][si];
      next.liftSets[prev.dayIdx][lid][si] = cur === "done" ? "idle" : "done";
      return upsertSession(next);
    });
  }

  function markLiftFail(lid, si, result) {
    setSt(function(prev) {
      var next = JSON.parse(JSON.stringify(prev));
      var cur = next.liftSets[prev.dayIdx][lid][si];
      next.liftSets[prev.dayIdx][lid][si] = cur === "fail" ? "idle" : "fail";
      var failCount = next.liftSets[prev.dayIdx][lid].filter(function(s) { return s === "fail"; }).length;
      next.deloads = Object.assign({}, next.deloads);
      next.deloads[lid] = failCount >= 2;
      if (result && cur !== "fail") {
        if (!next.failLog) next.failLog = {};
        var key = (prev.cycle || 1) + "-" + prev.dayIdx + "-" + lid + "-" + si;
        next.failLog[key] = result;
      }
      return upsertSession(next);
    });
  }

  function markHoldDone(hid, si) {
    setSt(function(prev) {
      var next = JSON.parse(JSON.stringify(prev));
      var cur = next.holdSets[hid][si];
      next.holdSets[hid][si] = cur === "done" ? "idle" : "done";
      return upsertSession(next);
    });
  }

  function markHoldFail(hid, si) {
    setSt(function(prev) {
      var next = JSON.parse(JSON.stringify(prev));
      var cur = next.holdSets[hid][si];
      next.holdSets[hid][si] = cur === "fail" ? "idle" : "fail";
      return upsertSession(next);
    });
  }

  function updateHoldCfg(id, val) {
    setSt(function(prev) {
      var next = JSON.parse(JSON.stringify(prev));
      next.holdCfg[id] = val;
      var count = val.sets != null ? val.sets : prev.holdCfg[id].sets;
      var oldSets = next.holdSets[id] || [];
      next.holdSets[id] = Array(count).fill("idle").map(function(_, i) { return oldSets[i] || "idle"; });
      return next;
    });
  }

  function updateProg(id, val) {
    setSt(function(prev) {
      var next = Object.assign({}, prev, { progs: Object.assign({}, prev.progs) });
      next.progs[id] = val;
      return next;
    });
  }

  function updateWeight(lid, kg) {
    setSt(function(prev) {
      var next = JSON.parse(JSON.stringify(prev));
      if (!next.weights) next.weights = {};
      next.weights[lid] = kg;
      return next;
    });
  }

  function doExport() {
    setShowExport(true);
    setImportText(JSON.stringify(st, null, 2));
  }

  function doImport() {
    try {
      var parsed = JSON.parse(importText);
      setSt(function(prev) { return Object.assign({}, prev, parsed); });
      setImportMsg("✓ Imported successfully");
      setTimeout(function() { setImportMsg(""); }, 3000);
    } catch(e) {
      setImportMsg("✕ Invalid JSON");
      setTimeout(function() { setImportMsg(""); }, 3000);
    }
  }

  function onTouchStart(e) { swipeX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (swipeX.current === null) return;
    var dx = e.changedTouches[0].clientX - swipeX.current;
    if (Math.abs(dx) > 50) { setAtab(dx < 0 ? 1 : 0); }
    swipeX.current = null;
  }

  var motiv = getWeeklyMotivation();

  var currentOrms = {
    deadlift: wts.deadlift.w8 ? epley(wts.deadlift.w8, 8) : 0,
    squat:    wts.squat.w8    ? epley(wts.squat.w8,    8) : 0,
    bench:    wts.bench.w8    ? epley(wts.bench.w8,    8) : 0,
    ohp:      wts.ohp.w8      ? epley(wts.ohp.w8,      8) : 0,
  };

  if (!ready) {
    return (
      <>
        <style>{css}</style>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", color:"#999", fontSize:10, letterSpacing:"2px", fontWeight:700, background:"#FAFAF5" }}>LOADING…</div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <BurstOverlay />
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

        <div className="bar">
          <div className="logo">D<span style={{color:"#FF5C00"}}>Δ</span>DLIFTS</div>
          <div className="bar-gap" />
          <div className={"sdot" + (saving ? " on" : "")} />
          <div className="mtabs">
            <button className="mtab" style={st.mode === 0 ? { background:acc, color:"#fff" } : {}} onClick={function() { setSt({ mode:0 }); }}>🏋️</button>
            <button className="mtab" style={st.mode === 1 ? { background:"#8B5CF6", color:"#fff" } : {}} onClick={function() { setSt({ mode:1 }); }}>🤸</button>
          </div>
          <div className="stabs">
            <button className={"stab" + (atab === 0 ? " on" : "")} onClick={function() { setAtab(0); }}>TRAIN</button>
            <button className={"stab" + (atab === 1 ? " on" : "")} onClick={function() { setAtab(1); }}>STATS</button>
          </div>
        </div>

        {/* BARBELL TRAIN */}
        {st.mode === 0 && atab === 0 && (
          <div className="pg">
            <div className="wtag">CYCLE <strong>{st.cycle || 1}</strong> · WEEK <strong>{today.week}</strong></div>
            <div className="motd">
              <div className="motd-q">"{motiv.q}"</div>
              {motiv.a && <div className="motd-a">— {motiv.a}</div>}
            </div>
            <div className="drow">
              {SCHED.map(function(day, i) {
                var daySets = st.liftSets[i] || {};
                var flat = [];
                Object.keys(daySets).forEach(function(lid) {
                  daySets[lid].forEach(function(s) { flat.push(s); });
                });
                var hasDone = flat.some(function(s) { return s === "done"; });
                var isCurrent = i === st.dayIdx;
                var btnStyle = isCurrent
                  ? { background:acc, borderColor:acc, color:"#fff" }
                  : hasDone
                  ? { background:"var(--green-bg)", borderColor:"var(--green)", color:"var(--green)" }
                  : {};
                return (
                  <button key={i} className="dbt" style={btnStyle}
                    onClick={function() { logCurrentSession(); setSt({ dayIdx:i }); }}>
                    {hasDone && !isCurrent ? "✓ " : ""}{day.label}
                  </button>
                );
              })}
            </div>
            <div className="shead" style={{ color:acc }}>{today.label} <span style={{ color:"var(--mid)", fontSize:14, fontFamily:"'Space Mono',monospace", fontWeight:700 }}>/ {today.lifts.length} LIFTS</span></div>
            <div className="stack">
              {today.lifts.map(function(sl) {
                if (LIFTS[sl.id].rehab) {
                  return (
                    <div key={sl.id} className="rehab-card">
                      <div className="bc-dot" style={{ background:LIFTS[sl.id].color }} />
                      <div>
                        <div className="rehab-name">{LIFTS[sl.id].name}</div>
                        <div style={{ fontSize:14, fontFamily:"'Nunito',sans-serif", fontWeight:900, color:"var(--sub)" }}>REHAB</div>
                        <div className="rehab-sub">SUBSTITUTE OK</div>
                      </div>
                    </div>
                  );
                }
                var wt = sl.type === "4rep" ? wts[sl.id].w4 : wts[sl.id].w8;
                return (
                  <BarbellCard key={sl.id} id={sl.id} sl={sl} wt={wt}
                    sets={todaySets[sl.id]}
                    onDone={function(si) { markLiftDone(sl.id, si); }}
                    onFail={function(si, result) { markLiftFail(sl.id, si, result); }}
                    deload={!!st.deloads[sl.id]} />
                );
              })}
            </div>
            <div style={{marginTop:18,paddingTop:14,borderTop:"3px solid var(--ink)"}}>
              <button
                onClick={finishSession}
                disabled={celebrating}
                style={{width:"100%",padding:"16px",background:"var(--green)",border:"3px solid var(--ink)",borderRadius:100,fontFamily:"'Nunito',sans-serif",fontSize:20,fontWeight:900,color:"#fff",cursor:"pointer",boxShadow:"3px 3px 0 var(--ink)",display:"flex",alignItems:"center",justifyContent:"center",gap:10,letterSpacing:-0.5}}>
{st.dayIdx === SCHED.length - 1 ? "🏆 FINISH CYCLE · weights advance ↑" : "✓ FINISH SESSION → " + (SCHED[st.dayIdx + 1] ? SCHED[st.dayIdx + 1].label : "")}
              </button>
              <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
                {!confirmCycle
                  ? <button className="fhb" style={{borderColor:"var(--mid)",color:"var(--mid)",fontSize:9}} onClick={function(){setConfirmCycle(true);}}>end cycle early ↑</button>
                  : <div style={{display:"flex",gap:5,alignItems:"center"}}>
                      <span style={{fontSize:9,fontWeight:700,color:"var(--ink)",letterSpacing:1}}>Sure?</span>
                      <button className="fhb" style={{borderColor:"var(--green)",color:"#fff",background:"var(--green)",padding:"6px 10px"}} onClick={function(){advanceCycle();setConfirmCycle(false);}}>YES ↑</button>
                      <button className="fhb" style={{padding:"6px 10px"}} onClick={function(){setConfirmCycle(false);}}>NO</button>
                    </div>
                }
                <div style={{flex:1}}/>
                <button className="fhb" style={{borderColor:"var(--orange)",color:"var(--orange)"}} onClick={function() { setAtab(1); }}>STATS ▶</button>
              </div>
            </div>
            <div className="sig">built between sets<span>to stay in the game</span></div>
          </div>
        )}

        {/* BARBELL STATS */}
        {st.mode === 0 && atab === 1 && (
          <div className="pg">
            <div style={{ fontSize:10, color:"var(--mid)", letterSpacing:"1.5px", marginBottom:14, fontWeight:700 }}>TAP LIFT TO EXPAND · SWIPE → TRAIN</div>
<div className="asec">
              <div className="at">Barbell Performance</div>
              {Object.keys(LIFTS).filter(function(id) { return !LIFTS[id].rehab; }).map(function(id) {
                return <LiftStats key={id} id={id} history={liftHistory} progs={st.progs} onProg={updateProg} failLog={st.failLog} weight={(st.weights || {})[id]} onWeight={updateWeight} />;
              })}
            </div>
            <div className="asec">
              <div className="at">Strength Benchmarks</div>
              <Benchmarks currentOrms={currentOrms} />
            </div>
            {Object.keys(st.deloads).some(function(id) { return st.deloads[id]; }) && (
              <div className="asec">
                <div className="at">Flagged Deloads</div>
                {Object.keys(st.deloads).filter(function(id) { return st.deloads[id]; }).map(function(id) {
                  return (
                    <div key={id} className="dlr">
                      <span style={{ color:LIFTS[id].color, fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:16 }}>{LIFTS[id].name}</span>
                      <span style={{ color:"var(--red)", fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:20 }}>
                        {snapW((wts[id].w8 || 0) * 0.9)} kg
                        <span style={{ fontSize:11, color:"var(--mid)", fontWeight:700 }}> next</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="xsec">
              <div className="xhd">Data · Export / Import</div>
              <div style={{ fontSize:11, color:"var(--mid)", marginBottom:10, lineHeight:1.6, fontWeight:700 }}>Export copies all your data as JSON. Paste to restore on any device.</div>
              <div className="xrow">
                <button className="xbtn pri" onClick={doExport}>EXPORT</button>
                <button className="xbtn" onClick={function() { setShowExport(true); setImportText(""); }}>IMPORT</button>
              </div>
              {showExport && (
                <div style={{ marginTop:8 }}>
                  <textarea className="xtxt" value={importText} onChange={function(e) { setImportText(e.target.value); }} placeholder="Paste exported JSON here..." spellCheck={false} />
                  <div style={{ display:"flex", gap:6, marginTop:6 }}>
                    <button className="xbtn pri" onClick={doImport}>APPLY</button>
                    <button className="xbtn" onClick={function() { setShowExport(false); setImportMsg(""); }}>CLOSE</button>
                  </div>
                  {importMsg && <div style={{ marginTop:6, fontSize:11, color:importMsg.startsWith("✓") ? "var(--green)" : "var(--red)", letterSpacing:"1px", fontWeight:700 }}>{importMsg}</div>}
                </div>
              )}
            </div>
            <div className="sig">built between sets<span>to stay in the game</span></div>
          </div>
        )}

        {/* CALI TRAIN */}
        {st.mode === 1 && atab === 0 && (
          <div className="pg">
            <div className="shead" style={{ color:"#8B5CF6" }}>HOLDS & SKILLS <span style={{ color:"var(--mid)", fontSize:14, fontFamily:"'Space Mono',monospace", fontWeight:700 }}>/ {Object.keys(HOLDS).length}</span></div>
            <div className="motd" style={{ background:"#EDE9FE", borderColor:"#8B5CF6" }}>
              <div className="motd-q">"{motiv.q}"</div>
              {motiv.a && <div className="motd-a" style={{ color:"#7C3AED" }}>— {motiv.a}</div>}
            </div>
            <div style={{ fontSize:12, color:"var(--mid)", letterSpacing:"1px", marginBottom:12, lineHeight:1.6, fontWeight:700 }}>✓ completed · ✕ dropped early</div>
            <div className="stack">
              {Object.keys(HOLDS).map(function(id) {
                var holdSets = st.holdSets[id] || Array(st.holdCfg[id] ? st.holdCfg[id].sets : 0).fill("idle");
                return (
                  <HoldCard key={id} id={id} cfg={st.holdCfg[id]}
                    sets={holdSets}
                    onDone={function(si) { markHoldDone(id, si); }}
                    onFail={function(si) { markHoldFail(id, si); }} />
                );
              })}
            </div>
            <div className="fh">
              <span>SWIPE ← STATS</span>
              <button className="fhb" style={{borderColor:"var(--orange)",color:"var(--orange)"}} onClick={function() { setAtab(1); }}>STATS ▶</button>
            </div>
            <div className="sig">built between sets<span>to stay in the game</span></div>
          </div>
        )}

        {/* CELEBRATION OVERLAY */}
        {celebrating && (
          <div className="celebrate-banner">
            <div className="celebrate-card">
              <div className="celebrate-title" style={{color:"var(--orange)"}}>
                {st.dayIdx === SCHED.length - 1 ? "CYCLE DONE!" : "SESSION DONE!"}
              </div>
              <div className="celebrate-sub">
                {st.dayIdx === SCHED.length - 1
                  ? "weights advancing ↑"
                  : "next up: " + (SCHED[st.dayIdx + 1] ? SCHED[st.dayIdx + 1].label : "")}
              </div>
            </div>
          </div>
        )}

        {/* CALI STATS */}
        {st.mode === 1 && atab === 1 && (
          <div className="pg">
            <div style={{ fontSize:10, color:"var(--mid)", letterSpacing:"1.5px", marginBottom:14, fontWeight:700 }}>TAP TO EXPAND · SWIPE → TRAIN</div>
            <div className="asec">
              <div className="at">Skills & Holds</div>
              {Object.keys(HOLDS).filter(function(id) { return !HOLDS[id].rehab; }).map(function(id) {
                return <HoldStats key={id} id={id} history={holdHistory} holdCfg={st.holdCfg} onCfg={updateHoldCfg} />;
              })}
            </div>
            <div className="sig">built between sets<span>to stay in the game</span></div>
          </div>
        )}

      </div>
    </>
  );
}
