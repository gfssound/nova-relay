/* Nova Relay: Stream Deck plugin (Nov 7, 2026).
 *
 * Each key calls Nova Relay's button addresses (/api/rec, /api/tone, …) on the computer running Nova Relay and
 * draws itself from /api/status, so it lights up with the recorder (red while recording, green tone, yellow PFL,
 * armed tracks). With no address set it uses Nova Relay on this computer (http://127.0.0.1:8080).
 *
 * No add-on libraries: Stream Deck's own WebSocket link is spoken directly (RFC 6455 text frames over a local TCP
 * socket), and Node's built-in fetch talks to Nova Relay. Runs on the Node.js 20 that the Stream Deck app ships.
 */
"use strict";
const net = require("net");
const crypto = require("crypto");

const PLUGIN = "com.gfssound.novaremote";
const DEFAULT_ADDRESS = "http://127.0.0.1:8080";
const POLL_MS = 500, POLL_SLOW_MS = 2000;

/* ------------------------------------------------------------------ key pictures (144×144 SVG) */
const C = { bg: "#17191c", panel: "#24272b", line: "#3a3f45", fg: "#f2f2f2", dim: "#8a9097",
  rec: "#e0262d", recDark: "#4a1214", tone: "#2fbf71", toneDark: "#123d27", pfl: "#f2c230", hp: "#3a8dde", hpDark: "#13304d",
  slate: "#ff8c1a", com: "#22b8d6", amber: "#f2a516", red: "#e0262d", note: "#9b7bff", route: "#19a3a3", page: "#3a8dde" };
