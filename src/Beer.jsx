// ── BEER TRACKER UI ───────────────────────────────────────────────────────────
// Mode 3 (🍺). Two tabs: LOG (quick log, urge surfing, today) and INSIGHTS
// (precalculated metrics from src/beer.mjs, pace, dry-stretch timeline, habit
// guide, settings, export). All state lives in the main app blob:
// beerLog / beerCfg / beerInsights.
import { useState, useEffect, useRef } from "react";
import {
  BEER_COLOR, SIZES, TRIGGERS, SWAPS, STD_DRINK_OPTIONS, MILESTONES, CHECK_SIGNS, PACE,
  beerLogToCsv, beerExportJson, localHour, dayKey, composeBeerNudge, composeBeerCheckin,
} from "./beer.mjs";
import { pushStatus, enablePush, disablePush, showSample } from "./push.js";

var AMBER = "#D97706";
var AMBER_BG = "#FEF3C7";
var TEAL_BG = "#CCFBF1";

export var beerCss = `
.bz-hero{background:var(--card);border:3px solid var(--ink);border-radius:16px;padding:16px 16px 14px;box-shadow:5px 5px 0 var(--ink);margin-bottom:12px;position:relative;overflow:hidden}
.bz-hero.drank{border-color:${AMBER};box-shadow:5px 5px 0 ${AMBER}}
.bz-hero-n{font-family:'Nunito',sans-serif;font-size:64px;font-weight:900;line-height:1;letter-spacing:-3px;color:${BEER_COLOR}}
.bz-hero-n.drank{color:${AMBER}}
.bz-hero-l{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--mid);margin-top:4px}
.bz-hero-sub{font-size:11px;font-weight:700;color:var(--mid);margin-top:8px;line-height:1.5}
.bz-track{height:12px;background:var(--light);border:2px solid var(--ink);border-radius:100px;overflow:hidden;margin-top:10px}
.bz-fill{height:100%;background:${BEER_COLOR};transition:width .6s ease;border-radius:100px}
.bz-chip{display:inline-flex;align-items:center;gap:4px;padding:7px 11px;border:2.5px solid var(--ink);border-radius:100px;background:var(--card);color:var(--mid);font-family:'Space Mono',monospace;font-size:11px;font-weight:700;cursor:pointer;box-shadow:2px 2px 0 var(--ink);transition:transform 80ms,box-shadow 80ms;-webkit-tap-highlight-color:transparent;white-space:nowrap}
.bz-chip:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.bz-chip.on{color:#fff;background:var(--ink)}
.bz-chips{display:flex;flex-wrap:wrap;gap:6px}
.bz-card{background:var(--card);border:3px solid var(--ink);border-radius:14px;padding:13px 14px;box-shadow:4px 4px 0 var(--ink);margin-bottom:10px}
.bz-hd{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--mid);margin-bottom:8px}
.bz-big{width:100%;padding:15px;border:3px solid var(--ink);border-radius:100px;font-family:'Nunito',sans-serif;font-size:19px;font-weight:900;color:#fff;cursor:pointer;box-shadow:3px 3px 0 var(--ink);letter-spacing:-0.5px;display:flex;align-items:center;justify-content:center;gap:8px;transition:transform 80ms,box-shadow 80ms;-webkit-tap-highlight-color:transparent}
.bz-big:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.bz-big:disabled{opacity:.5;cursor:default}
.bz-win{display:flex;align-items:flex-start;gap:8px;padding:8px 11px;background:var(--green-bg);border:2px solid var(--green);border-radius:10px;font-size:11px;font-weight:700;color:#065F46;line-height:1.45;margin-bottom:5px}
.bz-flag{display:flex;align-items:flex-start;gap:8px;padding:8px 11px;background:var(--red-bg);border:2px solid var(--red);border-radius:10px;font-size:11px;font-weight:700;color:#991B1B;line-height:1.45;margin-bottom:5px}
.bz-flag.mid{background:${AMBER_BG};border-color:${AMBER};color:#92400E}
.bz-entry{display:flex;align-items:center;gap:10px;padding:9px 11px;border:2px solid var(--rule);border-radius:10px;margin-bottom:5px;background:var(--bg)}
.bz-entry.urge{border-color:${BEER_COLOR};background:${TEAL_BG}}
.bz-entry-t{font-size:11px;font-weight:700;color:var(--mid);min-width:42px}
.bz-entry-v{font-family:'Nunito',sans-serif;font-size:18px;font-weight:900;letter-spacing:-0.5px}
.bz-entry-x{margin-left:auto;width:28px;height:28px;border:2px solid var(--rule);border-radius:50%;background:var(--card);color:var(--mid);font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
.bz-dots{display:flex;gap:4px;justify-content:space-between}
.bz-dot{flex:1;aspect-ratio:1;border-radius:6px;border:2px solid var(--ink);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:var(--mid)}
.bz-tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.bz-tiles.c3{grid-template-columns:repeat(3,1fr)}
.bz-tile{background:var(--bg);border:2.5px solid var(--ink);border-radius:12px;padding:10px 10px 8px}
.bz-tile-v{font-family:'Nunito',sans-serif;font-size:26px;font-weight:900;line-height:1;letter-spacing:-1px}
.bz-tile-u{font-size:10px;font-weight:700;color:var(--mid);margin-left:2px}
.bz-tile-l{font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--mid);margin-top:4px}
.bz-bars{display:flex;align-items:flex-end;gap:3px;height:70px;padding-top:6px}
.bz-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}
.bz-bar-f{width:100%;border-radius:4px 4px 0 0;border:2px solid var(--ink);border-bottom:none;min-height:0}
.bz-bar-f.zero{border:none;height:3px;background:var(--green);border-radius:2px}
.bz-bar-l{font-size:8px;font-weight:700;color:var(--mid);margin-top:4px;white-space:nowrap;overflow:hidden;max-width:100%}
.bz-hbar{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.bz-hbar-l{font-size:10px;font-weight:700;color:var(--mid);width:84px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bz-hbar-t{flex:1;height:14px;background:var(--light);border:2px solid var(--ink);border-radius:100px;overflow:hidden}
.bz-hbar-f{height:100%;border-radius:100px}
.bz-hbar-v{font-size:10px;font-weight:700;color:var(--ink);width:44px;text-align:right;flex-shrink:0}
.bz-ms{display:flex;gap:10px;padding:9px 0;border-bottom:2px solid var(--light)}
.bz-ms:last-child{border-bottom:none}
.bz-ms-dot{width:22px;height:22px;border-radius:50%;border:2.5px solid var(--ink);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;background:var(--card)}
.bz-ms-dot.on{background:${BEER_COLOR}}
.bz-ms-t{font-family:'Nunito',sans-serif;font-size:15px;font-weight:900;line-height:1.1}
.bz-ms-n{font-size:11px;color:var(--mid);font-weight:700;line-height:1.45;margin-top:2px}
.bz-tog{display:flex;align-items:center;gap:8px;width:100%;padding:11px 13px;border:3px solid var(--ink);border-radius:14px;background:var(--card);cursor:pointer;box-shadow:3px 3px 0 var(--ink);text-align:left;font-family:'Nunito',sans-serif;font-weight:900;font-size:15px;color:var(--ink);margin-bottom:8px;-webkit-tap-highlight-color:transparent}
.bz-p{font-size:11px;color:var(--mid);font-weight:700;line-height:1.55;margin-bottom:8px}
.bz-p b{color:var(--ink)}
.bz-src{font-size:9px;color:var(--sub);font-style:italic;font-weight:700;line-height:1.5;margin-top:6px}
.bz-time{padding:6px 10px;border:2.5px solid var(--ink);border-radius:10px;font-family:'Space Mono',monospace;font-size:12px;font-weight:700;background:var(--bg);color:var(--ink)}
.bz-timer{font-family:'Nunito',sans-serif;font-size:40px;font-weight:900;letter-spacing:-1px;line-height:1;color:${BEER_COLOR};text-align:center;padding:6px 0}
`;

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtHM(iso, tzOff) {
  var d = new Date(new Date(iso).getTime() - (tzOff || 0) * 60000);
  var h = d.getUTCHours(), m = d.getUTCMinutes();
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}
function hourLabel(h) { h = ((h % 24) + 24) % 24; return (h < 10 ? "0" : "") + h + "h"; }
function fmtMl(ml) { return ml >= 1000 ? (Math.round(ml / 100) / 10) + "L" : Math.round(ml) + "ml"; }
function downloadFile(name, content, type) {
  try {
    var blob = new Blob([content], { type: type || "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    return true;
  } catch(e) { return false; }
}
function triggerLabel(t) { return TRIGGERS[t] ? TRIGGERS[t].emoji + " " + TRIGGERS[t].label : (t || "—"); }
function swapLabel(s) { return SWAPS[s] ? SWAPS[s].emoji + " " + SWAPS[s].label : (s || "—"); }

// ── small charts ──────────────────────────────────────────────────────────────
function Bars(props) {
  var data = props.data || [], color = props.color || BEER_COLOR, every = props.labelEvery || 1;
  var max = Math.max.apply(null, data.map(function(d) { return d.value; }).concat([1]));
  return (
    <div className="bz-bars">
      {data.map(function(d, i) {
        var pct = d.value / max;
        return (
          <div key={i} className="bz-bar" title={d.label + ": " + d.value}>
            {d.value > 0
              ? <div className="bz-bar-f" style={{ height: Math.max(6, pct * 56) + "px", background: d.hi ? "var(--red)" : color }} />
              : <div className="bz-bar-f zero" />}
            <div className="bz-bar-l">{i % every === 0 ? d.label : ""}</div>
          </div>
        );
      })}
    </div>
  );
}
function HBars(props) {
  var data = props.data || [], color = props.color || BEER_COLOR, fmt = props.fmt || function(v) { return v; };
  var max = Math.max.apply(null, data.map(function(d) { return d.value; }).concat([1]));
  return (
    <div>
      {data.map(function(d, i) {
        return (
          <div key={i} className="bz-hbar">
            <div className="bz-hbar-l">{d.label}</div>
            <div className="bz-hbar-t"><div className="bz-hbar-f" style={{ width: (d.value / max * 100) + "%", background: d.hi ? AMBER : color }} /></div>
            <div className="bz-hbar-v">{fmt(d.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── urge surf timer ───────────────────────────────────────────────────────────
function SurfTimer(props) {
  var pair = useState(null); var endAt = pair[0]; var setEndAt = pair[1];
  var tick = useState(0); var setTick = tick[1];
  var done = useState(false); var isDone = done[0]; var setDone = done[1];
  var ivl = useRef(null);
  useEffect(function() {
    if (!endAt) return;
    ivl.current = setInterval(function() {
      if (Date.now() >= endAt) { clearInterval(ivl.current); setEndAt(null); setDone(true); if (props.onDone) props.onDone(); }
      else setTick(function(t) { return t + 1; });
    }, 500);
    return function() { clearInterval(ivl.current); };
  }, [endAt]);
  var left = endAt ? Math.max(0, endAt - Date.now()) : 0;
  var mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  if (endAt) return <div className="bz-timer">{mm}:{ss < 10 ? "0" : ""}{ss}<div style={{ fontSize:10, letterSpacing:2, color:"var(--mid)", marginTop:4 }}>RIDING THE WAVE · DON'T DECIDE YET</div></div>;
  if (isDone) return <div className="bz-timer" style={{ fontSize:22 }}>🌊 WAVE PASSED<div style={{ fontSize:10, letterSpacing:2, color:"var(--mid)", marginTop:4 }}>STILL WANT IT? LOG EITHER WAY — HONESTLY</div><button className="bz-chip" style={{ marginTop:8 }} onClick={function() { setDone(false); }}>reset</button></div>;
  return <button className="bz-chip" onClick={function() { setDone(false); setEndAt(Date.now() + 20 * 60000); }}>⏱ SURF 20:00</button>;
}

// ── DAILY NUDGE (push notification) ───────────────────────────────────────────
export function NudgeCard(props) {
  var ins = props.ins, ctx = props.ctx || {};
  var stPair = useState({ state: "loading", reason: "" }); var status = stPair[0]; var setStatus = stPair[1];
  var busyPair = useState(false); var busy = busyPair[0]; var setBusy = busyPair[1];
  var msgPair = useState(""); var msg = msgPair[0]; var setMsg = msgPair[1];

  function refresh() { pushStatus().then(setStatus).catch(function(e) { setStatus({ state: "unsupported", reason: e.message }); }); }
  useEffect(refresh, []);
  function flash(t) { setMsg(t); setTimeout(function() { setMsg(""); }, 4000); }

  function enable() {
    setBusy(true);
    enablePush()
      .then(function() { flash("On. Now copy the device key into GitHub (steps below)."); refresh(); })
      .catch(function(e) { flash("✕ " + e.message); refresh(); })
      .finally(function() { setBusy(false); });
  }
  function disable() {
    setBusy(true);
    disablePush().then(function() { flash("Off on this device. Remove its key from PUSH_SUBSCRIPTIONS too."); refresh(); }).catch(function(e) { flash("✕ " + e.message); }).finally(function() { setBusy(false); });
  }
  function sample(kind) {
    showSample(kind).then(function() { flash("Sample shown. Check your notifications."); }).catch(function(e) { flash("✕ " + e.message); });
  }
  function copyKey() {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(status.deviceKey).then(function() { flash("Device key copied."); }).catch(function() { flash("✕ Copy failed. Select the text and copy it."); });
  }

  var now = new Date();
  var dayNum = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
  var preview = composeBeerNudge(ins, ctx, dayNum);
  var previewCk = composeBeerCheckin(ins, dayNum);
  var on = status.state === "on";
  var canEnable = status.state === "off";
  var blocked = !on && !canEnable && status.state !== "loading";

  return (
    <div className="bz-card" style={{ borderColor: BEER_COLOR, boxShadow: "4px 4px 0 " + BEER_COLOR }}>
      <div className="bz-hd" style={{ color: BEER_COLOR }}>🔔 Notifications · 16:35 & 19:30 SAST{on ? " · ON HERE" : ""}</div>
      <div className="bz-p"><b>4:35pm nudge</b> with something to do instead of a beer. <b>7:30pm check-in</b> to log whether you stayed dry or had beer. Today's would read:</div>
      <div style={{ border: "2px solid var(--ink)", borderRadius: 12, padding: "9px 11px", background: "var(--bg)", marginBottom: 6 }}>
        <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 14, lineHeight: 1.2 }}>{preview.title}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mid)", lineHeight: 1.45, marginTop: 3 }}>{preview.body}</div>
      </div>
      <div style={{ border: "2px solid var(--rule)", borderRadius: 12, padding: "7px 11px", background: "var(--bg)", marginBottom: 10 }}>
        <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 13, lineHeight: 1.2 }}>{previewCk.title}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mid)", lineHeight: 1.45, marginTop: 2 }}>{previewCk.body}</div>
      </div>
      {blocked && <div className="bz-flag mid" style={{ marginTop: 4 }}>ℹ️ <span>{status.reason}</span></div>}
      {on && (
        <div>
          <div className="bz-hd" style={{ marginTop: 4 }}>This device's key</div>
          <textarea className="xtxt" readOnly value={status.deviceKey} onFocus={function(e) { e.target.select(); }} style={{ minHeight: 64, fontSize: 9, marginTop: 0 }} />
          <div className="bz-p" style={{ marginTop: 6 }}>
            One-time setup in GitHub → <b>nicbotes/dadlifts</b> → Settings → Secrets and variables → Actions:<br />
            1. <b>VAPID_PRIVATE_KEY</b>: the private key you were given.<br />
            2. <b>PUSH_SUBSCRIPTIONS</b>: paste this device key. For a second phone, put both objects in one [ … ] list.<br />
            Then Actions → <b>Beer notifications</b> → Run workflow sends one now.
          </div>
        </div>
      )}
      <div className="xrow" style={{ marginTop: 8 }}>
        {canEnable && <button className="xbtn pri" disabled={busy} style={{ background: BEER_COLOR, borderColor: BEER_COLOR }} onClick={enable}>{busy ? "…" : "TURN ON"}</button>}
        {on && <button className="xbtn pri" style={{ background: BEER_COLOR, borderColor: BEER_COLOR }} onClick={copyKey}>COPY KEY</button>}
        {on && <button className="xbtn" onClick={function() { sample("nudge"); }}>SAMPLE 4:35</button>}
        {on && <button className="xbtn" onClick={function() { sample("checkin"); }}>SAMPLE 7:30</button>}
        {on && <button className="xbtn" disabled={busy} onClick={disable}>TURN OFF</button>}
      </div>
      {msg && <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", color: msg.charAt(0) === "✕" ? "var(--red)" : "var(--green)" }}>{msg}</div>}
      <div className="bz-src">Sent by GitHub Actions, so they can land a few minutes either side of the hour. The message itself is built on this phone from your log; nothing personal leaves it.</div>
    </div>
  );
}

// ── EVENING CHECK-IN ──────────────────────────────────────────────────────────
// Shown on the LOG tab after checkinTime (or when the check-in notification is
// tapped) until you answer: stayed dry, or log what you had.
export function CheckinCard(props) {
  var cfg = props.cfg, ins = props.ins, onDry = props.onDry, onLogMany = props.onLogMany, burst = props.burst;
  var openPair = useState(false); var open = openPair[0]; var setOpen = openPair[1];
  var cPair = useState(1); var count = cPair[0]; var setCount = cPair[1];
  var mPair = useState(cfg.sizeMl); var ml = mPair[0]; var setMl = mPair[1];
  var tPair = useState(null); var trig = tPair[0]; var setTrig = tPair[1];
  var aPair = useState("now"); var around = aPair[0]; var setAround = aPair[1];
  var already = ins.today.ml;
  var total = count * ml;
  var std = Math.round(total * cfg.abv / 100 * 0.789 / cfg.stdDrinkG * 10) / 10;

  function endTs() {
    var now = new Date();
    if (around === "now") return now;
    var d = new Date(now); d.setHours(Number(around), 0, 0, 0);
    if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 1);
    return d;
  }
  function dry(e) {
    var q = e.currentTarget.getBoundingClientRect();
    if (burst && !already) burst(q.left + q.width / 2, q.top, ["💧","🔥","💪","🏆","✨","🧠","🙌","⚡"]);
    onDry();
  }
  function logIt() {
    var end = endTs().getTime();
    var entries = [];
    for (var i = 0; i < count; i++) entries.push({ ml: ml, trigger: trig, ts: new Date(end - (count - 1 - i) * 20 * 60000).toISOString() });
    onLogMany(entries);
  }

  return (
    <div className="bz-card" style={{ borderColor: "#6366F1", boxShadow: "4px 4px 0 #6366F1" }}>
      <div className="bz-hd" style={{ color: "#4F46E5" }}>🌙 Evening check-in</div>
      <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 20, lineHeight: 1.15, marginBottom: 10 }}>
        {already ? "You've logged " + already + "ml today. Anything since?" : "Did you have beer today?"}
      </div>
      {!open && (
        <div className="xrow">
          <button className="xbtn pri" style={{ background: BEER_COLOR, borderColor: BEER_COLOR }} onClick={dry}>{already ? "✓ THAT'S ALL" : "💧 STAYED DRY"}</button>
          <button className="xbtn" style={{ background: AMBER_BG, borderColor: AMBER, color: "#92400E" }} onClick={function() { setOpen(true); }}>🍺 {already ? "HAD MORE" : "HAD BEER"}</button>
        </div>
      )}
      {open && (
        <div>
          <div className="crow">
            <div className="clabel" style={{ width:84 }}>How many</div>
            <div className="cst">
              <button className="cb" onClick={function() { setCount(Math.max(1, count - 1)); }}>−</button>
              <span className="cv">{count}</span>
              <button className="cb" onClick={function() { setCount(Math.min(12, count + 1)); }}>+</button>
            </div>
          </div>
          <div className="bz-chips" style={{ marginBottom: 8 }}>
            {SIZES.map(function(sz) { return <button key={sz.ml} className={"bz-chip" + (ml === sz.ml ? " on" : "")} onClick={function() { setMl(sz.ml); }}>{sz.label}{sz.label === "PINT" ? "" : "ml"}</button>; })}
          </div>
          <div className="bz-hd">Last one around</div>
          <div className="bz-chips" style={{ marginBottom: 8 }}>
            {["17","18","19","20","now"].map(function(h) { return <button key={h} className={"bz-chip" + (around === h ? " on" : "")} onClick={function() { setAround(h); }}>{h === "now" ? "NOW" : h + ":00"}</button>; })}
          </div>
          <div className="bz-hd">Why?</div>
          <div className="bz-chips" style={{ marginBottom: 10 }}>
            {Object.keys(TRIGGERS).map(function(t) { return <button key={t} className={"bz-chip" + (trig === t ? " on" : "")} onClick={function() { setTrig(trig === t ? null : t); }}>{TRIGGERS[t].emoji} {TRIGGERS[t].label}</button>; })}
          </div>
          <button className="bz-big" style={{ background: AMBER }} onClick={logIt}>🍺 LOG {count > 1 ? count + " × " + ml + "ml = " : ""}{total}ml · {std} std</button>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <button className="fhb" onClick={function() { setOpen(false); }}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LOG TAB ───────────────────────────────────────────────────────────────────
export function BeerLogTab(props) {
  var cfg = props.cfg, log = props.log || [], ins = props.ins, onLog = props.onLog, onUrge = props.onUrge, onDelete = props.onDelete, burst = props.burst;
  var sz = useState(cfg.sizeMl); var ml = sz[0]; var setMl = sz[1];
  var tr = useState(null); var trig = tr[0]; var setTrig = tr[1];
  var wh = useState(0); var backH = wh[0]; var setBackH = wh[1];
  var tm = useState(""); var timeStr = tm[0]; var setTimeStr = tm[1];
  var sw = useState(null); var swap = sw[0]; var setSwap = sw[1];
  var msgPair = useState(""); var msg = msgPair[0]; var setMsg = msgPair[1];

  var streak = ins.streak;
  var drankToday = ins.today.ml > 0;
  var tz = cfg.tzOff || 0;
  var todayEntries = log.filter(function(e) { return dayKey(e.ts, e.tzOff, cfg.rolloverHour) === ins.todayKey; });
  // Pace check: right after a beer, say when the next one is OK (one an hour)
  var todayDrinks = todayEntries.filter(function(e) { return !e.resisted && e.ml > 0; });
  var paceNote = null;
  if (todayDrinks.length) {
    var lastT = new Date(todayDrinks[todayDrinks.length - 1].ts).getTime();
    var agoMin = (Date.now() - lastT) / 60000;
    if (agoMin >= 0 && agoMin < PACE.targetMin) {
      var nextAt = fmtHM(new Date(lastT + PACE.targetMin * 60000).toISOString(), tz);
      if (todayDrinks.length === 1) paceNote = "First one logged. Make the next drink water. Next beer not before " + nextAt + ".";
      else {
        var gap = Math.round((lastT - new Date(todayDrinks[todayDrinks.length - 2].ts).getTime()) / 60000);
        paceNote = (gap < PACE.fastMin ? "Pace check: " + todayDrinks.length + " today, the last two " + gap + " min apart. " : "That's " + todayDrinks.length + " today. ") + "Water next. Next beer not before " + nextAt + ".";
      }
    }
  }

  function whenTs() {
    var now = new Date();
    if (timeStr) {
      var p = timeStr.split(":").map(Number);
      var d = new Date(now); d.setHours(p[0], p[1], 0, 0);
      if (d.getTime() > now.getTime() + 60000) d.setDate(d.getDate() - 1); // a future time means "last night"
      return d.toISOString();
    }
    return new Date(now.getTime() - backH * 3600000).toISOString();
  }
  function flash(t) { setMsg(t); setTimeout(function() { setMsg(""); }, 2600); }
  function doLog() {
    onLog({ ml: ml, trigger: trig, ts: whenTs() });
    setBackH(0); setTimeStr("");
    flash("Logged. Honest numbers are the point.");
  }
  function doUrge(e) {
    var q = e.currentTarget.getBoundingClientRect();
    if (burst) burst(q.left + q.width / 2, q.top, ["🌊","💪","🧠","⚡","🔥","🏆","✨","🙌"]);
    onUrge({ trigger: trig, swap: swap, ts: new Date().toISOString() });
    setSwap(null);
    flash("Urge beaten. That's the habit getting weaker.");
  }

  var next = ins.nextMilestone;
  var prevDays = 0;
  if (next) { for (var i = 0; i < MILESTONES.length; i++) { if (MILESTONES[i].days < next.days) prevDays = MILESTONES[i].days; } }
  var pct = next ? Math.min(100, Math.round(((streak.daysSinceLastDrink - prevDays) / (next.days - prevDays)) * 100)) : 100;

  return (
    <div>
      {props.notice && <div className="bz-win" style={{ marginBottom: 10 }}>✓ <span>{props.notice}</span></div>}
      <div className={"bz-hero" + (drankToday ? " drank" : "")}>
        {drankToday ? (
          <div>
            <div className="bz-hero-n drank">{ins.today.ml}<span style={{ fontSize:20, letterSpacing:0, marginLeft:4 }}>ml</span></div>
            <div className="bz-hero-l">today · {ins.today.stdDrinks} std drinks · {ins.today.kcal} kcal</div>
            <div className="bz-hero-sub">{todayDrinks.length <= 1 ? "Logged. Keep it to this one? Tomorrow is a fresh day either way." : todayDrinks.length + " today. Slow it right down from here: water between each."} {ins.week.vsPrevPct != null && ins.week.vsPrevPct < 0 ? "Week is still " + Math.abs(ins.week.vsPrevPct) + "% down on last week." : ""}</div>
          </div>
        ) : (
          <div>
            <div className="bz-hero-n">{streak.current}<span style={{ fontSize:20, letterSpacing:0, marginLeft:6 }}>{streak.current === 1 ? "DAY" : "DAYS"}</span></div>
            <div className="bz-hero-l">dry{streak.lastDrinkAt ? " · " + Math.floor(streak.hoursSinceLastDrink) + "h since last beer" : " · nothing logged yet"}{streak.longest > streak.current ? " · best " + streak.longest : streak.current >= 3 ? " · best ever" : ""}</div>
            {next && (
              <div>
                <div className="bz-track"><div className="bz-fill" style={{ width: pct + "%" }} /></div>
                <div className="bz-hero-sub"><b style={{ color:BEER_COLOR }}>Next: {next.title}</b> — {next.note}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {ins.wins.slice(0, 2).map(function(w, i) { return <div key={i} className="bz-win">🏆 <span>{w}</span></div>; })}
      {ins.flags.slice(0, 1).map(function(f, i) { return <div key={i} className={"bz-flag " + f.level}>⚠️ <span>{f.text}</span></div>; })}

      {props.showCheckin && <div style={{ marginTop: 12 }}><CheckinCard cfg={cfg} ins={ins} onDry={props.onCheckinDry} onLogMany={props.onCheckinLog} burst={burst} /></div>}
      {ins.checkins && ins.checkins.today && <div className="bz-win" style={{ marginTop: 8 }}>🌙 <span>{ins.checkins.today === "dry" ? "Checked in dry tonight." : "Checked in for tonight."}</span></div>}

      <div className="bz-card" style={{ marginTop:12 }}>
        <div className="bz-hd">Log a beer</div>
        <div className="bz-chips" style={{ marginBottom:8 }}>
          {SIZES.map(function(s) { return <button key={s.ml} className={"bz-chip" + (ml === s.ml ? " on" : "")} onClick={function() { setMl(s.ml); }}>{s.label}{s.label === "PINT" ? "" : "ml"}</button>; })}
          <button className="bz-chip" onClick={function() { setMl(Math.max(50, ml - 50)); }}>−50</button>
          <button className="bz-chip" onClick={function() { setMl(ml + 50); }}>+50</button>
        </div>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:30, fontWeight:900, color:AMBER, letterSpacing:-1, lineHeight:1, marginBottom:10 }}>{ml}<span style={{ fontSize:13, color:"var(--mid)", marginLeft:4 }}>ml · {cfg.abv}% · {Math.round(ml * cfg.abv / 100 * 0.789 / cfg.stdDrinkG * 10) / 10} std</span></div>
        <div className="bz-hd">Why?</div>
        <div className="bz-chips" style={{ marginBottom:10 }}>
          {Object.keys(TRIGGERS).map(function(t) { return <button key={t} className={"bz-chip" + (trig === t ? " on" : "")} onClick={function() { setTrig(trig === t ? null : t); }}>{TRIGGERS[t].emoji} {TRIGGERS[t].label}</button>; })}
        </div>
        {trig && TRIGGERS[trig] && <div className="bz-p" style={{ background:TEAL_BG, border:"2px solid " + BEER_COLOR, borderRadius:10, padding:"8px 10px", color:"#134E4A" }}>{TRIGGERS[trig].hint}</div>}
        <div className="bz-hd">When?</div>
        <div className="bz-chips" style={{ marginBottom:12, alignItems:"center" }}>
          {[0,1,2,3].map(function(h) { return <button key={h} className={"bz-chip" + (!timeStr && backH === h ? " on" : "")} onClick={function() { setBackH(h); setTimeStr(""); }}>{h === 0 ? "NOW" : "-" + h + "H"}</button>; })}
          <input className="bz-time" type="time" value={timeStr} onChange={function(e) { setTimeStr(e.target.value); }} />
        </div>
        <button className="bz-big" style={{ background:AMBER }} onClick={doLog}>🍺 LOG {ml}ml</button>
        {paceNote && <div className="bz-flag mid" style={{ marginTop:10, marginBottom:0 }}>⏱️ <span>{paceNote}</span></div>}
      </div>

      <div className="bz-card" style={{ borderColor:BEER_COLOR, boxShadow:"4px 4px 0 " + BEER_COLOR }}>
        <div className="bz-hd" style={{ color:BEER_COLOR }}>Got an urge? Surf it.</div>
        <div className="bz-p">Cravings crest in about 20–30 minutes and pass whether or not you drink. Pick what you'll do instead, start the timer, decide after.</div>
        <div style={{ textAlign:"center", marginBottom:10 }}><SurfTimer /></div>
        <div className="bz-chips" style={{ marginBottom:12 }}>
          {Object.keys(SWAPS).map(function(s) { return <button key={s} className={"bz-chip" + (swap === s ? " on" : "")} style={swap === s ? { background:BEER_COLOR, borderColor:BEER_COLOR } : {}} onClick={function() { setSwap(swap === s ? null : s); }}>{SWAPS[s].emoji} {SWAPS[s].label}</button>; })}
        </div>
        <button className="bz-big" style={{ background:BEER_COLOR }} onClick={doUrge}>💪 I BEAT IT{swap && SWAPS[swap] ? " · " + SWAPS[swap].label.toUpperCase() : ""}</button>
        {ins.urges.bestSwap && <div className="bz-p" style={{ marginTop:8, marginBottom:0 }}>Your best swap so far: <b>{swapLabel(ins.urges.bestSwap)}</b> ({ins.urges.bySwap[ins.urges.bestSwap]}×). Resist rate this week: <b>{ins.urges.resistRate7 == null ? "—" : ins.urges.resistRate7 + "%"}</b>.</div>}
      </div>

      {msg && <div className="bz-win" style={{ marginBottom:10 }}>✓ <span>{msg}</span></div>}

      <div className="bz-card">
        <div className="bz-hd">Today</div>
        {todayEntries.length === 0 && <div className="bz-p" style={{ marginBottom:0 }}>Nothing logged today. {streak.current > 0 ? "Keep it that way, or log honestly — both are useful." : ""}</div>}
        {todayEntries.slice().reverse().map(function(e) {
          return (
            <div key={e.id} className={"bz-entry" + (e.resisted ? " urge" : "")}>
              <div className="bz-entry-t">{fmtHM(e.ts, e.tzOff)}</div>
              {e.resisted
                ? <div className="bz-entry-v" style={{ color:BEER_COLOR, fontSize:14 }}>URGE BEATEN{e.swap ? " · " + swapLabel(e.swap) : ""}</div>
                : <div className="bz-entry-v" style={{ color:AMBER }}>{e.ml}<span style={{ fontSize:10, color:"var(--mid)" }}>ml</span></div>}
              {!e.resisted && e.trigger && <div style={{ fontSize:10, fontWeight:700, color:"var(--mid)" }}>{triggerLabel(e.trigger)}</div>}
              <button className="bz-entry-x" onClick={function() { onDelete(e.id); }} aria-label="delete">×</button>
            </div>
          );
        })}
      </div>

      <div className="bz-card">
        <div className="bz-hd">Last 14 days</div>
        <div className="bz-dots">
          {ins.last14.map(function(d) {
            var on = d.ml > 0;
            var shade = !d.tracked ? "var(--light)" : on ? (d.ml >= 1500 ? "#B45309" : d.ml >= 880 ? AMBER : "#FBBF24") : BEER_COLOR;
            return <div key={d.day} className="bz-dot" style={{ background: shade, color: "#fff", borderColor: !d.tracked ? "var(--rule)" : on ? "var(--ink)" : BEER_COLOR }} title={d.day + " · " + d.ml + "ml"}>{on ? Math.round(d.ml / 100) : ""}</div>;
          })}
        </div>
        <div className="bz-p" style={{ marginTop:8, marginBottom:0 }}>Teal = dry. Amber = beer (number is ml ÷ 100). Grey = before tracking. {ins.month.dryDays}/{ins.month.trackedDays} dry days in the last 30.</div>
      </div>

      <NudgeCard ins={ins} ctx={props.nudgeCtx} />

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
        <button className="fhb" style={{ borderColor:BEER_COLOR, color:BEER_COLOR }} onClick={props.onInsights}>INSIGHTS ▶</button>
      </div>
    </div>
  );
}

// ── INSIGHTS TAB ──────────────────────────────────────────────────────────────
function Collapsible(props) {
  var pair = useState(!!props.open); var open = pair[0]; var setOpen = pair[1];
  return (
    <div>
      <button className="bz-tog" onClick={function() { setOpen(!open); }}>
        <span style={{ fontSize:18 }}>{props.icon}</span><span style={{ flex:1 }}>{props.title}</span><span className={"la-ch" + (open ? " op" : "")}>▶</span>
      </button>
      {open && <div className="bz-card" style={{ marginTop:-2 }}>{props.children}</div>}
    </div>
  );
}

function Stepper(props) {
  return (
    <div className="crow">
      <div className="clabel" style={{ width:110 }}>{props.label}</div>
      <div className="cst">
        <button className="cb" onClick={function() { props.onChange(props.value - props.step); }}>−</button>
        <span className="cv">{props.fmt ? props.fmt(props.value) : props.value}</span>
        <button className="cb" onClick={function() { props.onChange(props.value + props.step); }}>+</button>
      </div>
    </div>
  );
}

// Paste a beer JSON export, a list of entries, or an import link. Merges —
// never replaces — and skips anything already logged.
function PastEntries(props) {
  var tPair = useState(""); var text = tPair[0]; var setText = tPair[1];
  var mPair = useState(""); var msg = mPair[0]; var setMsg = mPair[1];
  if (!props.onImport) return null;
  function go() {
    var r = props.onImport(text);
    setMsg(r.error ? "✕ " + r.error : "✓ Added " + r.added + (r.added === 1 ? " entry" : " entries") + (r.skipped ? " · " + r.skipped + " already there" : ""));
    if (!r.error) setText("");
  }
  return (
    <div style={{ marginTop: 14 }}>
      <div className="xhd">Add past entries</div>
      <div className="bz-p">Paste a beer JSON export or an import link. Entries are added to your log; nothing is replaced and duplicates are skipped.</div>
      <textarea className="xtxt" value={text} onChange={function(e) { setText(e.target.value); }} placeholder="Paste JSON or a #beer-import= link…" spellCheck={false} />
      <div className="xrow" style={{ marginTop: 6 }}><button className="xbtn pri" style={{ background: BEER_COLOR, borderColor: BEER_COLOR }} disabled={!text.trim()} onClick={go}>ADD</button></div>
      {msg && <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: msg.charAt(0) === "✕" ? "var(--red)" : "var(--green)" }}>{msg}</div>}
    </div>
  );
}

export function BeerInsightsTab(props) {
  var cfg = props.cfg, log = props.log || [], ins = props.ins, onCfg = props.onCfg;
  var copied = useState(""); var copyMsg = copied[0]; var setCopyMsg = copied[1];
  var s = ins.streak, w = ins.week, m = ins.month;

  function trend(pct) {
    if (pct == null || pct === 0) return <span style={{ color:"var(--mid)" }}>{pct === 0 ? "= same" : "no prior data"}</span>;
    return <span style={{ color: pct < 0 ? "var(--green)" : "var(--red)" }}>{pct < 0 ? "▼ " : "▲ "}{Math.abs(pct)}% vs prev</span>;
  }
  function exportCsv() {
    var csv = beerLogToCsv(log, cfg);
    if (!downloadFile("beer-log-" + ins.todayKey + ".csv", csv, "text/csv")) { navigator.clipboard && navigator.clipboard.writeText(csv); }
    setCopyMsg("CSV exported"); setTimeout(function() { setCopyMsg(""); }, 2500);
  }
  function exportJson() {
    var json = JSON.stringify(beerExportJson(log, cfg, undefined, props.checkins), null, 2);
    if (!downloadFile("beer-log-" + ins.todayKey + ".json", json, "application/json")) { navigator.clipboard && navigator.clipboard.writeText(json); }
    setCopyMsg("JSON exported"); setTimeout(function() { setCopyMsg(""); }, 2500);
  }
  function copyJson() {
    var json = JSON.stringify(beerExportJson(log, cfg, undefined, props.checkins), null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json).then(function() { setCopyMsg("JSON copied"); setTimeout(function() { setCopyMsg(""); }, 2500); });
  }

  var daily = ins.daily30.map(function(d) { return { label: d.day.slice(8), value: d.ml, hi: d.g >= ins.guidelines.bingeG }; });
  var weekly = ins.weekly8.map(function(x) { return { label: x.weeksAgo === 0 ? "now" : "-" + x.weeksAgo + "w", value: x.ml, hi: x.g > ins.guidelines.weeklyG }; });
  var bands = ins.timeOfDay.bands.map(function(b) { return { label: hourLabel(b.from) + "–" + hourLabel(b.to), value: b.count, hi: ins.timeOfDay.dangerBand && b.from === ins.timeOfDay.dangerBand.from }; });
  var dows = ins.dayOfWeek.byDow.slice(1).concat([ins.dayOfWeek.byDow[0]]).map(function(d) { return { label: d.dow, value: d.ml, hi: ins.dayOfWeek.worst && d.dow === ins.dayOfWeek.worst.dow }; });
  var trigs = Object.keys(ins.triggers.byTrigger).filter(function(t) { return ins.triggers.byTrigger[t].count > 0 || ins.triggers.byTrigger[t].urges > 0; })
    .sort(function(a, b) { return ins.triggers.byTrigger[b].count - ins.triggers.byTrigger[a].count; })
    .map(function(t) { var x = ins.triggers.byTrigger[t]; return { label: triggerLabel(t), value: x.count, hi: t === ins.triggers.top, urges: x.urges }; });
  var swaps = Object.keys(ins.urges.bySwap).sort(function(a, b) { return ins.urges.bySwap[b] - ins.urges.bySwap[a]; }).map(function(k) { return { label: swapLabel(k), value: ins.urges.bySwap[k], hi: k === ins.urges.bestSwap }; });

  return (
    <div>
      <div className="asec">
        <div className="at" style={{ color:BEER_COLOR, borderColor:BEER_COLOR }}>Streak</div>
        <div className="bz-tiles">
          <div className="bz-tile"><div className="bz-tile-v" style={{ color:BEER_COLOR }}>{s.current}</div><div className="bz-tile-l">current dry days</div></div>
          <div className="bz-tile"><div className="bz-tile-v">{s.longest}</div><div className="bz-tile-l">longest streak</div></div>
          <div className="bz-tile"><div className="bz-tile-v">{s.dryDays30}<span className="bz-tile-u">/{s.trackedDays30}</span></div><div className="bz-tile-l">dry days · 30d</div></div>
          <div className="bz-tile"><div className="bz-tile-v">{s.dryPctAll}<span className="bz-tile-u">%</span></div><div className="bz-tile-l">dry since {ins.startDate}</div></div>
        </div>
        {s.lastDrinkAt && <div className="bz-p" style={{ marginTop:8 }}>Last beer: <b>{s.lastDrinkAt.slice(0, 10)} {fmtHM(s.lastDrinkAt, cfg.tzOff)}</b> · {Math.floor(s.hoursSinceLastDrink)}h ago.{s.currentDrinkingRun > 0 ? " Currently " + s.currentDrinkingRun + " drinking day" + (s.currentDrinkingRun > 1 ? "s" : "") + " in a row." : ""}</div>}
        {ins.checkins && ins.checkins.confirmedDry30 > 0 && <div className="bz-p">Confirmed dry at check-in: <b>{ins.checkins.confirmedDry7}</b> this week, <b>{ins.checkins.confirmedDry30}</b> in 30 days.</div>}
        {ins.wins.map(function(x, i) { return <div key={i} className="bz-win">🏆 <span>{x}</span></div>; })}
      </div>

      <div className="asec">
        <div className="at" style={{ color:BEER_COLOR, borderColor:BEER_COLOR }}>Volume</div>
        <div className="bz-tiles c3">
          <div className="bz-tile"><div className="bz-tile-v" style={{ color:AMBER }}>{fmtMl(ins.today.ml)}</div><div className="bz-tile-l">today</div></div>
          <div className="bz-tile"><div className="bz-tile-v" style={{ color:AMBER }}>{fmtMl(w.ml)}</div><div className="bz-tile-l">7 days</div></div>
          <div className="bz-tile"><div className="bz-tile-v" style={{ color:AMBER }}>{fmtMl(m.ml)}</div><div className="bz-tile-l">30 days</div></div>
          <div className="bz-tile"><div className="bz-tile-v">{w.stdDrinks}</div><div className="bz-tile-l">std drinks · 7d</div></div>
          <div className="bz-tile"><div className="bz-tile-v">{Math.round(w.g)}<span className="bz-tile-u">g</span></div><div className="bz-tile-l">alcohol · 7d</div></div>
          <div className="bz-tile"><div className="bz-tile-v">{w.kcal}</div><div className="bz-tile-l">kcal · 7d</div></div>
        </div>
        <div className="bz-p" style={{ marginTop:8 }}>7-day: {trend(w.vsPrevPct)} · 30-day: {trend(m.vsPrevPct)} · avg {w.avgMlPerDay}ml/day this week · {w.drinkingDays}/7 drinking days.</div>
        <div className="bz-p">Low-risk guideline is ≤112g/week (14 UK units) spread over 3+ days, with no single day ≥60g. You're at <b style={{ color: w.g > ins.guidelines.weeklyG ? "var(--red)" : "var(--green)" }}>{Math.round(w.g)}g</b> this week.</div>
        {ins.budget && (
          <div style={{ marginTop:6 }}>
            <div className="bz-hd">Weekly budget · {ins.budget.usedMl} / {ins.budget.weeklyMl}ml</div>
            <div className="bz-track" style={{ marginTop:0 }}><div className="bz-fill" style={{ width: ins.budget.pct + "%", background: ins.budget.pct >= 100 ? "var(--red)" : AMBER }} /></div>
          </div>
        )}
        {ins.money && <div className="bz-p" style={{ marginTop:8 }}>Spent ~<b>{ins.money.spent30}</b> in 30 days, <b>{ins.money.spentAll}</b> since start. Current streak has saved ~<b>{ins.money.savedStreak}</b> vs your pre-streak average.</div>}
        <div className="bz-card" style={{ marginTop:10 }}>
          <div className="bz-hd">Daily ml · last 30 days</div>
          <Bars data={daily} color={AMBER} labelEvery={5} />
          <div className="bz-hd" style={{ marginTop:12 }}>Weekly ml · last 8 weeks</div>
          <Bars data={weekly} color={AMBER} />
          <div className="bz-src">Red bars cross a guideline (≥60g in a day / &gt;112g in a week). Green ticks are dry days.</div>
        </div>
      </div>

      {ins.pace.sessions30 > 0 && (
        <div className="asec">
          <div className="at" style={{ color:BEER_COLOR, borderColor:BEER_COLOR }}>Pace</div>
          <div className="bz-tiles c3">
            <div className="bz-tile"><div className="bz-tile-v">{ins.pace.avgBeersPerSession}</div><div className="bz-tile-l">beers / session</div></div>
            <div className="bz-tile"><div className="bz-tile-v" style={{ color: ins.pace.avgMinPerBeer != null && ins.pace.avgMinPerBeer < PACE.fastMin ? AMBER : "var(--ink)" }}>{ins.pace.avgMinPerBeer == null ? "—" : ins.pace.avgMinPerBeer}<span className="bz-tile-u">min</span></div><div className="bz-tile-l">per beer</div></div>
            <div className="bz-tile"><div className="bz-tile-v" style={{ color:BEER_COLOR }}>{PACE.targetMin}<span className="bz-tile-u">min</span></div><div className="bz-tile-l">target</div></div>
          </div>
          <div className="bz-card" style={{ marginTop:10 }}>
            <div className="bz-hd">Recent sessions</div>
            {ins.pace.recent.map(function(x) {
              var fast = x.minPerBeer != null && x.minPerBeer < PACE.fastMin;
              return (
                <div key={x.day} className="bz-hbar">
                  <div className="bz-hbar-l" style={{ width:84 }}>{x.label}</div>
                  <div style={{ flex:1, fontSize:11, fontWeight:700 }}>{x.count} × · {fmtMl(x.ml)}</div>
                  <div className="bz-hbar-v" style={{ width:80, color: fast ? AMBER : "var(--mid)" }}>{x.minPerBeer == null ? "single" : x.minPerBeer + " min each"}</div>
                </div>
              );
            })}
            <div className="bz-p" style={{ marginTop:6, marginBottom:0 }}>Your body clears roughly one standard drink an hour, and a 500ml beer is about two. Faster than one an hour and it stacks, which is how 2 turns into 6. Minutes per beer is the time between your first and last, divided by the gaps.</div>
          </div>
        </div>
      )}

      {ins.flags.length > 0 && (
        <div className="asec">
          <div className="at" style={{ color:AMBER, borderColor:AMBER }}>Worth a look</div>
          {ins.flags.map(function(f, i) { return <div key={i} className={"bz-flag " + f.level}>⚠️ <span>{f.text}</span></div>; })}
        </div>
      )}

      <div className="asec">
        <div className="at" style={{ color:BEER_COLOR, borderColor:BEER_COLOR }}>When it happens</div>
        <div className="bz-card">
          <div className="bz-hd">Beers by time of day</div>
          <Bars data={bands} color={BEER_COLOR} />
          {ins.timeOfDay.dangerBand ? (
            <div className="bz-p" style={{ marginTop:8 }}>Danger window: <b>{hourLabel(ins.timeOfDay.dangerBand.from)}–{hourLabel(ins.timeOfDay.dangerBand.to)}</b> ({ins.timeOfDay.dangerBand.count} beers, {fmtMl(ins.timeOfDay.dangerBand.ml)}).{ins.timeOfDay.avgFirstDrinkHour != null ? " First beer of the day averages " + hourLabel(Math.floor(ins.timeOfDay.avgFirstDrinkHour)) + "." : ""} Put the swap <b>before</b> that window: plan the walk, the training session or the sparkling water for {hourLabel(Math.max(0, ins.timeOfDay.dangerBand.from - 1))}.</div>
          ) : <div className="bz-p" style={{ marginTop:8 }}>Log a few beers with times and your danger window shows up here.</div>}
          <div className="bz-hd" style={{ marginTop:12 }}>ml by day of week</div>
          <Bars data={dows} color={BEER_COLOR} />
          {ins.dayOfWeek.worst && <div className="bz-p" style={{ marginTop:8, marginBottom:0 }}>Heaviest day: <b>{ins.dayOfWeek.worst.dow}</b> ({fmtMl(ins.dayOfWeek.worst.ml)} over {ins.dayOfWeek.worst.days} day{ins.dayOfWeek.worst.days > 1 ? "s" : ""}). Book something for that evening.</div>}
        </div>
      </div>

      <div className="asec">
        <div className="at" style={{ color:BEER_COLOR, borderColor:BEER_COLOR }}>Why it happens</div>
        <div className="bz-card">
          {trigs.length ? <HBars data={trigs} color={BEER_COLOR} fmt={function(v) { return v + "×"; }} /> : <div className="bz-p" style={{ marginBottom:0 }}>Tag a trigger when you log and the pattern shows up here.</div>}
          {ins.triggers.top && TRIGGERS[ins.triggers.top] && <div className="bz-p" style={{ marginTop:8, marginBottom:0, background:TEAL_BG, border:"2px solid " + BEER_COLOR, borderRadius:10, padding:"8px 10px", color:"#134E4A" }}><b>{triggerLabel(ins.triggers.top)}</b> is your main cue. {TRIGGERS[ins.triggers.top].hint}</div>}
        </div>
      </div>

      <div className="asec">
        <div className="at" style={{ color:BEER_COLOR, borderColor:BEER_COLOR }}>Urges beaten</div>
        <div className="bz-tiles c3">
          <div className="bz-tile"><div className="bz-tile-v" style={{ color:BEER_COLOR }}>{ins.urges.total}</div><div className="bz-tile-l">all time</div></div>
          <div className="bz-tile"><div className="bz-tile-v" style={{ color:BEER_COLOR }}>{ins.urges.last7}</div><div className="bz-tile-l">this week</div></div>
          <div className="bz-tile"><div className="bz-tile-v">{ins.urges.resistRateAll == null ? "—" : ins.urges.resistRateAll + "%"}</div><div className="bz-tile-l">resist rate</div></div>
        </div>
        {swaps.length > 0 && <div className="bz-card" style={{ marginTop:10 }}><div className="bz-hd">What worked</div><HBars data={swaps} color={BEER_COLOR} fmt={function(v) { return v + "×"; }} /></div>}
        <div className="bz-p" style={{ marginTop:8 }}>Resist rate = urges beaten ÷ (urges beaten + beers). Every beaten urge weakens the cue→beer link and strengthens cue→swap.</div>
      </div>

      <div className="asec">
        <div className="at" style={{ color:BEER_COLOR, borderColor:BEER_COLOR }}>What a dry stretch does</div>
        <div className="bz-card">
          <div className="bz-p">Days since last beer: <b>{s.daysSinceLastDrink}</b>. What studies report for regular drinkers taking a break. Averages, not promises.</div>
          {ins.milestones.map(function(ms) {
            return (
              <div key={ms.days} className="bz-ms" style={{ opacity: ms.reached ? 1 : 0.7 }}>
                <div className={"bz-ms-dot" + (ms.reached ? " on" : "")}>{ms.reached ? "✓" : ""}</div>
                <div><div className="bz-ms-t" style={{ color: ms.reached ? BEER_COLOR : "var(--ink)" }}>{ms.title}</div><div className="bz-ms-n">{ms.note}</div></div>
              </div>
            );
          })}
          <div className="bz-src">Sources: Ebrahim et al. 2013 (alcohol and sleep); de Visser et al. 2016 (Dry January follow-up); Mehta et al. 2018 (BMJ Open, one-month abstinence); Lally et al. 2010 (habit formation, median 66 days); WHO and UK CMO low-risk guidelines.</div>
        </div>
      </div>

      <Collapsible icon="🧠" title="Playbook · habit & pace" open>
        <div className="bz-p"><b>What you're working on.</b> Not a dependency: a habit loop, and drinking fast once you start. Two levers: fewer evenings that start with a beer, and slower, smaller nights when they do.</div>
        <div className="bz-p"><b>Replace, don't remove.</b> The habit is cue → routine → reward. Keep the cue (home from work, late afternoon, bored) and the reward (relief, a ritual, something cold in hand). Swap only the routine: <b>"When I get home, I change, train or walk, and pour a sparkling water."</b></div>
        <div className="bz-p"><b>Slowing down when you do drink.</b></div>
        <div className="bz-p" style={{ paddingLeft:10 }}>
          • Decide the number before the first one, and tell someone.<br />
          • First drink is water or a 0%. That's the thirsty, gulping one.<br />
          • 330ml, not 500ml. Glass, not can. Put it down between sips.<br />
          • Water between every beer, and nothing until an hour after the last one. The app shows the time after you log.<br />
          • Eat first. Food slows how fast alcohol hits.<br />
          • Buy singles, not a case. What's in the fridge gets drunk.
        </div>
        <div className="bz-p"><b>Why pace matters.</b> Your body clears roughly one standard drink an hour, and a 500ml beer is about two. Drink faster and it stacks. Each beer also lowers the brakes on the next, so the decision is easiest before the second one.</div>
        <div className="bz-p"><b>Slow lift beats a quick one.</b> Training, a walk or a cold shower lift your mood for hours. Beer gives a quick lift and a dip later, which is what pulls you to the next one.</div>
        <div className="bz-p"><b>Thirst rule.</b> 500ml water or sparkling first. Wait 15 minutes. Then decide.</div>
        <div className="bz-p" style={{ marginBottom:0 }}><b>Dry days in a row.</b> Three back-to-back dry days a week keeps beer a choice rather than a routine. Mon–Wed is the easy block.</div>
      </Collapsible>

      <Collapsible icon="🩺" title="Staying on the right side">
        <div className="bz-p">You're tracking this early, which is the right time. A habit becomes something more when a few of these start to fit:</div>
        {CHECK_SIGNS.map(function(x, i) { return <div key={i} className="bz-ms"><div className="bz-ms-dot" style={{ width:18, height:18 }} /><div className="bz-ms-n" style={{ marginTop:0 }}>{x}</div></div>; })}
        <div className="bz-p" style={{ marginTop:8 }}>If two or more fit, have a chat with your GP. Not because something's wrong with you, but because it's much easier to turn around early. The WHO's three-question AUDIT-C quiz is a quick self-check.</div>
        <div className="bz-p" style={{ marginBottom:0 }}>One safety note for anyone drinking heavily every day: cut down gradually with a doctor's help rather than stopping overnight.</div>
      </Collapsible>

      <Collapsible icon="⚙️" title="Settings">
        <Stepper label="Default size" value={cfg.sizeMl} step={10} fmt={function(v) { return v + "ml"; }} onChange={function(v) { onCfg({ sizeMl: Math.max(50, v) }); }} />
        <Stepper label="ABV" value={cfg.abv} step={0.5} fmt={function(v) { return v + "%"; }} onChange={function(v) { onCfg({ abv: Math.min(20, Math.max(0, Math.round(v * 10) / 10)) }); }} />
        <div className="crow"><div className="clabel" style={{ width:110 }}>Std drink</div>
          <div className="bz-chips">{STD_DRINK_OPTIONS.map(function(o) { return <button key={o.g} className={"bz-chip" + (cfg.stdDrinkG === o.g ? " on" : "")} style={{ padding:"4px 8px", fontSize:9 }} onClick={function() { onCfg({ stdDrinkG: o.g }); }}>{o.label}</button>; })}</div>
        </div>
        <Stepper label="Weekly budget" value={cfg.weeklyBudgetMl} step={330} fmt={function(v) { return v === 0 ? "DRY" : v + "ml"; }} onChange={function(v) { onCfg({ weeklyBudgetMl: Math.max(0, v) }); }} />
        <Stepper label="Day rolls at" value={cfg.rolloverHour} step={1} fmt={function(v) { return hourLabel(v); }} onChange={function(v) { onCfg({ rolloverHour: Math.min(12, Math.max(0, v)) }); }} />
        <Stepper label="Cost / unit" value={cfg.costPerUnit} step={5} fmt={function(v) { return v === 0 ? "off" : v; }} onChange={function(v) { onCfg({ costPerUnit: Math.max(0, v) }); }} />
        <div className="crow"><div className="clabel" style={{ width:110 }}>Start date</div><input className="bz-time" type="date" value={cfg.startDate || ""} onChange={function(e) { onCfg({ startDate: e.target.value || null }); }} /></div>
        <div className="bz-p" style={{ marginBottom:0 }}>Budget 0 = aiming dry. "Day rolls at" means a beer at 01:00 counts for the night before. Cost is in whatever currency you think in; 0 hides money stats.</div>
      </Collapsible>

      <div className="xsec">
        <div className="xhd">Beer log · Export</div>
        <div className="bz-p">CSV has one row per beer or beaten urge with local time, day, grams, standard drinks, kcal, trigger and swap. JSON includes the precalculated insights.</div>
        <div className="xrow">
          <button className="xbtn pri" style={{ background:BEER_COLOR, borderColor:BEER_COLOR }} onClick={exportCsv}>CSV</button>
          <button className="xbtn" onClick={exportJson}>JSON FILE</button>
          <button className="xbtn" onClick={copyJson}>COPY JSON</button>
        </div>
        {copyMsg && <div style={{ marginTop:6, fontSize:11, color:"var(--green)", letterSpacing:"1px", fontWeight:700 }}>✓ {copyMsg}</div>}
        <div className="bz-src">{log.length} entries · the main Export / Import on the barbell Stats tab also carries this log.</div>
        <PastEntries onImport={props.onImport} />
      </div>
    </div>
  );
}