const IN_LABELS = ["Analog 1", "Analog 2", "Analog 3", "Analog 4", "Return 1", "Return 2", ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => `AES ${n}`), ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => `RX ${n}`)];
const OLD = "Update Nova Relay";
/* A microphone glyph for the Slate and Com keys. */
const mic = (color, y = 50) => `<rect x="62" y="${y - 22}" width="20" height="32" rx="10" fill="${color}"/><path d="M54 ${y} a18 18 0 0 0 36 0" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/><rect x="69.5" y="${y + 17}" width="5" height="9" fill="${color}"/>`;
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/* Biggest font size (up to max) at which text fits the key's width. */
/* Bold capitals run about 0.66 em wide. */
const fit = (text, max, width = 126) => Math.max(11, Math.min(max, Math.floor(width / (Math.max(1, String(text).length) * 0.66))));
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
function txt(text, y, size, color, weight = 700) {
  return `<text x="72" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="middle">${esc(text)}</text>`;
}
/* o: bg, border, top, big, bigColor, bigMax, bottom, bottomColor, icon (svg string), progress (0–1) */
function renderKey(o) {
  const parts = [`<rect width="144" height="144" rx="18" fill="${o.bg || C.bg}"/>`];
  if (o.border) parts.push(`<rect x="5" y="5" width="134" height="134" rx="14" fill="none" stroke="${o.border}" stroke-width="8"/>`);
  if (o.icon) parts.push(o.icon);
  if (o.top) parts.push(txt(o.top, 30, fit(o.top, 20), o.topColor || C.dim));
  if (o.big) { const s = fit(o.big, o.bigMax || 40, o.border ? 112 : 126); parts.push(txt(o.big, o.bigY || 72 + s * 0.36, s, o.bigColor || C.fg)); }
  if (o.bottom) parts.push(txt(o.bottom, 124, fit(o.bottom, 20), o.bottomColor || C.dim));
  if (o.progress != null) {
    parts.push(`<rect x="14" y="132" width="116" height="6" rx="3" fill="${C.line}"/>`);
    parts.push(`<rect x="14" y="132" width="${Math.round(116 * Math.max(0, Math.min(1, o.progress)))}" height="6" rx="3" fill="${o.progressColor || C.fg}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">${parts.join("")}</svg>`;
}
const dot = (color, y = 54, r = 16) => `<circle cx="72" cy="${y}" r="${r}" fill="${color}"/>`;
const square = (color, y = 54, s = 28) => `<rect x="${72 - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="4" fill="${color}"/>`;
const mmss = sec => { sec = Math.max(0, Math.floor(sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(s).padStart(2, "0"); };

/* What each key shows. st = latest /api/status (null when Nova Relay can't be reached); k = the key. */
const DRAW = {
  rec(st, k) {
    if (!st) return renderKey({ icon: dot(C.line), big: "REC", bigColor: C.dim, bigY: 98, bigMax: 26, bottom: offline(k) });
    if (st.recording) return renderKey({ bg: C.rec, icon: dot("#fff", 46, 12), big: mmss(st.elapsed), bigY: 92, bigMax: 30,
      bottom: k.msg || slate(st), bottomColor: "#ffd9da", progress: k.progress, progressColor: "#fff" });
    /* Nothing armed: amber, as the screen warns (Nov 7). */
    if (st.armedCount === 0) return renderKey({ bg: C.amber, icon: dot(C.rec), big: "REC", bigY: 98, bigMax: 26, bigColor: "#1d1300",
      bottom: k.msg || "No tracks armed", bottomColor: "#3d2900", progress: k.progress, progressColor: C.rec });
    return renderKey({ icon: dot(C.rec), big: "REC", bigY: 98, bigMax: 26, bottom: k.msg || slate(st),
      bottomColor: k.msg ? C.fg : C.dim, progress: k.progress, progressColor: C.rec });
  },
  stop(st, k) {
    if (!st) return renderKey({ icon: square(C.line), big: "STOP", bigColor: C.dim, bigY: 98, bigMax: 26, bottom: offline(k) });
    return renderKey({ icon: square(st.recording ? C.fg : C.dim), big: "STOP", bigY: 98, bigMax: 26, bigColor: st.recording ? C.fg : C.dim,
      bottom: k.msg || (st.recording ? "Recording" : "Stopped"), bottomColor: k.msg ? C.fg : C.dim, progress: k.progress });
  },
  /* Scream trim (Nov 12): amber while the transmitters are dropped; a tap toggles. */
  scream(st, k) {
    if (!st) return renderKey({ top: "SCREAM", big: "TRIM", bigColor: C.dim, bottom: offline(k) });
    const sc = st.scream || { on: false, level: 15, rx: [] };
    if (sc.on) return renderKey({ bg: C.amber, top: "SCREAM ON", topColor: "#3d2900", big: String(sc.level), bigColor: "#1d1300", bigMax: 40, bottom: k.msg || "tap to restore", bottomColor: "#3d2900" });
    return renderKey({ top: "SCREAM", big: sc.rx.length ? "\u2193 " + sc.level : "SET UP", bigMax: 34, bigColor: sc.rx.length ? C.fg : C.dim,
      bottom: k.msg || (sc.rx.length ? sc.rx.map(r => "RX" + r).join(" ") : "in Nova Relay"), bottomColor: C.dim });
  },
  tone(st, k) {
    if (!st) return renderKey({ big: "TONE", bigColor: C.dim, bottom: offline(k) });
    const on = !!st.tone;
    return renderKey({ bg: on ? C.tone : C.bg, top: "TONE", topColor: on ? "#0b2b1a" : C.dim, big: on ? "ON" : "OFF", bigColor: on ? "#0b2b1a" : C.fg,
      bottom: k.msg || "", bottomColor: on ? "#0b2b1a" : C.fg, progress: k.progress, progressColor: C.tone });
  },
  hp(st, k) {
    const mode = k.settings.mode || "next";
    const label = mode === "next" ? "NEXT" : mode === "prev" ? "PREV" : `HP ${mode}`;
    if (!st) return renderKey({ top: "HEADPHONES", big: label, bigColor: C.dim, bottom: offline(k) });
    if (mode === "next" || mode === "prev")
      return renderKey({ top: mode === "next" ? "HP NEXT ▸" : "◂ HP PREV", big: st.hpName || `HP ${st.hp}`, bigMax: 30, bottom: k.msg || `Preset ${st.hp}` });
    const n = +mode, live = st.hp === n, name = (st.hpNames && st.hpNames[n - 1]) || `HP ${n}`;
    return renderKey({ bg: live ? C.hp : C.bg, top: `HP ${n}`, topColor: live ? "#dcebfb" : C.dim, big: name, bigMax: 30,
      bottom: k.msg || (live ? "In the headphones" : ""), bottomColor: live ? "#dcebfb" : C.dim });
  },
  arm(st, k) {
    const which = k.settings.track || "1";
    if (which === "all" || which === "none") {
      const label = which === "all" ? "ARM ALL" : "DISARM ALL";
      if (!st) return renderKey({ big: label, bigColor: C.dim, bigMax: 26, bottom: offline(k) });
      return renderKey({ top: "TRACKS", big: label, bigMax: 26, bottom: k.msg || `${st.armedCount} armed`, bottomColor: k.msg ? C.fg : C.dim });
    }
    const t = +which, info = st && st.tracks && st.tracks[t - 1];
    const name = (info && info.name) || `TRACK ${t}`;
    if (!st) return renderKey({ top: `TRACK ${t}`, big: name, bigColor: C.dim, bigMax: 30, bottom: offline(k) });
    const armed = info ? info.armed : (st.armed || []).includes(t);
    return renderKey({ bg: armed ? C.recDark : C.bg, border: armed ? C.rec : null, top: `TRACK ${t}`, topColor: armed ? "#ffb3b6" : C.dim,
      big: name, bigMax: 30, bottom: k.msg || (st.recording ? "Locked" : armed ? "Armed" : "Off"), bottomColor: armed ? "#ffb3b6" : C.dim });
  },
  /* Nov 14 (0.6.1): nudge an input's Aria fader; the bottom shows where Nova Relay last put it, the bar too. */
  faderstep(st, k) {
    const i = +(k.settings.input || 15), up = (k.settings.dir || "up") !== "down", inp = st && st.inputs ? st.inputs[i - 1] || {} : {};
    const name = inp.track || IN_LABELS[i - 1] || `Input ${i}`, top = `FADER ${up ? "\u25b2" : "\u25bc"}`;
    if (!st) return renderKey({ top, big: name, bigColor: C.dim, bigMax: 30, bottom: offline(k) });
    if (!("faderPos" in inp)) return renderKey({ top, big: name, bigMax: 30, bottom: OLD });
    const v = inp.faderPos;
    return renderKey({ top, big: name, bigMax: 30, bottom: k.msg || (inp.fader == null ? "No fader" : v == null ? "Set once" : inp.faderDown && v === 0 ? "Down" : Math.round(v / 2.55) + "%"),
      bottomColor: inp.fader == null || v == null ? C.dim : C.fg, progress: inp.fader == null || v == null ? null : v / 255, progressColor: C.dim });
  },
  pfl(st, k) {
    const which = k.settings.fader || "1";
    if (which === "off") {
      if (!st) return renderKey({ big: "PFL OFF", bigColor: C.dim, bigMax: 26, bottom: offline(k) });
      const any = (st.pfl || []).length;
      return renderKey({ top: "PFL", big: "ALL OFF", bigMax: 26, bottom: k.msg || (any ? `${any} on` : ""), bottomColor: any ? C.pfl : C.dim });
    }
    const f = +which, fd = st && st.faders && st.faders[f - 1];
    const on = fd ? fd.pfl : !!(st && (st.pfl || []).some(p => p.fader === f));
    const name = fd ? (fd.track || fd.input) : `FADER ${f}`;
    if (!st) return renderKey({ top: `PFL ${f}`, big: name, bigColor: C.dim, bigMax: 30, bottom: offline(k) });
    return renderKey({ bg: on ? C.pfl : C.bg, top: `PFL · FADER ${f}`, topColor: on ? "#3a2c00" : C.dim, big: name, bigMax: 30, bigColor: on ? "#1a1400" : C.fg,
      bottom: k.msg || (fd && fd.track ? fd.input : on ? "On" : ""), bottomColor: on ? "#3a2c00" : C.dim });
  },
  slate(st, k) { return talkKey(st, k, "slate", "SLATE", C.slate); },
  com(st, k) { return talkKey(st, k, "com", "COM", C.com); },
  drive(st, k) {
    const v = st ? st.driveLeft : undefined;
    return levelKey(st, k, "DRIVE LEFT", v == null ? null : hm(v), v == null ? null : levelOf(v / 60, num(k.settings.amber, 60), num(k.settings.red, 15)),
      v == null ? "" : "at " + (st.armedCount || 0) + " tracks");
  },
  battery(st, k) {
    const v = st ? st.volts : undefined;
    return levelKey(st, k, "BATTERY", v == null ? null : v.toFixed(1) + " V", v == null ? null : levelOf(v, num(k.settings.amber, 14.0), num(k.settings.red, 13.0)),
      v == null ? "" : null);
  },
  primary(st, k) {
    const v = st ? st.primaryFreeGB : undefined;
    const lvl = v == null ? null : levelOf(v, num(k.settings.amber, 20), num(k.settings.red, 5));
    return levelKey(st, k, "PRIMARY", v == null ? null : gb(v), lvl, lvl ? null : "free");
  },
  mirror(st, k) {
    const m = st && st.mirror;
    if (!m || !m.state) return levelKey(st, k, "MIRROR", null, null, "");
    if (m.state === "off") return levelKey(st, k, "MIRROR", "OFF", k.settings.offWarn === false ? 0 : 1, "Not mirroring");
    const behind = m.behind || 0, lvl = behind >= num(k.settings.red, 10) ? 2 : behind >= num(k.settings.amber, 3) ? 1 : 0;
    if (m.state === "mirroring") return levelKey(st, k, "MIRROR " + (m.mode || ""), (m.pct != null ? m.pct + "%" : "…"), lvl,
      m.files != null ? `File ${m.file}/${m.files}` + (behind ? ` · ${behind} behind` : "") : m.pct === 100 ? "Caught up" : "Mirroring");
    return levelKey(st, k, "MIRROR", m.mode || m.state.toUpperCase(), 0, "Caught up");
  },
  /* ---- logging (Nov 7) */
  scene(st, k) {
    const mode = k.settings.mode || "number", top = mode === "number" ? "NEXT SCENE #" : "NEXT LETTER";
    if (!st) return renderKey({ top, big: "SCENE", bigColor: C.dim, bottom: offline(k) });
    if (st.sceneNext === undefined) return renderKey({ top, big: "SCENE", bigColor: C.dim, bottom: OLD });
    const v = (mode === "number" ? sceneNextNumber : sceneNextLetter)(st.sceneNext);
    return renderKey({ top, big: v || "?", bigMax: 34, bottom: k.msg || `now ${st.sceneNext || "\u2013"} / ${st.takeNext}` });
  },
  take(st, k) {
    const up = (k.settings.mode || "up") === "up", top = up ? "TAKE +1" : "TAKE \u22121";
    if (!st) return renderKey({ top, big: "TAKE", bigColor: C.dim, bottom: offline(k) });
    if (st.takeNext === undefined) return renderKey({ top, big: "TAKE", bigColor: C.dim, bottom: OLD });
    return renderKey({ top, big: st.takeNext, bigMax: 40, bottom: k.msg || `next take \u00b7 sc ${st.sceneNext || "\u2013"}` });
  },
  note(st, k) {
    const v = noteText(st, k);
    if (!st) return renderKey({ top: "NOTE", big: v || "NOTE", bigColor: C.dim, bottom: offline(k) });
    if (st.noteTarget === undefined) return renderKey({ top: "NOTE", big: v || "NOTE", bigColor: C.dim, bottom: OLD });
    if (!v) return renderKey({ top: "NOTE", big: "\u2014", bigColor: C.dim, bottom: k.msg || "Empty preset" });
    const rolling = st.noteTarget === "current", on = (rolling ? st.noteCurrent : st.noteNext) === v;
    return renderKey({ bg: on ? C.note : C.bg, top: rolling ? "NOTE \u00b7 ROLLING" : "NOTE \u00b7 NEXT", topColor: on ? "#1b1236" : C.dim, big: v, bigMax: 30,
      bigColor: on ? "#120b26" : C.fg, bottom: k.msg || (on ? (rolling ? "On this take" : "On next take") : ""), bottomColor: on ? "#1b1236" : C.dim });
  },
  lasttake(st, k) {
    if (!st) return renderKey({ top: "LAST TAKE", big: "\u2014", bigColor: C.dim, bottom: offline(k) });
    if (st.lastTake === undefined) return renderKey({ top: "LAST TAKE", big: "\u2014", bigColor: C.dim, bottom: OLD });
    const t = st.lastTake; if (!t) return renderKey({ top: "LAST TAKE", big: "\u2014", bigColor: C.dim, bottom: "None yet" });
    const len = t.length != null ? mmss(t.length) : "";
    return renderKey({ top: "LAST TAKE", big: `${t.scene || "\u2013"}/${t.take || "\u2013"}`, bigMax: 32, bottom: [len, t.note].filter(Boolean).join(" \u00b7 ") });
  },
  /* ---- arming */
  armset(st, k) {
    const want = armSetTracks(k), name = (k.settings.name || "").trim().toUpperCase() || "ARM SET";
    if (!st) return renderKey({ top: "ARM SET", big: name, bigColor: C.dim, bigMax: 28, bottom: offline(k) });
    if (!want.length) return renderKey({ top: "ARM SET", big: name, bigColor: C.dim, bigMax: 28, bottom: "Pick tracks" });
    const armed = new Set(st.armed || []), match = want.length === armed.size && want.every(t => armed.has(t));
    const names = want.map(t => (st.tracks && st.tracks[t - 1] && st.tracks[t - 1].name) || `T${t}`);
    return renderKey({ bg: match ? C.recDark : C.bg, border: match ? C.rec : null, top: `ARM SET \u00b7 ${want.length}`, topColor: match ? "#ffb3b6" : C.dim,
      big: name, bigMax: 28, bottom: k.msg || (st.recording ? "Locked" : names.length > 2 ? `${names[0]} +${names.length - 1}` : names.join(" ")), bottomColor: match ? "#ffb3b6" : C.dim });
  },
  /* ---- glance */
  meter(st, k) {
    const src = k.settings.source || "t1", isOut = src[0] === "o", n = +src.slice(1) || 1;
    const name = isOut ? ((st && st.outs && st.outs[n - 1] && st.outs[n - 1].name) || `OUT ${n}`) : ((st && st.tracks && st.tracks[n - 1] && st.tracks[n - 1].name) || `TRACK ${n}`);
    const top = isOut ? `OUT ${n}` : `TRACK ${n}`;
    if (!st || !meters) return renderKey({ top, big: name, bigColor: C.dim, bigMax: 26, bottom: st ? "" : offline(k) });
    const db = isOut ? meters.outs[n - 1] : meters.tracks[n - 1];
    return meterKey(top, name, db, k);
  },
  rx(st, k) {
    const n = +(k.settings.rx || 1), top = `RX ${n}`;
    if (!st) return renderKey({ top, big: "\u2014", bigColor: C.dim, bottom: offline(k) });
    const r = (st.receivers || [])[n - 1] || {}, inp = st.inputs && st.inputs[13 + n];
    const tx = r.tx || "", warn = /wake|low|standby/i.test(tx);
    return renderKey({ bg: warn ? C.amber : C.bg, top: inp && inp.track ? `${top} \u00b7 ${inp.track}` : top, topColor: warn ? "#3d2900" : C.dim,
      big: r.freq ? String(r.freq) : "\u2014", bigMax: 34, bigColor: warn ? "#1d1300" : C.fg,
      bottom: k.msg || [tx ? "TX " + tx : "", r.znetTrim != null ? "trim " + r.znetTrim : ""].filter(Boolean).join(" \u00b7 "), bottomColor: warn ? "#3d2900" : C.dim });
  },
  /* ---- routing, pages, jams */
  page(st, k) {
    const i = +(k.settings.input || 15), label = IN_LABELS[i - 1] || `Input ${i}`;
    if (!st) return renderKey({ top: "INPUT PAGE", big: label.toUpperCase(), bigColor: C.dim, bigMax: 28, bottom: offline(k) });
    if (st.inputs === undefined) return renderKey({ top: "INPUT PAGE", big: label.toUpperCase(), bigColor: C.dim, bigMax: 28, bottom: OLD });
    const inp = st.inputs[i - 1] || {}, open = st.page === i;
    return renderKey({ bg: open ? C.page : C.bg, top: "INPUT PAGE", topColor: open ? "#dcebfb" : C.dim, big: label.toUpperCase(), bigMax: 28,
      bottom: k.msg || (!inp.pageKnown ? "Press it on the Aria" : inp.track || (open ? "Open" : "")), bottomColor: open ? "#dcebfb" : C.dim });
  },
  route(st, k) {
    const o = +(k.settings.out || 1), what = k.settings.what || "com1", r = routeInfo(st, o, what);
    const top = `\u2192 OUT ${o}` + (r.outName ? ` ${r.outName}` : "");
    if (!st) return renderKey({ top, big: r.label, bigColor: C.dim, bigMax: 28, bottom: offline(k) });
    if (st.outs === undefined) return renderKey({ top, big: r.label, bigColor: C.dim, bigMax: 28, bottom: OLD });
    if (r.bad) return renderKey({ top, big: r.label, bigColor: C.dim, bigMax: 28, bottom: r.bad });
    return renderKey({ bg: r.on ? C.route : C.bg, top, topColor: r.on ? "#d9fffb" : C.dim, big: r.label, bigMax: 28,
      bottom: k.msg || (r.on ? r.onText : "Off"), bottomColor: r.on ? "#d9fffb" : C.dim });
  },
  jam(st, k) {
    const mode = k.settings.mode || "tc", label = { tc: "TC", ub: "UB", date: "DATE", time: "TIME OF DAY" }[mode];
    if (!st) return renderKey({ top: "JAM", big: label, bigColor: C.dim, bigMax: 30, bottom: offline(k) });
    return renderKey({ top: "JAM", big: label, bigMax: 30, bigColor: st.recording ? C.dim : C.fg,
      bottom: k.msg || (st.recording ? "Not while rolling" : "Hold to jam"), progress: k.progress, progressColor: C.fg });
  },
  status(st, k) {
    if (!st) return renderKey({ top: "NOVA RELAY", big: "--:--:--", bigColor: C.dim, bigMax: 30, bottom: offline(k) });
    const rec = st.recording;
    return renderKey({ bg: rec ? C.recDark : C.bg, border: rec ? C.rec : null, top: rec ? "● REC " + mmss(st.elapsed) : st.recorder === "nova" ? "STOPPED" : "NO NOVA",
      /* Hours, minutes, seconds: frames can't be read at two updates a second, and leaving them out makes the time bigger. */
      topColor: rec ? "#ffb3b6" : st.recorder === "nova" ? C.dim : "#e0a030", big: (st.tc || "--:--:--").slice(0, 8), bigMax: 30,
      bottom: k.msg || (st.slate && st.slate !== "/" ? `Sc ${st.scene}  Tk ${st.take}` : ""), bottomColor: C.fg });
  },
};
/* Scene stepping, as on screen (leading zeros kept). */
function sceneParts(sc) { const m = String(sc || "").trim().toUpperCase().match(/^(.*?)(\d+)([A-Z]*)$/); return m ? { pre: m[1], digits: m[2], let: m[3] } : null; }
function sceneNextNumber(sc) { const p = sceneParts(sc); return p ? `${p.pre}${String(BigInt(p.digits) + 1n).padStart(p.digits.length, "0")}` : null; }
/* Nov 12 (Ferris): scene letters skip I and O (they read as 1 and 0 on a slate): H -> J, N -> P. */
const nextSceneLetter = c => { let n = String.fromCharCode(c.charCodeAt(0) + 1); if(n === "I" || n === "O") n = String.fromCharCode(n.charCodeAt(0) + 1); return n; };
function sceneNextLetter(sc) {
  const p = sceneParts(sc); if (!p) return null;
  if (!p.let) return `${p.pre}${p.digits}A`;
  const last = p.let.slice(-1), head = p.let.slice(0, -1);
  return `${p.pre}${p.digits}${last === "Z" ? p.let + "A" : head + nextSceneLetter(last)}`;
}
const noteText = (st, k) => (k.settings.kind || "preset") === "text" ? String(k.settings.text || "").trim().toUpperCase().slice(0, 40)
  : ((st && st.notePresets) ? st.notePresets[(+k.settings.preset || 1) - 1] || "" : `PRESET ${+k.settings.preset || 1}`);
const armSetTracks = k => [...new Set(String(k.settings.tracks || "").split(/[^0-9]+/).map(Number).filter(n => n >= 1 && n <= 16))].sort((a, b) => a - b);
function routeInfo(st, o, what) {
  const out = st && st.outs ? st.outs[o - 1] || {} : {}, outName = out.name || "";
  const fixed = { tone: "TONE", slate: "SLATE", com1: "COM 1", com2: "COM 2" };
  if (fixed[what]) return { label: fixed[what], on: !!out[what], onText: "On", outName };
  const m = what.match(/^(track|input)-(\d+)$/); if (!m) return { label: "?", bad: "Pick a source", outName };
  const n = +m[2], isTrack = m[1] === "track";
  const label = isTrack ? ((st && st.tracks && st.tracks[n - 1] && st.tracks[n - 1].name) || `TRACK ${n}`) : (IN_LABELS[n - 1] || `INPUT ${n}`).toUpperCase();
  if (isTrack && o < 5) return { label, bad: "Tracks: OUT 5\u20138", outName };
  if (!isTrack && o > 4) return { label, bad: "Inputs: OUT 1\u20134", outName };
  const sx = isTrack ? 30 + n - 1 : n - 1, r = (out.routes || []).find(x => x.sx === sx);
  return { label, on: !!r, onText: isTrack ? "On" : r && r.v === 1 ? "On \u00b7 PRE" : "On \u00b7 POST", outName };
}
/* A level bar: green to −12, yellow to −3, red above, with a peak mark that falls back slowly. */
function meterKey(top, name, db, k) {
  const pos = d => Math.max(0, Math.min(1, (d + 72) / 72));   /* −72 to 0 dBFS */
  const now = Date.now(), v = db == null ? -120 : db;
  if (k.peak == null || v >= k.peak || now - k.peakAt > 1500) { k.peak = v; k.peakAt = now; }
  const x0 = 14, w = 116, y = 60, hgt = 26;
  const seg = (a, b, c) => { const p1 = pos(a), p2 = Math.min(pos(v), pos(b)); return p2 > p1 ? `<rect x="${x0 + w * p1}" y="${y}" width="${w * (p2 - p1)}" height="${hgt}" fill="${c}"/>` : ""; };
  const pk = k.peak > -72 ? `<rect x="${x0 + w * pos(k.peak) - 2}" y="${y - 3}" width="4" height="${hgt + 6}" fill="${k.peak > -3 ? C.red : "#fff"}"/>` : "";
  const icon = `<rect x="${x0}" y="${y}" width="${w}" height="${hgt}" rx="3" fill="${C.panel}"/>` + seg(-72, -12, "#2fbf71") + seg(-12, -3, "#f2c230") + seg(-3, 0, C.red) + pk;
  return renderKey({ top: `${top} \u00b7 ${name}`, icon, bottom: v > -120 ? `${Math.round(v)} dB` : "\u2014", bottomColor: v > -3 ? C.red : C.dim });
}
/* Status keys (Nov 7): normal, amber (level 1) or red (level 2, blinking unless turned off). Lower is worse. */
const num = (v, d) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
const levelOf = (v, amber, red) => v <= red ? 2 : v <= amber ? 1 : 0;
const hm = sec => { const m = Math.floor(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`; };
const gb = v => v >= 1000 ? (v / 1000).toFixed(1) + " TB" : v >= 10 ? Math.round(v) + " GB" : v.toFixed(1) + " GB";
function levelKey(st, k, top, value, level, bottom) {
  if (!st) return renderKey({ top, big: "—", bigColor: C.dim, bottom: offline(k) });
  if (value == null) return renderKey({ top, big: "—", bigColor: C.dim, bottom: k.msg || (!("volts" in st) ? "Update Nova Relay" : st.recorder === "nova" ? "Waiting" : "No Nova") });
  const blinkOff = level === 2 && k.settings.blink !== false && Math.floor(Date.now() / 500) % 2 === 1;
  const bg = level === 2 ? (blinkOff ? C.recDark : C.red) : level === 1 ? C.amber : C.bg;
  const fg = level === 1 ? "#1d1300" : C.fg, sub = level === 1 ? "#3d2900" : level === 2 ? "#ffd9da" : C.dim;
  const word = level === 2 ? "LOW" : level === 1 ? "LOW" : "";
  return renderKey({ bg, top, topColor: sub, big: value, bigMax: 34, bigColor: fg,
    bottom: k.msg || (bottom == null ? word : bottom), bottomColor: sub });
}
/* Slate / Com: lit while the mic is on (from this key, another device or the Aria's own button). */
function talkKey(st, k, what, label, color) {
  if (!st) return renderKey({ icon: mic(C.line), big: label, bigColor: C.dim, bigY: 104, bigMax: 26, bottom: offline(k) });
  const on = !!st[what + "Mic"] || !!k.talking;
  const unknown = what === "com" && st.comKnown === false, old = st.slateMic === undefined;
  const hint = old ? "Update Nova Relay" : unknown ? "Learn in Setup" : (k.settings.mode === "latch" ? (on ? "Tap to stop" : "Tap to talk") : (on ? "On" : "Hold to talk"));
  return renderKey({ bg: on ? color : C.bg, icon: mic(on ? "#111" : unknown || old ? C.line : color), big: label, bigY: 98, bigMax: 26,
    bigColor: on ? "#111" : unknown || old ? C.dim : C.fg, bottom: k.msg || hint, bottomColor: on ? "#111" : C.dim });
}
const slate = st => st.scene || st.take ? `${st.scene || "\u2013"} / ${st.take || "\u2013"}` : "";
function offline(k) { return k.msg || (reach === "nosetup" ? "Open Nova Relay" : "No remote"); }

/* ------------------------------------------------------------------ Stream Deck link (WebSocket client) */
function wsConnect(port, handlers) {
  const key = crypto.randomBytes(16).toString("base64");
  const sock = net.connect(port, "127.0.0.1");
  let buf = Buffer.alloc(0), open = false, frags = [];
  const frame = (op, payload) => {
    const mask = crypto.randomBytes(4), n = payload.length;
    const head = n < 126 ? Buffer.from([0x80 | op, 0x80 | n])
      : n < 65536 ? Buffer.from([0x80 | op, 0x80 | 126, n >> 8, n & 255])
      : (() => { const b = Buffer.alloc(10); b[0] = 0x80 | op; b[1] = 0x80 | 127; b.writeBigUInt64BE(BigInt(n), 2); return b; })();
    const body = Buffer.from(payload); for (let i = 0; i < n; i++) body[i] ^= mask[i & 3];
    sock.write(Buffer.concat([head, mask, body]));
  };
  sock.on("connect", () => sock.write(`GET / HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
    `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`));
  sock.on("data", d => {
    buf = Buffer.concat([buf, d]);
    if (!open) {
      const i = buf.indexOf("\r\n\r\n"); if (i < 0) return;
      if (!/^HTTP\/1\.1 101/.test(buf.slice(0, i).toString())) { sock.destroy(); return; }
      buf = buf.slice(i + 4); open = true; handlers.open();
    }
    for (;;) {
      if (buf.length < 2) return;
      const fin = buf[0] & 0x80, op = buf[0] & 0x0f, masked = buf[1] & 0x80;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const mk = masked ? buf.slice(off, off + 4) : null; if (masked) off += 4;
      if (buf.length < off + len) return;
      const payload = Buffer.from(buf.slice(off, off + len)); buf = buf.slice(off + len);
      if (mk) for (let i = 0; i < payload.length; i++) payload[i] ^= mk[i & 3];
      if (op === 8) { try { frame(8, Buffer.alloc(0)); } catch (_) { } sock.end(); return; }
      if (op === 9) { frame(10, payload); continue; }
      if (op === 1 || op === 0) { frags.push(payload); if (fin) { const t = Buffer.concat(frags).toString("utf8"); frags = []; handlers.message(t); } }
    }
  });
  sock.on("close", () => handlers.close());
  sock.on("error", () => { });
  return { send: text => { if (open) frame(1, Buffer.from(text, "utf8")); } };
}

/* ------------------------------------------------------------------ plugin state */
const keys = new Map();   /* context -> {action, settings, img, msg, msgUntil, progress, holdTimer, fired, pi} */
let ws = null, globals = { address: "" };
let status = null, reach = "unknown", lastError = "", pollTimer = null, polling = false;
let meters = null;   /* /api/meters, read about 7 times a second while a Meter key is on screen */
const send = (event, context, payload, extra) => ws && ws.send(JSON.stringify({ event, context, ...(payload !== undefined ? { payload } : {}), ...(extra || {}) }));
const kind = action => String(action || "").slice(PLUGIN.length + 1);

function baseUrl() {
  let a = String(globals.address || "").trim();
  if (!a) return DEFAULT_ADDRESS;
  if (!/^https?:\/\//i.test(a)) a = "http://" + a;
  /* Nov 14: an address typed with its port keeps it, even :80 (the Nova Relay box), which URL() drops as the default. */
  const typed = /^https?:\/\/[^/]*:(\d+)/i.exec(a);
  try { const u = new URL(a); return `${u.protocol}//${u.hostname}:${u.port || (typed ? typed[1] : u.protocol === "https:" ? 443 : 8080)}`; } catch (_) { return a.replace(/\/+$/, ""); }
}
async function getJSON(p, ms = 1500) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(baseUrl() + p, { signal: ac.signal, cache: "no-store" });
    let j = null; try { j = await r.json(); } catch (_) { }
    if (!j) throw new Error(`HTTP ${r.status}`);
    j.httpStatus = r.status; return j;
  } finally { clearTimeout(t); }
}

/* Every half second while a key is on screen: one status read for all keys. */
async function poll() {
  pollTimer = null;
  if (!keys.size || polling) return;
  polling = true;
  try {
    const j = await getJSON("/api/status");
    if (j.httpStatus === 503) { status = null; reach = "nosetup"; lastError = j.error || ""; }
    else if (j.ok) { status = j; reach = "ok"; lastError = ""; }
    else { status = null; reach = "down"; lastError = j.error || "unexpected reply"; }
  } catch (e) { status = null; reach = "down"; lastError = e.name === "AbortError" ? "no answer" : e.message; }
  polling = false;
  drawAll(); tellPIs();
  if (keys.size) pollTimer = setTimeout(poll, reach === "ok" ? POLL_MS : POLL_SLOW_MS);
}
function pollSoon() { if (pollTimer) clearTimeout(pollTimer); pollTimer = setTimeout(poll, 0); }

function draw(ctx) {
  const k = keys.get(ctx); if (!k) return;
  if (k.msg && Date.now() > k.msgUntil) k.msg = "";
  if (k.controller === "Encoder") return drawDial(ctx, k);
  const fn = DRAW[kind(k.action)]; if (!fn) return;
  let svg; try { svg = fn(status, k); } catch (e) { svg = renderKey({ big: "?", bottom: "error" }); }
  if (svg === k.img) return;
  k.img = svg;
  send("setImage", ctx, { image: "data:image/svg+xml," + encodeURIComponent(svg), target: 0 });
}
function drawAll() { for (const ctx of keys.keys()) draw(ctx); }
/* Dials (Stream Deck +, Studio, + XL): the touch strip shows a title, a value and a bar ($B1 layout). */
function dialFeedback(st, k) {
  const what = kind(k.action);
  if (what === "trimdial" && k.settings.mode === "znet") {
    /* Nov 10: ZNet trim = the transmitter's gain, 0–52, for RX inputs (Nova Relay 0.4.22+). */
    const i = +(k.settings.input || 15), rx = i - 15, inp = st && st.inputs ? st.inputs[i - 1] || {} : {};
    const title = (IN_LABELS[i - 1] || `Input ${i}`) + (inp.track ? " \u00b7 " + inp.track : "");
    if (!st) return { title, value: reach === "nosetup" ? "Open Nova Relay" : "No remote", indicator: { value: 0 } };
    if (rx < 0 || rx > 7) return { title: "ZNET \u00b7 " + title, value: "RX only", indicator: { value: 0 } };
    const r = (st.receivers || [])[rx]; if (!r || !("znetFrom" in r)) return { title, value: OLD, indicator: { value: 0 } };
    const v = k.pending != null ? k.pending : r.znetTrim;
    return { title: "ZNET \u00b7 " + title, value: v == null ? "Set once" : String(v), indicator: { value: v == null ? 0 : Math.round(v / 52 * 100) } };
  }
  if (what === "trimdial") {
    const i = +(k.settings.input || 15), inp = st && st.inputs ? st.inputs[i - 1] || {} : {};
    const v = k.pending != null ? k.pending : inp.trim;
    const title = (IN_LABELS[i - 1] || `Input ${i}`) + (inp.track ? " \u00b7 " + inp.track : "");
    if (!st) return { title, value: reach === "nosetup" ? "Open Nova Relay" : "No remote", indicator: { value: 0 } };
    if (!st.inputs) return { title, value: OLD, indicator: { value: 0 } };
    return { title: "TRIM \u00b7 " + title, value: v == null ? "\u2014" : `${v > 0 ? "+" : ""}${v} dB`, indicator: { value: v == null ? 0 : Math.round((v + 20) / 50 * 100) } };
  }
  /* Nov 14 (Nova Relay 0.6.1): an input's Aria fader. The Nova never says where a fader is, so this shows where Nova Relay
     last put it ("Set once" until then); touching that fader on the Aria takes over. */
  if (what === "faderdial") {
    const i = +(k.settings.input || 15), inp = st && st.inputs ? st.inputs[i - 1] || {} : {};
    const title = "FADER \u00b7 " + (IN_LABELS[i - 1] || `Input ${i}`) + (inp.track ? " \u00b7 " + inp.track : "");
    if (!st) return { title, value: reach === "nosetup" ? "Open Nova Relay" : "No remote", indicator: { value: 0 } };
    if (!st.inputs || !("faderPos" in inp)) return { title, value: OLD, indicator: { value: 0 } };
    if (inp.fader == null) return { title, value: "No fader", indicator: { value: 0 } };
    const v = k.pending != null ? k.pending : inp.faderPos;
    return { title, value: v == null ? "Set once" : inp.faderDown && v === 0 && k.pending == null ? "DOWN" : Math.round(v / 2.55) + "%", indicator: { value: v == null ? 0 : Math.round(v / 2.55) } };
  }
  if (what === "hpdial") {
    if (!st) return { title: "HEADPHONES", value: reach === "nosetup" ? "Open Nova Relay" : "No remote", indicator: { value: 0 } };
    return { title: `HEADPHONES \u00b7 ${st.hp}`, value: st.hpName || `HP ${st.hp}`, indicator: { value: Math.round((st.hp - 1) / 11 * 100) } };
  }
  return null;
}
function drawDial(ctx, k) {
  const fb = dialFeedback(status, k); if (!fb) return;
  const key = JSON.stringify(fb); if (key === k.img) return; k.img = key;
  send("setFeedback", ctx, fb);
}
/* Meter keys: a faster loop just for levels. */
let meterTimer = null;
async function meterLoop() {
  meterTimer = null;
  const ctxs = [...keys].filter(([, k]) => kind(k.action) === "meter").map(([c]) => c);
  if (!ctxs.length) { meters = null; return; }
  try { const j = await getJSON("/api/meters", 800); meters = j.ok ? j : null; } catch (_) { meters = null; }
  for (const c of ctxs) draw(c);
  meterTimer = setTimeout(meterLoop, meters ? 140 : 1500);
}
function metersSoon() { if (!meterTimer) meterTimer = setTimeout(meterLoop, 0); }
function flash(ctx, msg, ms = 1500) {
  const k = keys.get(ctx); if (!k) return;
  k.msg = msg; k.msgUntil = Date.now() + ms; draw(ctx);
  setTimeout(() => draw(ctx), ms + 50);
}

/* Tell any open settings panel how the link to Nova Relay is doing. */
function connText() {
  const at = baseUrl();
  if (reach === "ok") return { ok: true, text: `Connected to Nova Relay${status.version ? " " + status.version : ""} at ${at}. ${status.recorder === "nova" ? "The Nova is connected." : "No Nova connected to it right now."}` };
  if (reach === "nosetup") return { ok: false, text: `Nova Relay is running at ${at} but hasn't been opened yet. Open it once on any device.` };
  if (reach === "unknown") return { ok: false, text: `Looking for Nova Relay at ${at}…` };
  return { ok: false, text: `Can't reach Nova Relay at ${at} (${lastError}). Is it running? If it's on another computer, type the address from Nova Relay › Setup › Stream Deck.` };
}
function tellPIs() {
  const c = connText();
  for (const [ctx, k] of keys) if (k.pi) send("sendToPropertyInspector", ctx, { type: "conn", ...c, address: globals.address || "", base: baseUrl() }, { action: k.action });
}

/* ------------------------------------------------------------------ pressing keys */
async function call(ctx, p, okMsg) {
  try {
    const j = await getJSON(p, 3000);
    if (j.ok === false) {
      send("showAlert", ctx);
      const e = j.error || "";
      flash(ctx, /Jams are locked/i.test(e) ? "Not while rolling" : /page button/i.test(e) ? "Press it on the Aria" : /preset is empty/i.test(e) ? "Empty preset" : /next scene/i.test(e) ? "Type the scene" : /locked/i.test(e) ? "Locked: recording" : /set from Nova Relay yet/i.test(e) ? "Set it once" : /already down/i.test(e) ? "Already down" : /Listen only/i.test(e) ? "Listen only" : /fader/i.test(e) ? "Press fader's page" : /No Nova/i.test(e) ? "No Nova" : /learned/i.test(e) ? "Learn in Setup" : /setup/i.test(e) ? "Open Nova Relay" : "Not done", 2500);
    } else if (okMsg) flash(ctx, okMsg, 1000);
    if (j.ok !== undefined && j.state) { status = j; reach = "ok"; drawAll(); }
  } catch (e) { send("showAlert", ctx); flash(ctx, "No remote", 2000); }
  pollSoon();
}
const HOLD_REC = 600, HOLD_STOP = 400, HOLD_TONE = 600;
/* Hold to act: the key fills along the bottom, and acts once the hold time is reached (like the on-screen buttons). */
function startHold(ctx, ms, act) {
  const k = keys.get(ctx); if (!k) return;
  const t0 = Date.now(); k.fired = false; k.progress = 0;
  clearInterval(k.holdTimer);
  k.holdTimer = setInterval(() => {
    const p = (Date.now() - t0) / ms;
    if (p >= 1) { clearInterval(k.holdTimer); k.holdTimer = null; k.progress = null; k.fired = true; draw(ctx); act(); return; }
    k.progress = p; draw(ctx);
  }, 50);
  draw(ctx);
}
function endHold(ctx, tooShort) {
  const k = keys.get(ctx); if (!k) return;
  if (k.holdTimer) { clearInterval(k.holdTimer); k.holdTimer = null; k.progress = null; if (!k.fired && tooShort) flash(ctx, tooShort); else draw(ctx); }
}

function keyDown(ctx) {
  const k = keys.get(ctx); if (!k) return;
  const s = k.settings || {}, what = kind(k.action);
  if (!status && what !== "status") { send("showAlert", ctx); flash(ctx, reach === "nosetup" ? "Open Nova Relay" : "No remote", 2000); pollSoon(); return; }
  switch (what) {
    case "rec":
      if (s.hold === false) return call(ctx, "/api/rec");
      return startHold(ctx, HOLD_REC, () => call(ctx, "/api/rec"));
    case "stop": {
      const mode = s.hold || "recording";
      if (mode === "always" || (mode === "recording" && status.recording)) return startHold(ctx, HOLD_STOP, () => call(ctx, "/api/stop"));
      return call(ctx, "/api/stop");
    }
    case "scream":
      if (!(status.scream && status.scream.rx && status.scream.rx.length)) { send("showAlert", ctx); flash(ctx, "Choose RX in Setup", 2500); return; }
      return call(ctx, "/api/scream");
    case "tone": {
      const mode = s.mode || "hold";
      if (mode === "on") return call(ctx, "/api/tone/on");
      if (mode === "off") return call(ctx, "/api/tone/off");
      if (mode === "toggle" || status.tone) return call(ctx, status.tone ? "/api/tone/off" : "/api/tone/on");
      return startHold(ctx, HOLD_TONE, () => call(ctx, "/api/tone/on"));
    }
    case "hp": return call(ctx, `/api/hp/${s.mode || "next"}`);
    case "arm": {
      const t = s.track || "1";
      return call(ctx, `/api/arm/${t}`);
    }
    case "pfl": return call(ctx, `/api/pfl/${s.fader || "1"}`);
    case "faderstep": {
      const i = +(s.input || 15), dir = s.dir === "down" ? "down" : "up", n = +(s.step || 4), inp = status.inputs && status.inputs[i - 1];
      if (inp && (inp.fader == null || inp.faderPos == null)) { send("showAlert", ctx); flash(ctx, inp.fader == null ? "No fader" : "Set it once", 2000); return; }
      const go = () => queue(ctx, () => call(ctx, `/api/fader/${i}/${dir}/${n}`));
      go(); clearInterval(k.repeatT); clearTimeout(k.repeatD);
      k.repeatD = setTimeout(() => { k.repeatT = setInterval(go, 160); }, 450);   /* hold to keep going */
      return;
    }
    case "slate": case "com": {
      if (what === "com" && status.comKnown === false) { send("showAlert", ctx); flash(ctx, "Learn in Setup", 2500); return; }
      if (s.mode === "latch") return queue(ctx, () => call(ctx, `/api/${what}`));
      k.talking = true; draw(ctx);
      return queue(ctx, () => call(ctx, `/api/${what}/down`));
    }
    case "scene": return call(ctx, `/api/scene/${s.mode || "number"}`);
    case "take": return call(ctx, `/api/take/${s.mode || "up"}`);
    case "note": return (s.kind || "preset") === "text"
      ? (String(s.text || "").trim() ? call(ctx, `/api/note/text/${encodeURIComponent(String(s.text).trim())}`) : flash(ctx, "Type the note", 2000))
      : call(ctx, `/api/note/${+s.preset || 1}`);
    case "armset": { const t = armSetTracks(k); return t.length ? call(ctx, `/api/arm/set/${t.join(",")}`) : flash(ctx, "Pick tracks", 2000); }
    case "page": return call(ctx, `/api/page/${+s.input || 15}`);
    case "route": { const w = s.what || "com1"; return call(ctx, `/api/route/${+s.out || 1}/${w}` + (/^input-/.test(w) && s.pre ? "/toggle/pre" : "")); }
    case "jam":
      if (status.recording) { send("showAlert", ctx); return flash(ctx, "Not while rolling", 2000); }
      return startHold(ctx, 600, () => call(ctx, `/api/jam/${s.mode || "tc"}`));
    case "status": return send("openUrl", undefined, { url: baseUrl() + "/" });
  }
}
/* Turning a dial: headphone presets step one per click; trim moves 1 dB per click, sent once the dial pauses. */
function dialTurn(ctx, ticks) {
  const k = keys.get(ctx); if (!k || !ticks) return;
  if (!status) { send("showAlert", ctx); return; }
  const what = kind(k.action);
  if (what === "hpdial") { const dir = ticks > 0 ? "next" : "prev"; for (let i = 0; i < Math.min(6, Math.abs(ticks)); i++) queue(ctx, () => call(ctx, `/api/hp/${dir}`)); return; }
  if (what === "faderdial") {
    const i = +(k.settings.input || 15), inp = status.inputs ? status.inputs[i - 1] : null;
    if (!inp || inp.fader == null) { send("showAlert", ctx); return; }
    const base = k.pending != null ? k.pending : inp.faderPos;
    if (base == null) { send("showAlert", ctx); return; }   /* unknown: never step from a guess (it could drop the fader) */
    k.pending = Math.max(0, Math.min(255, base + ticks * FADER_STEP)); draw(ctx);
    /* Live, like pushing a fader: at most one send every 80 ms while turning, and the last value once it stops. */
    clearTimeout(k.trimT);
    const fire = () => { k.lastSend = Date.now(); const v = k.pending; queue(ctx, () => call(ctx, `/api/fader/${i}/set/${v}`)).then(() => { if (k.pending === v) k.pending = null; draw(ctx); }); };
    if (Date.now() - (k.lastSend || 0) > 80) fire(); else k.trimT = setTimeout(fire, 80);
    return;
  }
  if (what !== "trimdial") return;
  if (k.settings.mode === "znet") {
    const i = +(k.settings.input || 15), rx = i - 15, r = (status.receivers || [])[rx];
    if (rx < 0 || rx > 7 || !r || !("znetFrom" in r)) { send("showAlert", ctx); return; }
    const base = k.pending != null ? k.pending : r.znetTrim;
    if (base == null) { send("showAlert", ctx); return; }   /* unknown: never step from a guess (it would drop the transmitter) */
    k.pending = Math.max(0, Math.min(52, base + ticks)); draw(ctx);
    clearTimeout(k.trimT);
    k.trimT = setTimeout(() => { const v = k.pending; queue(ctx, () => call(ctx, `/api/znet/${rx + 1}/set/${v}`)).then(() => { if (k.pending === v) k.pending = null; draw(ctx); }); }, 120);
    return;
  }
  const i = +(k.settings.input || 15), inp = status.inputs ? status.inputs[i - 1] : null;
  if (!inp) { send("showAlert", ctx); return; }
  const base = k.pending != null ? k.pending : (+inp.trim || 0);
  k.pending = Math.max(-20, Math.min(30, base + ticks)); draw(ctx);
  clearTimeout(k.trimT);
  k.trimT = setTimeout(() => { const v = k.pending; queue(ctx, () => call(ctx, `/api/trim/${i}/set/${v}`)).then(() => { if (k.pending === v) k.pending = null; draw(ctx); }); }, 120);
}
const FADER_STEP = 4;   /* fader dial: 4 of 255 per click, about 1.5% */
/* Down and up go out in order for each key, so a quick tap can't send "up" before "down". */
function queue(ctx, fn) { const k = keys.get(ctx); if (!k) return fn(); k.q = (k.q || Promise.resolve()).then(fn, fn); return k.q; }
function talkUp(ctx) {
  const k = keys.get(ctx); if (!k || !k.talking) return;
  const what = kind(k.action); k.talking = false; draw(ctx);
  queue(ctx, () => call(ctx, `/api/${what}/up`));
}
function keyUp(ctx) {
  const k = keys.get(ctx); if (!k) return;
  const what = kind(k.action);
  if (what === "rec") endHold(ctx, "Hold to record");
  else if (what === "stop") endHold(ctx, "Hold to stop");
  else if (what === "tone") endHold(ctx, "Hold for tone");
  else if (what === "jam") endHold(ctx, "Hold to jam");
  else if ((what === "slate" || what === "com") && (k.settings || {}).mode !== "latch") talkUp(ctx);
  else if (what === "faderstep") { clearTimeout(k.repeatD); clearInterval(k.repeatT); }
}
/* New Arm and PFL keys number themselves: the lowest track (or fader) not already on a Nova Relay key on screen on
   that Stream Deck. So a folder filled by dragging Arm track onto each key becomes tracks 1, 2, 3… */
function autoNumber(ctx) {
  const k = keys.get(ctx); if (!k) return;
  const what = kind(k.action);
  /* field, highest number, first number (input pages and trim dials start at RX 1) */
  const AUTO = { arm: ["track", 16, 1], pfl: ["fader", 8, 1], rx: ["rx", 8, 1], page: ["input", 22, 15], trimdial: ["input", 22, 15], faderdial: ["input", 22, 15], faderstep: ["input", 22, 15], note: ["preset", 10, 1] };
  const a = AUTO[what]; if (!a) return;
  const [field, max, first] = a;
  if (k.settings && k.settings[field] !== undefined) return;
  const used = new Set([...keys].filter(([c, o]) => c !== ctx && o.action === k.action && o.device === k.device).map(([, o]) => String((o.settings || {})[field] || "")));
  let n = first; for (let tries = 0; tries < max && used.has(String(n)); tries++) n = n % max + 1;
  k.settings = { ...(k.settings || {}), [field]: String(n) };
  send("setSettings", ctx, k.settings);
}

/* ------------------------------------------------------------------ events from Stream Deck */
function onEvent(m) {
  const ctx = m.context, p = m.payload || {};
  switch (m.event) {
    case "willAppear":
      keys.set(ctx, { action: m.action, device: m.device, controller: p.controller || "Keypad", settings: p.settings || {}, img: null, msg: "", msgUntil: 0, progress: null, holdTimer: null, fired: false, pi: false, talking: false });
      autoNumber(ctx); draw(ctx);
      if (kind(m.action) === "meter") metersSoon(); if (!pollTimer && !polling) pollSoon();
      break;
    case "willDisappear": { const k = keys.get(ctx); if (k) { clearInterval(k.holdTimer); clearTimeout(k.repeatD); clearInterval(k.repeatT); if (k.talking) talkUp(ctx); } keys.delete(ctx); break; }
    case "didReceiveSettings": { const k = keys.get(ctx); if (k) { k.settings = p.settings || {}; k.img = null; draw(ctx); } break; }
    case "keyDown": keyDown(ctx); break;
    case "keyUp": keyUp(ctx); break;
    case "didReceiveGlobalSettings": {
      const g = p.settings || {};
      if ((g.address || "") !== (globals.address || "")) { globals = { address: g.address || "" }; status = null; reach = "unknown"; drawAll(); pollSoon(); }
      break;
    }
    case "propertyInspectorDidAppear": { const k = keys.get(ctx); if (k) k.pi = true; tellPIs(); break; }
    case "propertyInspectorDidDisappear": { const k = keys.get(ctx); if (k) k.pi = false; break; }
    case "sendToPlugin": {
      const k = keys.get(ctx);
      if (p.type === "address") {
        globals = { address: String(p.address || "").trim() };
        send("setGlobalSettings", PLUGIN_CONTEXT, { ...globals });
        status = null; reach = "unknown"; drawAll(); tellPIs(); pollSoon();
      } else if (p.type === "settings" && k) { k.settings = p.settings || {}; k.img = null; draw(ctx); }
      else if (p.type === "test") { pollSoon(); }
      else if (p.type === "hello" && k) { k.pi = true; tellPIs(); }
      break;
    }
    case "dialRotate": dialTurn(ctx, p.ticks || 0); break;
    case "dialDown": case "touchTap": { const k = keys.get(ctx); if (!k) break;
      if (kind(k.action) === "faderdial") { if (!status) { send("showAlert", ctx); break; } clearTimeout(k.trimT); k.pending = null; queue(ctx, () => call(ctx, `/api/fader/${+(k.settings.input || 15)}/toggle`)); break; }
      if (kind(k.action) === "trimdial") { k.img = null; draw(ctx); } break; }
    case "systemDidWakeUp": pollSoon(); break;
  }
}

/* Red status keys blink: redraw the status keys twice a second (an image is only sent when it changes). */
const LEVEL_KEYS = new Set(["drive", "battery", "primary", "mirror"]);
setInterval(() => { for (const [ctx, k] of keys) if (LEVEL_KEYS.has(kind(k.action))) draw(ctx); }, 500).unref();

/* ------------------------------------------------------------------ start */
let PLUGIN_CONTEXT = "";
if (require.main === module) {
  const arg = n => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
  const port = +arg("-port"); PLUGIN_CONTEXT = arg("-pluginUUID"); const registerEvent = arg("-registerEvent");
  if (!port || !PLUGIN_CONTEXT || !registerEvent) { console.error("Nova Relay plugin: start it from the Stream Deck app."); process.exit(1); }
  ws = wsConnect(port, {
    open() { ws.send(JSON.stringify({ event: registerEvent, uuid: PLUGIN_CONTEXT })); ws.send(JSON.stringify({ event: "getGlobalSettings", context: PLUGIN_CONTEXT })); },
    message(t) { let m; try { m = JSON.parse(t); } catch (_) { return; } try { onEvent(m); } catch (e) { send("logMessage", undefined, { message: "Nova Relay plugin: " + e.message }); } },
    close() { process.exit(0); },
  });
} else module.exports = { renderKey, DRAW, C, setStatus: (s, r) => { status = s; reach = r || (s ? "ok" : "down"); },
  /* Nov 14: Nova Relay on Linux / the Pi box runs this same key code for a Stream Deck plugged into it, standing in for
     the Stream Deck app (nova-remote/deck/host.js): it gets the plugin's messages and sends it the app's events. */
  host(sendText) { ws = { send: sendText }; return onEvent; } };
