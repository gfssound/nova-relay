#!/usr/bin/env node
/*
 * Nova Relay — cart server
 *
 * Runs on the cart computer (Mac, Windows or Linux). It:
 *   - serves the Nova Relay page to this computer and to any phone/iPad on the same network
 *   - keeps one shared copy of the remote's settings, so every device stays in sync
 *   - talks to the Nova over its serial port (through the Aria-8): loads its setup, shows its meters,
 *     timecode and takes, and sends setting changes in the formats NovaTouch uses
 *   - runs a simulated recorder whenever no Nova is connected
 *   - saves the raw serial traffic of every session to a capture file
 *
 * No add-on packages are required. If the optional "serialport" package is installed
 * (npm install), it is used for serial; otherwise the computer's own tools are used.
 */
"use strict";
/* Updates (Nov 18): a newer version installed from Setup › Updates lives in the data folder; the app's own copy starts
   it instead of itself (update.js launch(): only when it's newer than this copy, and not after 3 failed starts). */
if (!process.env.NOVA_UPDATE_RUNNING) {
  let entry = null; try { entry = require("./update.js").launch(__dirname, process.argv); } catch (_) { }
  process.env.NOVA_UPDATE_BUNDLED = __dirname;
  if (entry) { process.env.NOVA_UPDATE_RUNNING = "1"; require(entry); return; }
}
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFile, spawn } = require("child_process");
const tty = require("tty");
const NOVA = require("./nova");
const SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, "schema.json"), "utf8"));
const BY_ID = new Map(SCHEMA.map(s => [s.id, s]));
const BY_KEY = new Map(SCHEMA.map(s => [s.k, s]));

const VERSION = "0.6.5";
const args = process.argv.slice(2);
const argVal = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const PORT = +(process.env.PORT || argVal("--port", 8080));
const OPEN_BROWSER = !args.includes("--no-open");
/* --exit-with <pid> (Nov 11): the Mac app starts the server hidden and passes its own process number, so the server
   stops by itself within 2 s of the app quitting (or crashing), and never keeps the port busy with no window. */
const EXIT_WITH = +argVal("--exit-with", 0);
if (EXIT_WITH > 0) setInterval(() => { try { process.kill(EXIT_WITH, 0); } catch (e) { if (e.code === "ESRCH") { console.log("Nova Relay app closed; stopping."); process.exit(0); } } }, 2000).unref();
const PUBLIC = path.join(__dirname, "public");
const DATA = process.env.NOVA_REMOTE_DATA || argVal("--data", path.join(os.homedir(), ".nova-remote"));
fs.mkdirSync(DATA, { recursive: true });
/* --local: the Linux desktop app and AppImage. Its own window always works; phones and iPads can connect only when
   "Let phones and iPads connect" is on (Setup › Cart & Recorder Link, Nov 2). The choice is kept in desktop.json.
   While it's off the server listens on 127.0.0.1 only, so nothing on the network can reach it. */
const DESKTOP = args.includes("--local");
const DESKTOP_FILE = path.join(DATA, "desktop.json");
/* --set-clock (Nov 14, 0.6.1): the Pi box only. A Pi has no battery clock, so on the cart (no internet) it starts at the
   last time it saved and capture names and the sound report get the wrong date. When a phone, iPad or laptop connects
   it sends its own time; if the box isn't synced to the internet and is more than 2 minutes off, the box sets its clock
   from it, through a small root helper the installer adds (/usr/local/sbin/nova-set-clock, allowed for user nova in
   sudoers). Never on a Mac or a desktop: those keep their own clock. */
const SET_CLOCK = args.includes("--set-clock") && process.platform === "linux";
/* Nov 15 (Ferris: the Pi on a power bank made the Nova's cable echo and the Nova freeze; on a better supply "Relay connected
   just fine"): watch the Raspberry Pi's power. `vcgencmd get_throttled` (Raspberry Pi OS): bit 0 = under-voltage now,
   bit 16 = under-voltage since boot. Only where vcgencmd exists (a Pi); NOVA_VCGENCMD overrides the path (tests). */
const VCGEN = process.env.NOVA_VCGENCMD || (process.platform === "linux" ? ["/usr/bin/vcgencmd", "/opt/vc/bin/vcgencmd"].find(f => { try { fs.accessSync(f, fs.constants.X_OK); return true; } catch (_) { return false; } }) : null);
const POWER_HINT = (SET_CLOCK || VCGEN) ? ": on the Nova Relay box this is usually its power supply (a Pi 5 needs the 5 V 5 A supply; a weak power bank can do this)" : "";
const power = { known: false, under: false, since: false };
const CLOCK_FLOOR = Date.UTC(2026, 10, 1);   /* reject device times before Nov 1, 2026 (a device with a dead clock) */
let clockSetAt = 0;
/* Nov 14 (0.6.1): faders are built but held back from this release (Ferris). true = /api/fader and fader moves from the
   meters work; false = refused with "not in this version yet". The shipped page has no fader caps either (make_local). */
const FADERS = false;
function clockFromClient(ms, who) {
  if (!SET_CLOCK || !isFinite(ms)) return;
  const diff = ms - Date.now();
  if (Math.abs(diff) < 120000 || ms < CLOCK_FLOOR || Date.now() - clockSetAt < 10 * 60000) return;
  execFile("timedatectl", ["show", "-p", "NTPSynchronized", "--value"], (e, out) => {
    if (!e && String(out).trim() === "yes") return;   /* synced to the internet: leave it alone */
    const sec = Math.round(ms / 1000);
    execFile("sudo", ["-n", "/usr/local/sbin/nova-set-clock", String(sec)], (err, o, se) => {
      if (err) { logAll("er", `Couldn't set the box's clock from ${who} (${String(se || err.message).trim().split("\n")[0]}). Re-run install-pi.sh on the box to add the clock helper.`); return; }
      clockSetAt = Date.now();
      logAll("ev", `Set the box's clock from ${who}: ${new Date(sec * 1000).toString()} (it was ${Math.round(Math.abs(diff) / 60000)} min ${diff > 0 ? "behind" : "ahead"}).`);
    });
  });
}
let shareNet = false;
if (DESKTOP) try { shareNet = !!JSON.parse(fs.readFileSync(DESKTOP_FILE, "utf8")).network; } catch (_) { /* first run: off */ }
const localOnly = () => DESKTOP && !shareNet;
const isLoopback = a => a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1";
const STATE_FILE = path.join(DATA, "state.json");

/* ---------------------------------------------------------------- shared state */
const DEVICE_KEYS = new Set(["ui.recfile", "timecode.generator.tc", "timecode.reader.tc", "battery.status", "drive.time.remaining", "drive.time.elapsed", "status.text"]);
let V = null;
/* Nov 2 (Ferris): shipped versions keep no example or test data. A setup saved before 0.4.14 started from the old
   example cart setup (names, routing, colors, takes, receiver values), so it's moved aside once, kept as a backup,
   and the remote starts blank; names, routing and the rest come from the Nova when it connects. */
const verNum = v => String(v || "0").split(".").reduce((a, x) => a * 1000 + (+x || 0), 0);
try {
  const saved = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  if (saved && saved.V && verNum(saved.version) >= verNum("0.4.14")) V = saved.V;
  else if (saved && saved.V) {
    const bak = path.join(DATA, `state-before-0.4.14-${Date.now()}.json`);
    try { fs.renameSync(STATE_FILE, bak); console.log(`Started fresh (no example data). The old setup is kept in ${bak}`); } catch (_) { }
  }
} catch (_) { /* first run */ }

let saveT = null;
function saveSoon() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    if (!V) return;
    const out = {};
    for (const k in V) if (!DEVICE_KEYS.has(k)) out[k] = V[k];
    const tmp = STATE_FILE + ".tmp";
    fs.writeFile(tmp, JSON.stringify({ app: "nova-remote", version: VERSION, saved: new Date().toISOString(), V: out }), err => {
      if (err) return console.error("Could not save settings:", err.message);
      fs.rename(tmp, STATE_FILE, e => { if (e) console.error("Could not save settings:", e.message); });
    });
  }, 800);
}
const get = (k, idx = []) => { let a = V ? V[k] : undefined; for (const i of idx) { if (a == null) return undefined; a = a[i]; } return a; };
/* Page number that opens input ch on the Nova (learned with the page finder). */
const trimDims = n => n < 22 ? 22 : 32;
const confFor = ch => { for (const n in savedConf) if (savedConf[n] === ch) return +n; return null; };
function setRaw(k, idx, val) {
  if (!V) return;
  if (!idx.length) { V[k] = val; return; }
  if (!Array.isArray(V[k])) V[k] = [];
  let a = V[k];
  for (let j = 0; j < idx.length - 1; j++) { if (!Array.isArray(a[idx[j]])) a[idx[j]] = []; a = a[idx[j]]; }
  a[idx[idx.length - 1]] = val;
}
/* A change made by the cart itself (the simulator), sent to every device. */
function setV(k, idx, val) { setRaw(k, idx, val); if (!DEVICE_KEYS.has(k)) saveSoon(); broadcast({ t: "set", k, idx, val }); }

/* ---------------------------------------------------------------- simulated recorder */
const FPS = [{ n: 24, r: 24000 / 1001 }, { n: 24, r: 24 }, { n: 25, r: 25 }, { n: 30, r: 30000 / 1001 }, { n: 30, r: 30000 / 1001, df: true }, { n: 30, r: 30 }, { n: 30, r: 30, df: true }];
function framesToTC(f, fr) {
  f = Math.floor(f); const n = fr.n;
  if (fr.df) { const D = Math.floor(f / 17982), M = f % 17982; f += 18 * D + 2 * Math.floor(Math.max(0, M - 2) / 1798); }
  const ff = f % n, ss = Math.floor(f / n) % 60, mm = Math.floor(f / (n * 60)) % 60, hh = Math.floor(f / (n * 3600)) % 24;
  const p = x => String(x).padStart(2, "0");
  return `${p(hh)}:${p(mm)}:${p(ss)}${fr.df ? ";" : ":"}${p(ff)}`;
}
/* Timecode -> frame count, the inverse of framesToTC: frames are counted at the nominal rate (24/25/30),
   and drop-frame skips frames 0 and 1 at the start of every minute except each tenth. */
function tcToFrames(tc, fr) {
  const mins = tc.h * 60 + tc.m;
  let f = (mins * 60 + tc.s) * fr.n + tc.f;
  if (fr.df) f -= 2 * (mins - Math.floor(mins / 10));
  return f;
}
const fmtDur = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`; };

const sim = {
  state: "STOPPED", genFrames: 0, elapsed: 0, recStartFrames: 0,
  inDb: new Array(22).fill(-90), talk: Array.from({ length: 22 }, () => ({ on: false, until: 0, base: -60, syl: 0 })),
  drive: 7.6 * 3600, volts: 14.6,
  fr() { return FPS[get("timecode.framerate")] || FPS[0]; },
  init() { const d = new Date(); this.genFrames = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * this.fr().r; },
  nextTakeGuess() {
    if (get("scene.next") && get("scene.next") !== get("scene.current")) return "1";
    const t = get("take.current"), m = String(t || "").match(/^(\d+)/); return m ? String(+m[1] + 1) : (t || "1");
  },
  applyNext() {
    const tk = get("take.next") || this.nextTakeGuess();
    if (get("scene.next")) { setV("scene.current", [], get("scene.next")); setV("scene.next", [], ""); }
    setV("take.current", [], tk); setV("take.next", [], "");
    setV("note.current", [], get("note.next") || ""); setV("note.next", [], "");
  },
  finishTake() {
    const segs = (get("metadata.history") || []).filter(Boolean).map(r => +r.seg || 0);
    const row = { seg: 1 + Math.max(0, ...segs), scene: get("scene.current"), take: get("take.current"), note: get("note.current"),
      start: framesToTC(this.recStartFrames, this.fr()), startFrames: this.recStartFrames, dur: this.elapsed,
      tracks: (get("record.tracks") || []).slice(0, 16).filter(Boolean).length };
    const hist = (get("metadata.history") || []).slice(); hist.unshift(row); hist.length = 10;
    setV("metadata.history", [], hist);
    logAll("rx", `UPD  58 METADATA_HISTORY  +${row.scene}/${row.take} ${fmtDur(row.dur)}`);
  },
  command(name) {
    if (!V) return;
    const tcNow = framesToTC(this.genFrames, this.fr());
    if (name === "RECORD" && this.state !== "RECORDING") {
      this.applyNext();
      this.state = "RECORDING"; this.elapsed = 0; this.recStartFrames = this.genFrames;
      logAll("rx", `EVT TRANSPORT RECORDING  start ${tcNow}  scene ${get("scene.current")} take ${get("take.current")}`);
    } else if (name === "STOP") {
      if (this.state === "RECORDING") this.finishTake();
      this.state = "STOPPED"; this.elapsed = 0;
      logAll("rx", `EVT TRANSPORT STOPPED  ${tcNow}`);
    } else if (/^JAM/.test(name)) {
      if (name === "JAM TIME") { const d = new Date(); this.genFrames = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * this.fr().r; }
      else if (name === "JAM TC" || name === "JAM") this.genFrames = 0;
      logAll("rx", `EVT ${name}  ${tcNow}`);
    } else if (/^HP SOLO/.test(name)) {
      logAll("rx", `EVT ${name}`);
    } else if (/^PFL \d+$/.test(name)) {
      const ch = +name.slice(4) - 1;
      if (nova.faderOf(ch) == null) return;
      if (nova.solo.has(ch)) nova.solo.delete(ch); else nova.solo.add(ch);
      logAll("rx", `EVT PFL ${inName(ch)} ${nova.solo.has(ch) ? "on" : "off"}`);
      broadcast({ t: "nova", nova: nova.status() });
    }
    sendLive(true);
  },
  tick(dt, tMs) {
    this.genFrames += dt * this.fr().r;
    if (this.state !== "STOPPED") this.elapsed += dt;
    if (this.state === "RECORDING") {
      const armed = (get("record.tracks") || []).slice(0, 16).filter(Boolean).length || 1;
      this.drive = Math.max(0, this.drive - dt * armed / 12);
    }
    this.volts = Math.max(11.2, this.volts - dt * 0.00002);
    for (let i = 0; i < 22; i++) {
      const st = this.talk[i], src = SIM_ACTIVITY[i] ?? 0;   /* Nov 2: inputs have no names, so a fixed example (as in the prototype) */
      let db;
      if (src === 0) db = -88 + Math.random() * 4;
      else {
        if (tMs > st.until) { st.on = Math.random() < (st.on ? 0.35 : 0.45); st.until = tMs + (st.on ? 900 + Math.random() * 2600 : 600 + Math.random() * 2400); st.base = -26 + Math.random() * 12; }
        st.syl += dt * (5 + Math.random() * 3);
        const room = src === 2 ? -44 : -58;
        db = st.on ? st.base + 9 * Math.abs(Math.sin(st.syl * Math.PI)) - 6 + Math.random() * 4 : room + Math.random() * 5;
      }
      db += (get("input.trim.level", [i]) || 0) * 0.6;
      this.inDb[i] = Math.min(0, db);
    }
  }
};
sim.init();
/* No Nova: nothing is simulated (Nov 2). Meters sit at the floor, drive and battery are unknown, and the page shows
   dashes for timecode. */
const IDLE_IN = Array(22).fill(-120);
const liveMsg = () => nova.connected
  ? { t: "live", state: nova.state, genFrames: sim.genFrames, elapsed: nova.elapsed, inDb: nova.inp, drive: nova.drive, volts: nova.volts,
      nova: { trk: nova.trk, out: nova.out } }
  : { t: "live", state: "STOPPED", genFrames: sim.genFrames, elapsed: 0, inDb: IDLE_IN, drive: null, volts: null, idle: true };
let lastLive = 0;
function sendLive(force) {
  const now = Date.now();
  if (!force && now - lastLive < 60) return;
  lastLive = now;
  const msg = JSON.stringify(liveMsg());
  for (const c of clients) if (c.ready && c.socket.writableLength < 512 * 1024) sendText(c, msg);
}
/* Link timing runs on the monotonic clock so setting the wall clock (the Pi box, --set-clock) can't fake a dropout. */
let lastTick = performance.now();
setInterval(() => {
  const now = performance.now(), dt = Math.min(0.2, (now - lastTick) / 1000); lastTick = now;
  if (nova.connected) { sim.genFrames += dt * sim.fr().r; if (nova.state === "RECORDING") nova.elapsed += dt; }
  else sim.genFrames += dt * sim.fr().r;   /* no simulated levels or takes without a Nova */
  nova.watch(now);
  sendLive(false);
}, 30);

/* ---------------------------------------------------------------- serial port */
let SerialPortLib = null;
try { SerialPortLib = require("serialport"); } catch (_) { /* optional */ }
const serial = { status: "closed", path: null, baud: null, error: null, capture: null, bytes: 0, via: SerialPortLib ? "serialport" : "system" };
let serialHandle = null, rxBuf = [], rxStart = 0, rxT = null, captureStream = null;

function listPorts() {
  return new Promise(resolve => {
    if (SerialPortLib) {
      SerialPortLib.SerialPort.list().then(l => resolve(l.map(p => ({ path: p.path, label: [p.path, p.manufacturer, p.friendlyName].filter(Boolean).join(" · ") }))), () => resolve([]));
      return;
    }
    if (process.platform === "win32") {
      execFile("powershell", ["-NoProfile", "-Command", "[System.IO.Ports.SerialPort]::GetPortNames() -join \"`n\""], { windowsHide: true }, (err, out) => {
        resolve(err ? [] : out.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(p => ({ path: p, label: p })));
      });
      return;
    }
    fs.readdir("/dev", (err, names) => {
      if (err) return resolve([]);
      const pick = process.platform === "darwin"
        ? names.filter(n => n.startsWith("cu.") && !/Bluetooth-Incoming-Port|debug-console/i.test(n))
        : names.filter(n => /^(ttyUSB|ttyACM|rfcomm|ttyAMA|ttyS[0-3]$)/.test(n));
      resolve(pick.sort().map(n => ({ path: "/dev/" + n, label: "/dev/" + n })));
    });
  });
}
const hex2 = b => b.toString(16).toUpperCase().padStart(2, "0");
const asText = bytes => bytes.map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : "·").join("");
function flushRx() {
  if (!rxBuf.length) return;
  for (let i = 0; i < rxBuf.length; i += 32) {
    const chunk = rxBuf.slice(i, i + 32);
    const line = `${chunk.map(hex2).join(" ")}   |${asText(chunk)}|`;
    if (!nova.connected) logAll("raw", line);
    if (captureStream) captureStream.write(`${new Date().toISOString()}  RAW ${line}\n`);
  }
  rxBuf = [];
}
/* Bytes that arrive within 25 ms of each other are grouped, which usually lines up with one message. */
/* How long ago a serial port appeared (its device file's change time), in ms; -1 when that can't be told (Windows). */
function portAge(p) {
  if (!p || process.platform === "win32") return -1;
  try { const t = fs.statSync(p).ctimeMs; return t ? Math.max(0, Date.now() - t) : -1; } catch (_) { return -1; }
}
function onSerialData(buf) {
  const now = Date.now();
  if (rxBuf.length && now - rxStart > 25) flushRx();
  if (!rxBuf.length) rxStart = now;
  for (const b of buf) rxBuf.push(b);
  serial.bytes += buf.length;
  const bad0 = nova.parser.bad;
  nova.parser.push(buf);
  nova.noise(nova.parser.bad - bad0);
  clearTimeout(rxT); rxT = setTimeout(() => { flushRx(); broadcast({ t: "serial", serial }); }, 30);
}
let lastSerialErr = { msg: "", at: 0 };
function serialFailed(msg) {
  serial.status = "error"; serial.error = msg; serialHandle = null; nova.stop();
  if (captureStream) { captureStream.end(); captureStream = null; }
  broadcast({ t: "serial", serial });
  /* While auto-connect is retrying, say the same thing at most once a minute. */
  const now = Date.now();
  if (!(typeof auto !== "undefined" && auto.trying && lastSerialErr.msg === msg && now - lastSerialErr.at < 60000)) { logAll("er", `Serial: ${msg}`); lastSerialErr = { msg, at: now }; }
}
function closeSerial(quiet) {
  flushRx();
  const h = serialHandle; serialHandle = null; nova.stop();
  try { if (h) h.close(); } catch (_) { }
  if (captureStream) { captureStream.end(); captureStream = null; }
  if (!quiet) { serial.status = "closed"; serial.error = null; broadcast({ t: "serial", serial }); logAll("ev", "Serial port closed"); }
}
function runCmd(cmd, cmdArgs) {
  return new Promise((resolve, reject) => execFile(cmd, cmdArgs, { windowsHide: true, shell: process.platform === "win32" },
    (err, _o, e) => err ? reject(new Error((e || err.message).toString().trim())) : resolve()));
}
async function openSerial(p, baud, parity) {
  nova.aria = "";   /* Nov 10: set again only if an Aria identifies itself on this link */
  closeSerial(true);
  baud = Number(baud) || 38400;
  parity = ["none", "odd", "even"].includes(parity) ? parity : "odd";
  const frame = `8${parity[0].toUpperCase()}1`;
  Object.assign(serial, { status: "opening", path: p, baud, parity, error: null, bytes: 0 });
  broadcast({ t: "serial", serial });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  serial.capture = path.join(DATA, `serial-capture-${stamp}.log`);
  try {
    if (SerialPortLib) {
      await new Promise((resolve, reject) => {
        const sp = new SerialPortLib.SerialPort({ path: p, baudRate: baud, dataBits: 8, parity, stopBits: 1, autoOpen: false });
        sp.open(err => err ? reject(err) : resolve());
        sp.on("data", onSerialData);
        sp.on("error", e => serialFailed(e.message));
        sp.on("close", () => { if (serialHandle && serialHandle.sp === sp) serialFailed("The port closed (cable unplugged or Bluetooth dropped)."); });
        serialHandle = { sp, close: () => sp.close(), write: b => sp.write(b) };
      });
    } else if (process.platform === "win32") {
      const name = p.replace(/^\\\\\.\\/, "");
      await runCmd("mode", [`${name}:`, `BAUD=${baud}`, `PARITY=${parity[0]}`, "DATA=8", "STOP=1", "to=off", "xon=off", "odsr=off", "octs=off", "dtr=on", "rts=on", "idsr=off"]);
      const fd = fs.openSync(`\\\\.\\${name}`, "r+");
      const rs = fs.createReadStream(null, { fd, autoClose: false, highWaterMark: 4096 });
      rs.on("data", onSerialData); rs.on("error", e => serialFailed(e.message));
      serialHandle = { close: () => { rs.destroy(); try { fs.closeSync(fd); } catch (_) { } }, write: b => fs.write(fd, b, () => { }) };
    } else {
      /* Keep our own descriptor open first: on macOS, port settings reset when the last descriptor closes. */
      const fd = fs.openSync(p, fs.constants.O_RDWR | fs.constants.O_NOCTTY);
      const flag = process.platform === "darwin" ? "-f" : "-F";
      try {
        await runCmd("stty", [flag, p, String(baud), "raw", "-echo", "cs8", "-cstopb", ...(parity === "none" ? ["-parenb"] : ["parenb", parity === "odd" ? "parodd" : "-parodd"]), "clocal", "-crtscts"]);
      } catch (e) {
        /* stty reports this when the driver accepted most settings but not all (virtual ports ignore parity). Carry on, but say so. */
        if (!/unable to perform all requested operations/i.test(e.message)) throw e;
        logAll("er", `The port didn't accept every setting (${frame} at ${baud}). If the data looks wrong, try another baud rate or parity.`);
      }
      /* Read through a non-blocking tty stream: a plain file stream would park a worker thread in read() on a
         quiet port, which never wakes up and can stall the whole app (and its exit). Closing the stream closes the fd. */
      const rs = new tty.ReadStream(fd);
      rs.on("data", onSerialData); rs.on("error", e => serialFailed(e.message));
      rs.on("close", () => { if (serialHandle && serialHandle.rs === rs) serialFailed("The port closed (cable unplugged?)."); });
      serialHandle = { rs, close: () => { try { rs.destroy(); } catch (_) { } }, write: b => fs.write(fd, b, () => { }) };
    }
    captureStream = fs.createWriteStream(serial.capture, { flags: "a" });
    captureStream.write(`# Nova Relay ${VERSION} serial capture\n# Port ${p} at ${baud} baud (${frame}), opened ${new Date().toString()}\n`);
    serial.status = "open";
    broadcast({ t: "serial", serial });
    logAll("ev", `Serial port ${p} open at ${baud} baud ${frame}. Raw bytes are saved to ${serial.capture}`);
    nova.start();
  } catch (e) {
    let msg = e.message || String(e);
    if (/busy|access|denied|EBUSY|EACCES/i.test(msg)) msg += " — the port may be open in another program (for example NovaTouch or the Serial Monitor).";
    serialFailed(msg);
  }
}

/* ---------------------------------------------------------------- Nova link
   Once the serial port is open, the cart says hello to the Nova about once a second (as NovaTouch does).
   The Nova answers with its whole setup and then streams meters, timecode and take changes for as long
   as the hellos continue. Setting changes made on any device are sent to the Nova in the same format
   NovaTouch uses. Record and stop stay on the Aria and the Nova; the remote shows their state. */
const HELLO_OWN = `PCnovaRemote-${VERSION}#01.01`;
const HELLO_COMPAT = "PCnovaT-0.92.03#01.01";
/* Nov 14 (Ferris: "every new version brings back the demo mode even if I enter the unlock code"): a client's hello is
   "PC" + "nova" + ONE LETTER for the kind of client + "-" + version (Zaxcom's slave.lua): T = tablet/PC remote (NovaTouch,
   and Zaxcom's own NovaRemote app sends PCnovaT-0.92.11), O = Oasis software. Our own "PCnovaRemote-…" puts an "R" there,
   a kind the Nova doesn't know, so on the direct cable it gets only the ~10-minute demo even with the Touch code, which
   licenses T clients. So every session starts with the T hello (the Nova still checks its own licence: a Nova without
   the Touch code still goes to demo). Nova Relay's own hello is only a last resort after 30 s of silence. The old rule
   started from the saved hello, and after an update a saved older-version own hello never fell back to T. */
const HELLO_FILE = path.join(DATA, "nova-link.json");
const HIST_EDITS_FILE = path.join(DATA, "history-edits.json");
let historyEdits = {};
try { historyEdits = JSON.parse(fs.readFileSync(HIST_EDITS_FILE, "utf8")) || {}; } catch (_) { }
/* Nov 7 (Ferris): what the Nova reports at each REC (settings 161 and 162): its folder, the file (segment) number,
   start timecode, user bits and frame rate. Kept per folder and file so the take list and the sound report still
   have them after Nova Relay restarts. The Nova's take list itself only carries scene, take and note. */
const TAKES_FILE = path.join(DATA, "take-files.json");
let takeFiles = {};
try { takeFiles = JSON.parse(fs.readFileSync(TAKES_FILE, "utf8")) || {}; } catch (_) { }
let takeFilesT = null;
function saveTakeFiles() { clearTimeout(takeFilesT); takeFilesT = setTimeout(() => {
  const keys = Object.keys(takeFiles); if (keys.length > 3000) for (const k of keys.slice(0, keys.length - 3000)) delete takeFiles[k];
  try { fs.writeFileSync(TAKES_FILE, JSON.stringify(takeFiles)); } catch (e) { logAll("ev", "Couldn't save take file details: " + e.message); } }, 500); }
const takeKey = (folder, serial) => `${folder || ""}|${serial}`;
function saveHistoryEdits() { try { fs.writeFileSync(HIST_EDITS_FILE, JSON.stringify(historyEdits, null, 1)); } catch (e) { logAll("ev", "Couldn't save take history edits: " + e.message); } }
/* Nov 15: which hello a session starts with: "touch" (PCnovaT-0.92.03, the default: the Nova's Touch licence covers it) or
   "own" (PCnovaRemote-…, gets the Nova's demo limit on the direct cable). The afternoon's freezes were the Pi's power
   supply, not the hello (Ferris, 22:29: on a better supply it connects; with our own hello "Demo mode still appears"). */
let helloMode = "touch", helloChosen = false;
let savedHello = null, savedPort = null, savedModel = "", savedPages = {}, savedConf = {}, savedButtons = {};
/* Nov 13 (Ferris: PFL showing on the wrong track and flipping): two inputs could both claim one Aria page button (the
   old one was never forgotten when another input was learned onto that fader). Any button claimed twice in a saved
   file is forgotten here and is learned again the next time it's pressed on the Aria. */
function dedupePages(p) {
  const by = {}; for (const [c, b] of Object.entries(p || {})) (by[b] = by[b] || []).push(c);
  const out = {}; let dropped = 0;
  for (const [b, cs] of Object.entries(by)) { if (cs.length === 1) out[cs[0]] = +b; else dropped += cs.length; }
  return { pages: out, dropped };
}
try { const j = JSON.parse(fs.readFileSync(HELLO_FILE, "utf8")); savedHello = j.hello || null; savedPort = j.port || null; savedModel = j.model || ""; savedPages = j.pages || {}; { const d = dedupePages(savedPages); if (d.dropped) { savedPages = d.pages; console.log(`Forgot ${d.dropped} Aria page buttons that two inputs both claimed; press those page buttons on the Aria once to learn them again.`); } } savedButtons = j.buttons || {}; savedConf = j.conf || {}; if (j.helloMode === "touch" || (j.helloMode === "own" && j.helloChosen)) { helloMode = j.helloMode; helloChosen = !!j.helloChosen; } } catch (_) { }   /* 0.6.3 saved "own" without anyone choosing it */
const IN_NAMES = ["Analog 1", "Analog 2", "Analog 3", "Analog 4", "Return 1", "Return 2",
  ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => `AES ${n}`), ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => `RX ${n}`)];
const inName = i => IN_NAMES[i] || `input ${i + 1}`;
const saveLink = () => fs.writeFile(HELLO_FILE, JSON.stringify({ helloMode, helloChosen, hello: savedHello, port: savedPort, model: savedModel, pages: savedPages, conf: savedConf, buttons: savedButtons }), () => { });
/* Settings sent to the Nova. "seen": NovaTouch was captured sending exactly this. "inferred": the Nova sends
   this setting itself in this format, and NovaTouch sends other settings of the same shape. Everything else
   stays on the remote until its format is confirmed. */
const SEND = new Map([
  ["record.tracks", "seen"], ["tone.enable", "seen"], ["track.name", "seen"], ["trackmix.matrix", "seen"],
  ["outputmix.slate", "seen"], ["outputmix.com1", "seen"], ["hpmix.tracks", "seen"],
  /* from Nova Tap capture 5 (Oct 25, 17:58–18:01): routing pre/post, outputs, input settings, headphone presets */
  /* outputmix.matrix sources, as the Nova numbers them: 0–21 inputs, 22–29 outputs, 30–45 tracks 1–16
     (Analog 1 = 0 and Track 1 = 30 confirmed on the Nova, Oct 25). OUT 1–4 take inputs, OUT 5–6 tracks and OUT 1–4. */
  ["outputmix.matrix", "seen"],
  ["hpmix.preset", "seen"], ["hpmix.enable", "seen"],
  ["input.level", "seen"], ["input.power48V", "seen"], ["input.trim.level", "seen"], ["input.notch.enable", "seen"],
  ["input.notch.freq", "seen"], ["input.delay.enable", "seen"], ["input.hpf.enable", "seen"], ["input.compress.enable", "seen"],
  ["input.hpf.freq", "inferred"], ["input.phase", "inferred"], ["input.zaxnet.id", "inferred"],
  ["outputmix.com2", "inferred"], ["outputmix.tone", "inferred"], ["hpmix.outputs", "seen"], ["hpmix.returns", "inferred"],
  ["tone.level", "inferred"], ["trackmix.tone", "inferred"], ["trackmix.slate", "inferred"], ["note.preset", "inferred"],
  ["scene.next", "seen"], ["take.next", "seen"], ["note.next", "inferred"],
  /* Nov 2: name presets (Track Names › Presets). Same shape as track.name (text, 16), which NovaTouch sends. */
  ["names.preset.name", "inferred"],
  /* Nov 3: headphone preset names (renamed by double-tapping a preset in Routing). Same shape as track.name. */
  ["hpmix.names", "inferred"],   /* scene/take.next confirmed on the Nova, Oct 25 */
  /* scene/take/note.current are left out: the Nova ignored a scene.current change during a take
     (live session 3, 18:27:29; the take was still logged under the old scene). */
  ]);
/* The Nova reports these empty; the remote keeps its own colors. */
const RX_SKIP = new Set(["track.color", "input.color", "names.character.color", "names.preset.color"]);
/* Numbered 1… on the remote, 0… on the Nova. */
const PLUS_ONE = new Set(["trackmix.preset", "hpmix.preset", "outputmix.preset", "input.channel", "input.configure"]);
/* Kept on the remote without a note: input names follow track names, and colors are the remote's own. */
const QUIET = new Set(["input.name", "input.color", "track.color"]);
const NAME_KEYS = new Set(["track.name", "names.preset.name", "hpmix.names"]);
const cleanName = v => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9 ()\-+#.@_,=?!$%^&*{}\[\];'\/"<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 22);
const SIM_ACTIVITY = [2,2,0,0, 0,0, 0,0,0,0,0,0,0,0, 1,1,1,1,0,0,1,1];  /* simulator: 2 = boom/plant, 1 = lav, 0 = idle */
/* Timecode jams (capture Nov 1, NovaTouch's Jam buttons): CMD 57 with the name only.
   jam.tc took the generator to 00:00:00:00 with nothing on the reader; jam.date put the date in the user bits;
   jam.time jammed timecode to the Nova's time-of-day clock. */
const JAMS = { "JAM": "jam.tc", "JAM TC": "jam.tc", "JAM UB": "jam.ub", "JAM DATE": "jam.date", "JAM TIME": "jam.time" };
/* Route values: the remote stores 0 off / 1 pre-fade / 2 post-fade; the Nova uses 0 / 1 / 3
   (NovaTouch writes 3 after switching its Post mode on, 1 in Pre mode). */
const TX_WIDTH = { "input.notch.freq": 2 };
const MATRIX = new Set(["trackmix.matrix", "outputmix.matrix"]);
const TX_DIMS = { "trackmix.matrix": [8, 12, 22], "outputmix.matrix": [1, 8, 46], "trackmix.tone": [1, 12], "trackmix.slate": [1, 12] };
/* Track tone/slate (Oct 28): the Nova reports front-panel changes as [preset][track] in a 1×12 size (live session 7);
   tracks 13–16 use the dump's 1×16. */
const TX_DIMS_WIDE = { "trackmix.tone": [1, 16], "trackmix.slate": [1, 16] };
/* Two source numberings (live session 4, Oct 25). The settings dump (sizes 8×16×22 / 1×8×50) numbers routing
   sources like the inputs: Analog 1–4 = 0–3 … RX 1–8 = 14–21. Live changes and NovaTouch's sends (sizes 8×12×22 /
   1×8×46) use a 26-entry list where RX 1–8 = 18–25 (Track 1 ← RX 1…8 reported as 18…25; Track 3 ← RX 1 as 18,
   which the dump lists as 14). That makes the output list 26 sources + OUT 1–4 (26–29) + tracks 1–16 (30–45) = 46.
   Analog 1 = 0 and Track 1 = 30 are confirmed. Assumed until checked: Return/AES keep 4–13, and 14–17 are 4
   extra sources the remote doesn't know yet. The remote keeps the dump numbering inside (OUT 1–4 = 22–25). */
const isWireDims = (k, d) => !!d && JSON.stringify(d) === JSON.stringify(TX_DIMS[k]);
/* Routing lists put the digital inputs in a different order from the input settings (live session 5: Ferris
   routed AES 4 then Return 1 to Track 3 and the Nova reported sources 13 and 4). Routing: Analog 0–3, Return 4–5,
   the Nova 2's extra digital inputs 6–9 (unlabeled boxes on a Nova 1), Digital 1–4 10–13. Input settings (trim echo
   for Digital 2 = 7): Digital 1–4 6–9, then 10–13. So inputs 6–9 and 10–13 swap places in routing. */
const swapDig = i => i >= 6 && i < 10 ? i + 4 : i >= 10 && i < 14 ? i - 4 : i;
const toDump = (k, sx) => swapDig(sx), fromDump = (k, r) => swapDig(r);
/* toWire/toDump: kept for reference; sends use input numbers as they are. */
const toWire = (k, sx) => { sx = swapDig(sx); return sx < 14 ? sx : sx < 22 ? sx + 4 : (k === "outputmix.matrix" && sx < 26) ? sx + 4 : sx; };
const fromWire = (k, w) => { const r = w < 14 ? w : w < 18 ? null : w < 26 ? w - 4 : (k === "outputmix.matrix" && w < 30) ? w - 4 : w; return r == null ? null : swapDig(r); };
const routeIn = v => !v ? 0 : (v & 2) ? 2 : 1;
const routeOut = v => !v ? 0 : v >= 2 ? 3 : 1;
const OUT_ADDS = new Set(["outputmix.slate", "outputmix.com1", "outputmix.com2", "outputmix.tone"]);

function buildArr(dims, fill) { if (!dims.length) return fill; const [n, ...rest] = dims; return Array.from({ length: n }, () => buildArr(rest, fill)); }
function fillArr(a, fill) { for (let i = 0; i < a.length; i++) { if (Array.isArray(a[i])) fillArr(a[i], fill); else a[i] = fill; } }
const idxText = idx => idx.length ? "[" + idx.map(i => i + 1).join(",") + "]" : "";

const nova = {
  active: false, connected: false, lastRx: 0, lastHello: 0, helloText: HELLO_OWN, helloSince: 0, triedOther: false, pauseUntil: 0,
  state: "STOPPED", elapsed: 0, drive: 0, volts: 0, recStartFrames: 0, lastTake: null,
  trk: Array(16).fill(-120), out: Array(8).fill(-120), inp: Array(22).fill(-120),
  model: "", aria: "", dims: new Map(), types: new Map(), which: { track: null, out: null, tfader: null, ofader: null },
  dirty: new Set(), flushT: null, history: new Map(), notSent: new Set(), namesCleared: false,
  parser: null,
  start() {
    this.active = true; this.connected = false; this.namesCleared = false; this.history.clear();
    /* Nov 15: the hello chosen in Setup › Cart & Recorder Link (default NovaTouch-type; see helloMode). */
    this.helloText = helloMode === "touch" ? HELLO_COMPAT : HELLO_OWN; this.triedOther = false; this.helloSince = performance.now(); this.pauseUntil = 0;
    this.setIds = new Set(); this.setsCheckAt = null; this.autoReloaded = false;   /* full-set check (Nov 14, see watch) */
    this.unload();   /* read-first (Nov 18, see LOADING) */
    this.noiseBytes = 0; this.noiseLast = 0; this.quietUntil = 0; this.noiseRounds = 0; this.noiseLogged = false; this.echoes = 0;   /* start-up guard (Nov 15) */
    this.which = { track: null, out: null, tfader: null, ofader: null }; this.confSent = null; this.solo.clear(); this.held = { slate: false, com: false }; this.learning = null;
    if (this.listenOnly) { logAll("ev", "Listen only: the port is open and nothing will be sent to the Nova. Everything it sends is shown here and saved to the capture file."); if (captureStream) captureStream.write(`# Listen only: nothing sent\n`); broadcast({ t: "nova", nova: this.status() }); return; }
    /* Nov 15: a port that appeared moments ago is most likely a Nova that has just been switched on (its USB comes up
       well before it can talk; Ferris's capture). Say nothing to it until it has had 20 s, counted from when the port
       appeared. NOVA_BOOT_WAIT (ms) overrides, for tests. */
    const usb = /ttyUSB|ttyACM|usbserial|usbmodem/i.test(serial.path || "") || process.env.NOVA_BOOT_WAIT != null;   /* not virtual ports (tests) */
    const age = usb ? portAge(serial.path) : -1, wait = Math.max(0, +(process.env.NOVA_BOOT_WAIT ?? 20000) - age);
    if (age >= 0 && wait > 0) {
      this.quietUntil = performance.now() + wait; this.lastHello = performance.now();
      logAll("ev", `Nova link: this port appeared ${Math.round(age / 1000)} s ago, so the Nova may still be starting up. Waiting ${Math.ceil(wait / 1000)} s before saying hello…`);
      broadcast({ t: "nova", nova: this.status() }); return;
    }
    logAll("ev", "Nova link: saying hello to the Nova…");
    this.sendHello();
  },
  stop() {
    if (!this.active) return;
    this.active = false;
    if (this.connected) logAll("ev", "Nova link closed. Back to the simulated recorder.");
    this.setConnected(false);
  },
  reload() { if (!this.active) return; this.pauseUntil = performance.now() + 5000; this.setIds = new Set(); this.setsCheckAt = null; this.unload(); logAll("ev", "Nova link: reloading the Nova's setup (pausing 5 seconds so it sends everything again)…"); },
  sendHello() { this.write(NOVA.CMD.HELLO, Buffer.from(this.helloText, "latin1")); this.lastHello = performance.now(); },
  /* Listen only (Nov 1, for tapping a Nova plugged straight into the computer): nothing at all is written to the
     port, not even the hello, so the capture shows only what the Nova sends by itself. */
  listenOnly: false,
  write(cmd, data, text) {
    if (!serialHandle) return false;
    if (this.listenOnly) { if (text) logAll("ev", `Listen only: not sent (${text})`); return false; }
    if (this.gated(cmd, data)) {
      const now = Date.now(); if (now - (this._gateLog || 0) > 2000) { this._gateLog = now; logAll("ev", `Not sent, because Nova Relay is still reading the Nova's settings${this.loadPct != null ? " (" + this.loadPct + "%)" : ""}: ${String(text || "a change").replace(/^\u2192 Nova\s+/, "")}. Try again in a moment.`); }
      return false;
    }
    if (cmd !== NOVA.CMD.HELLO && this.connected && !this.loaded) this.sentEarly = (this.sentEarly || 0) + 1;
    const f = NOVA.frame(cmd, data);
    try { serialHandle.write(f); } catch (e) { logAll("er", `Nova link: couldn't write to the port (${e.message})`); return false; }
    if (captureStream) captureStream.write(`${new Date().toISOString()}  TX ${[...f].map(hex2).join(" ")}\n`);
    if (text) logAll("tx", `${text}   [${[...f].map(hex2).join(" ")}]`);
    return true;
  },
  watch(now) {
    if (!this.active) return;
    if (now < this.pauseUntil) { if (this.connected && now - this.lastRx > 3000) this.setConnected(false); return; }
    if (this.listenOnly) { if (!this.connected && now - this.lastRx < 1500 && this.lastRx) this.setConnected(true); return; }
    /* Nov 14 (Ferris: "pi version isn't reading Nova settings when connected"): firmware 5.23 sends its full set of
       settings only when it takes up a NEW computer, after 3-4 s without one (Zaxcom's notes). A reconnect inside that
       (a quick re-open, a restart, the Pi's port scan) gets the stream but no settings, so names, routing and arming
       never load. 4 s after connecting, if fewer than 30 different settings have come, go quiet for 5 s (Reload from
       Nova) so it sends them all. Once per port open; while the Nova records, wait until it stops. */
    if (!this.connected) this.setsCheckAt = null;
    else if (this.setsCheckAt == null) this.setsCheckAt = now + 4000;
    else if (now >= this.setsCheckAt && this.setsCheckAt !== Infinity) {
      if ((this.setIds ? this.setIds.size : 99) >= 30) this.setsCheckAt = Infinity;
      else if (this.state === "RECORDING") this.setsCheckAt = now + 2000;
      else if (!this.autoReloaded) {
        this.autoReloaded = true;
        logAll("ev", `Nova link: the Nova didn't send its settings (${this.setIds.size} of them so far): it thinks this computer never left. Asking again…`);
        this.reload(); return;
      } else { this.setsCheckAt = Infinity; logAll("er", "Nova link: still no settings from the Nova. Try Setup \u203a Cart & Recorder Link \u203a Reload from Nova, or unplug the Nova's cable for 5 seconds."); }
    }
    if (this.connected && !this.loaded && this.setIds && this.setIds.size >= 30 && now - this.lastSetAt > 3000 && this.loadPct == null) this.markLoaded("no loading count from this Nova");
    /* Nov 15 (Ferris's Pi capture 2026-11-15T13-09-37: "(Reboot)", then the Nova froze at "computer found"): while a
       Nova is still starting up, its port doesn't speak the protocol yet: each hello came back scrambled ~45 ms later
       for 10 s, the Nova then answered properly and froze 0.3 s later. A Nova that's half started was being fed
       scrambled hellos (any of which can read as a real command: a sample-rate change shows "(Reboot)"). So: bytes
       that aren't Nova messages, before any real one, mean "not ready": say nothing until the port has been quiet for
       12 s, then one hello; noise again waits again. The Mac captures show a silent line until the Nova answers. */
    if (!this.connected && this.noiseBytes >= 8 && now - this.noiseLast > 200) {
      this.noiseBytes = 0; this.noiseRounds++;
      this.quietUntil = this.noiseLast + 12000; this.helloSince = now;
      if (!this.noiseLogged) { this.noiseLogged = true; logAll("ev", "Nova link: the Nova's port is sending noise, not messages: it's probably still starting up. Waiting until it's quiet before saying hello, so nothing reaches it half-started…"); }
      if (this.noiseRounds === 4) logAll("er", `Nova link: the line keeps sending noise instead of Nova messages${POWER_HINT}. Also check the cable, then turn the Nova off and on.`);
    }
    if (!this.connected && now < this.quietUntil) { this.helloSince = now; return; }
    if (now - this.lastHello >= 1060) this.sendHello();
    if (this.connected && now - this.lastRx > 4000) {
      logAll("er", "Nova link: no answer from the Nova for 4 seconds. Still trying…");
      this.setConnected(false); this.helloSince = now;
    }
    /* Nov 18: no switching to the other hello after 30 s without an answer (it used to). Ferris: "sometimes I'll still
       get the demo ended screen ... closing and opening the port fixes it but not always": a Nova slow to answer got
       Nova Relay's own hello, which it doesn't license. The hello chosen in Setup is the only one sent. */
  },
  setConnected(on) {
    if (this.connected === on) return;
    this.connected = on;
    if (on) {
      if (savedHello !== this.helloText || savedPort !== serial.path) { savedHello = this.helloText; savedPort = serial.path; saveLink(); }
      auto.found(serial.path);
      logAll("ev", `Nova link: connected${this.model ? " to " + this.model : ""}. Reading its settings before anything is sent…`);
      if (this.loadedEarly) { const how = this.loadedEarly; setTimeout(() => this.markLoaded(how === true ? "" : how), 300); }
      if (!this.namesCleared && V) {
        /* The Nova has no input names; clearing the remote's lets each input take its track's name. */
        this.namesCleared = true; V["input.name"] = Array(22).fill(""); this.markDirty("input.name");
      }
    } else {
      this.trk.fill(-120); this.out.fill(-120); this.inp.fill(-120); this.state = "STOPPED";
      /* Nov 18: back from a dropout, the Nova's settings are read again before anything is sent (the Nova sends them
         all to a computer it had dropped; if it didn't drop us, the full-set check asks it to). */
      this.setIds = new Set(); this.setsCheckAt = null; this.autoReloaded = false; this.unload();
    }
    broadcast({ t: "nova", nova: this.status() });
    sendLive(true);
  },
  status() { return { power: VCGEN ? { ...power } : null, helloMode, listen: this.listenOnly, active: this.active, connected: this.connected,
    loading: (this.connected || this.loadPct != null) && this.active && !this.loaded && !this.listenOnly, loadPct: this.loadPct, model: this.model || savedModel, aria: this.aria, hello: this.helloText, conf: savedConf, solo: [...this.solo], pfl: this.pflMap(), held: { ...this.held }, buttons: { slate: true, com: savedButtons.com != null }, learning: this.learning ? this.learning.what : null }; },
  alive() { this.lastRx = performance.now(); this.noiseBytes = 0; if (!this.connected && this.active) this.setConnected(true); },
  /* LOADING (Nov 18, Ferris on a job, Pi on the direct cable: "Remote should always read current Nova settings first
     before anything else, never changing something on first connect"). After connecting (and after a dropout or a
     Reload) nothing that changes a setting goes to the Nova until its settings have been read: the Nova sends them
     with "Loading 0%" ... "Loading 100%" in its status text (setting 145, every capture, direct and through the Aria);
     a Nova that doesn't (another firmware) counts as read once 30+ settings have come and none for 3 s. Until then
     settings, take-history edits, ZNet trim and fader moves are refused (the device's control goes back); REC, STOP,
     PFL, slate/com, jams and transmitter power (two taps) still go. Hellos are all that's sent on its own. */
  loaded: false, loadPct: null, lastSetAt: 0, sentEarly: 0,
  unload() { this.loaded = false; this.loadedEarly = false; this.loadPct = null; this.lastSetAt = 0; this.sentEarly = 0; clearTimeout(this._loadT); },
  gated(cmd, data) {
    if (this.loaded || !this.connected) return false;
    return cmd === NOVA.CMD.SETTING || cmd === NOVA.CMD.FADER || (cmd === NOVA.CMD.STATUS && data && data[0] === 0x81);
  },
  markLoaded(how) {
    if (this.loaded) return;
    if (!this.connected) { this.loadedEarly = how || true; return; }   /* the settings came before the meters: done when they start */
    this.loaded = true; clearTimeout(this._loadT);
    logAll("ev", `Nova link: the Nova's settings are read (${this.setIds ? this.setIds.size : 0} settings${how ? ", " + how : ""}). Nothing was sent to it but hellos${this.sentEarly ? ` and ${this.sentEarly} button press${this.sentEarly === 1 ? "" : "es"} from a device` : ""}. Changes go to the Nova from now on.`);
    broadcast({ t: "nova", nova: this.status() });
  },
  loadText(t) {   /* setting 145 while connecting: "Loading 40%" */
    const m = /Loading\s+(\d{1,3})%/.exec(t || ""); if (!m || this.loaded || !this.active || this.listenOnly) return;
    const pct = Math.min(100, +m[1]); if (pct === this.loadPct) return;
    this.loadPct = pct; broadcast({ t: "nova", nova: this.status() });
    if (pct >= 100) { clearTimeout(this._loadT); this._loadT = setTimeout(() => this.markLoaded(), 1200); }   /* a few settings follow the 100% */
  },
  echo(n) {
    if (!this.active || this.listenOnly) return;
    this.echoes = (this.echoes || 0) + 1; this.noise(n);
    if (this.echoes === 2) logAll("er", `Nova link: Nova Relay's own messages are coming back on the cable (an echo), so the Nova can't be heard${POWER_HINT}. Nova Relay stays quiet until the line is clear.`);
  },
  /* Nov 15 (Ferris: "add transmitter global power commands / individual power commands"): cQRXTX sub 98 = power,
     [98, 01, unit, 00, value, 0…]; value 0 On, 1 Wake, 2 Low; unit 0 = every transmitter (confirmed on the cart Nov 14),
     1-30 = one transmitter by ZaxNet ID (the Nova passes it through with our unit byte; untested on hardware so far).
     Returns true when sent, otherwise the reason. */
  txPower(unit, v, who) {
    const word = ["On", "Wake", "Low"][v];
    if (word == null || !(Number.isInteger(unit) && unit >= 0 && unit <= 30)) return "Use on, wake or low, and a ZaxNet ID 1-30 (or none for every transmitter).";
    if (this.listenOnly) return "Listen only is on, so nothing is sent.";
    if (!this.connected) return "No Nova connected, so the transmitters weren't changed.";
    const now = Date.now(), last = (this._txp || (this._txp = {}))[unit] || 0;
    if (now - last < 500) return "Already sent; wait a moment.";
    this._txp[unit] = now;
    const ok = this.write(NOVA.CMD.STATUS, Buffer.from([0x98, 0x01, unit, 0x00, v, 0, 0, 0, 0, 0, 0]),
      `\u2192 Nova  Transmitter power ${unit ? "ZaxNet " + unit : "ALL"} = ${word}  (from ${who}${this.state === "RECORDING" ? ", while recording" : ""})`);
    return ok ? true : "Couldn't write to the port.";
  },
  /* Bytes the parser threw away (not part of a valid message). Before the Nova has answered, that's a port that isn't
     ready (see watch); once connected, an odd bad byte is just line noise. */
  noise(n) { if (!this.active || this.listenOnly || this.connected || n <= 0) return; this.noiseBytes += n; this.noiseLast = performance.now(); },
  setState(st) {
    if (this.state === st) return;
    if (st === "RECORDING") { this.elapsed = 0; this.recStartFrames = sim.genFrames; }
    else if (this.state === "RECORDING") {
      this.lastTake = { dur: this.elapsed, start: framesToTC(this.recStartFrames, sim.fr()), startFrames: this.recStartFrames,
        tracks: (get("record.tracks") || []).slice(0, 16).filter(Boolean).length };
    }
    this.state = st;
    logAll("rx", st === "RECORDING" ? "Nova: recording" : `Nova: stopped${this.lastTake ? " after " + fmtDur(this.lastTake.dur) : ""}`);
    sendLive(true);
  },
  onMessage(m) {
    const d = m.data;
    switch (m.cmd) {
      /* CMD 10: wireless receiver levels. Slots 1–8 = RX 1–8 (confirmed for RX 2 and RX 4, Oct 25 2026),
         which are inputs 15–22 in the Nova's order. The other slots haven't carried anything yet. */
      case NOVA.CMD.METERS_A:
        if (d.length >= 8) for (let i = 0; i < 8; i++) this.inp[14 + i] = NOVA.meterDb(d[i]);
        /* Bytes 8–15 have been 0 in every capture so far. Nov 1: watching for analog / AES levels there; the first
           time one moves, say so in the Link log (and the capture file), so a mic test shows where they live. */
        for (let i = 8; i < Math.min(16, d.length); i++) if (d[i] && !this.m10seen[i]) {
          this.m10seen[i] = true;
          logAll("ev", `Meters: CMD 10 byte ${i} carried a level for the first time (${NOVA.meterDb(d[i])} dB). Possibly an analog or AES input; note what was plugged in.`);
        }
        /* Byte 16 (17-byte form): the level of the input the Nova is focused on (found Oct 26). It follows
           input pages opened on the Nova or Aria (INPUT_CHANNEL), front-panel edits (not always reported), and
           settings sent from the remote, which hold it for a few seconds before it returns to the page's input.
           Used as the meter for one non-RX input at a time, only when it isn't simply a copy of an RX meter. */
        if (d.length >= 17) {
          const f = this.focusCh(), b = d[16], isRx = b !== 0 && [0, 1, 2, 3, 4, 5, 6, 7].some(j => d[j] === b);
          for (let i = 0; i < 14; i++) this.inp[i] = (i === f && !isRx) ? NOVA.meterDb(b) : -120;
        }
        break;
      case NOVA.CMD.TRACK_METERS: if (d.length >= 16) { for (let i = 0; i < 16; i++) this.trk[i] = NOVA.meterDb(d[i]); this.alive(); } break;
      case NOVA.CMD.OUT_METERS: if (d.length >= 6) { for (let i = 0; i < 8; i++) this.out[i] = i < d.length ? NOVA.meterDb(d[i]) : -120; } break;
      case NOVA.CMD.TIMECODE: {
        const tc = NOVA.decodeTimecode(d); if (!tc) break;
        sim.genFrames = tcToFrames(tc, sim.fr()); this.alive(); break;
      }
      case NOVA.CMD.HELLO: {
        const t = d.toString("latin1");
        /* Nov 15 (Ferris's Pi captures): our own hello coming back = the line is echoing what we send (it was the Pi's
           power supply). The Nova never sends a "PC…" hello. Treat it as noise (the start-up guard goes quiet) and say why. */
        if (/^PC/.test(t)) { this.echo(d.length + 6); break; }
        const nm = t.match(/NOVA\w*\s+v[\d.]+(?:\s+sn\d+)?/), ar = t.match(/ARIA\s+[\d.]+/);
        let changed = false;
        if (nm && nm[0] !== this.model) { this.model = nm[0]; changed = true; if (savedModel !== nm[0]) { savedModel = nm[0]; saveLink(); } }
        if (ar && ar[0] !== this.aria) { this.aria = ar[0]; changed = true; }
        if (changed) broadcast({ t: "nova", nova: this.status() });
        break;
      }
      case NOVA.CMD.STATUS:
        if (d[0] === 0x88 && d.length >= 5) this.setState(d[4] ? "RECORDING" : "STOPPED");
        /* Receiver frequencies (Nov 1, confirmed by Ferris): CMD 50 82 01 <ch> <hi> <lo>, in 100 kHz units, sent when a
           frequency is edited on the Nova, and all eight when they're sent to the transmitters over ZaxNet. Channel 12 = RX 1, channels 1–7 = RX 2–8. */
        /* ZaxNet trim (transmitter gain), live (Nov 1 capture with notes): CMD 50 81 01 <ch> 00 <v>, v 0–255 for the
           Nova's 0–52 (10 = 0x31, 20 = 0x62 … 52 = 0xFF). Same channel numbering as the frequencies. */
        /* Nov 1 test sends: after the computer sends CMD 50 81 / 03, an echo comes straight back in a slightly different
           form (81 … <v> 55 66 …, and 03 … <s> 00 00 with no 50 9E). Those echoes aren't the Nova's state: the
           transmitter didn't change. Only the genuine forms are used (81 … <v> 00 00 …; 03 … <s> … 50 9E). */
        else if (d[0] === 0x81 && d.length >= 7 && (d[5] || d[6])) {
          if (!this.cmdSeen.echo81) { this.cmdSeen.echo81 = true; logAll("ev", "Nova: an echo of a ZNet trim message (not the transmitter's real trim); ignored."); }
        }
        else if (d[0] === 0x03 && d.length >= 11 && !(d[9] === 0x50 && d[10] === 0x9E)) {
          if (!this.cmdSeen.echo03) { this.cmdSeen.echo03 = true; logAll("ev", "Nova: an echo of a transmitter power message (not the transmitter's real state); ignored."); }
        }
        else if (d[0] === 0x81 && d.length >= 5) {
          const rx = this.rxOfZid(d[2]);
          if (rx != null) { this.rxField("ui.znettrim", rx, Math.round(d[4] * 52 / 255), v => `RX ${rx + 1} ZNet trim ${v}`); this.znetSrc(rx, "nova"); }
        }
        /* Transmitter power state (Nov 1): CMD 50 03 01 <ch> 00 <s>, s 0 = On, 1 = Wake, 2 = Low power, 3 = Standby.
           Sent about 5 times a second while the Nova's transmitter power setting is being changed. */
        else if (d[0] === 0x03 && d.length >= 5) {
          const ch = d[2], rx = ch === 12 ? 0 : (ch >= 1 && ch <= 7 ? ch : null);
          const st = ["On", "Wake", "Low power", "Standby"][d[4]];
          if (rx != null && st) this.rxField("ui.txstate", rx, st, v => `RX ${rx + 1} transmitter ${v}`);
        }
        else if (d[0] === 0x82 && d.length >= 5) {
          const ch = d[2], rx = ch === 12 ? 0 : (ch >= 1 && ch <= 7 ? ch : null);
          if (rx == null) { if (!this.cmdSeen["82:" + ch]) { this.cmdSeen["82:" + ch] = true; logAll("ev", `Nova: frequency for unknown receiver channel ${ch}: ${((d[3] * 256 + d[4]) / 10).toFixed(1)} MHz`); } break; }
          const mhz = ((d[3] * 256 + d[4]) / 10).toFixed(1);
          const cur = Array.isArray(V && V["ui.rxfreq"]) ? V["ui.rxfreq"].slice() : Array(8).fill("");
          if (cur[rx] !== mhz) { cur[rx] = mhz; setV("ui.rxfreq", [], cur); logAll("rx", `Nova: RX ${rx + 1} frequency ${mhz} MHz`); }
        }
        break;
      case NOVA.CMD.EVENT: { const t = d.toString("latin1"); if (/record/.test(t)) this.setState("RECORDING"); else if (/stop/.test(t)) this.setState("STOPPED"); break; }
      /* Settings also flow between the Aria and the Nova with no computer attached, so they don't prove the
         Nova heard our hello; meters and timecode only stream once it has. */
      case NOVA.CMD.SETTING: if (this.connected) this.lastRx = performance.now();   /* a long settings burst isn't a dropout (Nov 18) */
        if (d.length >= 2 && this.setIds) { const sid = d[0] | (d[1] << 8); if (sid < 142 || sid > 145) { this.setIds.add(sid); this.lastSetAt = performance.now(); } else if (sid === 145 && !this.loaded) this.loadText(d.subarray(2).toString("latin1")); }
        if (this.active) this.applySetting(NOVA.decodeSetting(d)); break;
      case 0x13: case NOVA.CMD.TICK: break;
      /* cSoloPFL (0x75): the Nova's solo/PFL bitmasks. Logged so a front-panel PFL test on the direct cable shows
         whether the Nova reports PFL on the PC link (Nov 14). Raw bytes, only when they change. */
      case NOVA.CMD.SOLOPFL: { const hx = [...d].map(hex2).join(" "); if (this._pflSeen !== hx) { this._pflSeen = hx; logAll("rx", `Nova: PFL/solo masks (cSoloPFL 0x75): ${hx}`); } break; }
      default:
        if (!this.cmdSeen[m.cmd]) { this.cmdSeen[m.cmd] = true; logAll("ev", `Nova: message type ${m.cmd.toString(16).toUpperCase()} seen for the first time (${d.length} bytes): ${[...d.slice(0, 24)].map(hex2).join(" ")}`); } break;
      /* CMD 25 from the Aria: its buttons (00 press / 80 release). 70, 71… are the input-page buttons on the
         fader strips (live sessions 4 and 5): a press opens that input's page (the Nova answers with CMD 52
         "InputConfigure" and INPUT_CHANNEL), and pressing it again closes it (no answer). */
      case NOVA.CMD.BUTTON: if (d.length >= 2 && d[1] === 0x00 && d[0] >= 0x70 && d[0] <= 0x7F) this.pageButton(d[0]);
        else if (d.length >= 2 && d[1] === 0x00 && d[0] >= 0x50 && d[0] <= 0x5F) this.soloButton(d[0]);
        else if (d.length >= 2 && (d[1] === 0x00 || d[1] === 0x80)) this.ariaTalkButton(d[0], d[1] === 0x00); break;
      /* CMD 52: the name of the screen the Nova just opened. For an input page it comes right after INPUT_CHANNEL. */
      case NOVA.CMD.SCREEN: { const t = d.toString("latin1").replace(/\0.*$/, ""); this.screenName = t; this.screenAt = Date.now();
        if (t === "InputConfigure" && this.chanAt && Date.now() - this.chanAt < 500) this.pageOpened(this.chan); break; }
    }
  },
  convIn(sc, raw, type) {
    if (sc.t === "Text") return String(raw ?? "");
    let v = +raw || 0;
    if (MATRIX.has(sc.k)) return routeIn(v);
    if (sc.t === "Number") {
      if (sc.r && sc.r[0] < 0 && type > 0) { const lim = 2 ** (8 * type); if (v >= lim / 2) v -= lim; }
      if (sc.s < 1) v = +(v * sc.s).toFixed(4);
      if (PLUS_ONE.has(sc.k)) v += 1;
    }
    return v;
  },
  applySetting(dec) {
    if (!dec || dec.empty || !V) return;
    const sc = BY_ID.get(dec.id); if (!sc) return;
    this.types.set(dec.id, dec.type);
    const k = sc.k;
    if (MATRIX.has(k)) {
      /* Convert the Nova's routing source numbers (live 26-source list, or the dump's list) to input numbers. */
      const wire = isWireDims(k, dec.dims), conv = wire ? fromWire : fromDump;
      if (!wire && dec.dims.length) this.dims.set(dec.id, dec.dims);
      const unknown = w => { logAll("ev", `Nova: ${sc.n}${idxText(dec.idx)} uses source ${w + 1} of the Nova's list, which the remote doesn't know yet, so it isn't shown.`); };
      if (dec.kind === "value" && dec.idx.length === dec.dims.length) { const w = dec.idx[dec.idx.length - 1], sx = conv(k, w); if (sx == null) return unknown(w); dec.idx = [...dec.idx.slice(0, -1), sx]; }
      else if (dec.pairs && dec.idx.length === dec.dims.length - 1) dec.pairs = dec.pairs.map(([w, v]) => [conv(k, w), v]).filter(([sx]) => sx != null);
    } else if (dec.dims.length) this.dims.set(dec.id, dec.dims);
    switch (k) {
      case "battery.status": { const v = parseFloat(String(dec.raw).replace(/[^\d.]/g, "")); if (!isNaN(v)) this.volts = v; return; }
      case "drive.time.remaining": { const s = NOVA.hms(dec.raw); if (s != null) this.drive = s; return; }
      case "drive.time.elapsed": { const s = NOVA.hms(dec.raw); if (s != null && this.state === "RECORDING") this.elapsed = s; return; }
      case "status.text": V[k] = String(dec.raw || ""); parseDriveStatus(V[k]); this.markDirty(k); return;
      case "metadata.history": this.applyHistory(dec); return;
      case "mp3.record.file": case "mp3.record.metadata": if (dec.kind === "table") this.recReport(dec.table); return;
      case "trackmix.which": if (dec.kind === "value") this.which.track = dec.raw; break;
      case "outputmix.which": if (dec.kind === "value") this.which.out = dec.raw; break;
      case "trackmix.fader": if (dec.kind === "value") this.which.tfader = dec.raw; break;
      case "outputmix.fader": if (dec.kind === "value") this.which.ofader = dec.raw; break;
      case "input.configure": if (dec.kind === "value") this.which.cfg = dec.raw; this.confSent = null; break;
      case "input.trim.level": if (this.scan && dec.idx.length === 1) this.scan.hits.push({ i: dec.idx[0], v: dec.kind === "value" ? (dec.raw > 127 ? dec.raw - 256 : dec.raw) : 0 }); break;
      case "input.channel": if (dec.kind === "value") { this.chan = dec.raw; this.chanAt = Date.now(); this.confSent = null; } break;
    }
    if (RX_SKIP.has(k) || !["Menu", "Number", "Text"].includes(sc.t)) return;
    if (!sc.d || !sc.d.length) { if (dec.kind !== "value") return; V[k] = this.convIn(sc, dec.raw, dec.type); this.markDirty(k); return; }
    const zero = sc.t === "Text" ? "" : 0;
    if (!Array.isArray(V[k])) V[k] = buildArr(sc.d, zero);
    let sub = V[k];
    const idx = dec.idx;
    const depth = dec.kind === "value" ? idx.length - 1 : idx.length;
    for (let j = 0; j < depth; j++) { if (!Array.isArray(sub) || idx[j] >= sub.length) return; sub = sub[idx[j]]; }
    if (!Array.isArray(sub)) return;
    if (dec.kind === "value") { const i = idx[idx.length - 1]; if (i >= sub.length) return; sub[i] = this.convIn(sc, dec.raw, dec.type); }
    else {
      fillArr(sub, zero);
      if (dec.pairs && dec.pairs.length && !Array.isArray(sub[0])) for (const [i, v] of dec.pairs) if (i < sub.length) sub[i] = this.convIn(sc, v, dec.type);
    }
    this.markDirty(k);
    /* Routes from the Nova already use its source numbers, so the remote mustn't convert them from the old layout. */
    if (k === "outputmix.matrix" && V["ui.outsrc"] !== 1) { V["ui.outsrc"] = 1; this.markDirty("ui.outsrc"); }
  },
  /* At REC the Nova reports the file it's about to write (161, then 162 with the start timecode). segnum is the file
     number the Nova shows (073); its take list numbers the same take 72, as everywhere else in the remote. */
  recReport(t) {
    const n = parseInt(t.segnum, 10); if (!Number.isFinite(n) || n < 1) return;
    const serial = n - 1, folder = String(t.foldername || get("store.folder") || ""), key = takeKey(folder, serial);
    const armed = (get("record.tracks") || []).slice(0, 16).map((a, i) => a ? i : -1).filter(i => i >= 0);
    const fi = takeFiles[key] = { ...(takeFiles[key] || {}), folder, file: String(n).padStart(3, "0"), scene: t.scene ?? "", take: t.take ?? "",
      tracks: armed.length, names: armed.map(i => `${i + 1} ${get("track.name", [i]) || "TRK " + (i + 1)}`) };
    if (t.tc) fi.start = String(t.tc);
    if (t.ub) fi.ub = String(t.ub);
    if (t.fr) fi.fr = String(t.fr);
    saveTakeFiles();
    setV("ui.recfile", [], { folder, file: fi.file, scene: fi.scene, take: fi.take, start: fi.start || "", ub: fi.ub || "", fr: fi.fr || "" });
    if (t.tc) logAll("rx", `Nova: recording file ${fi.file}${folder ? " in " + folder : ""}, ${fi.scene}/${fi.take}, from ${fi.start}`);
    const row = this.history.get(serial);
    if (row) { this.withFile(row, serial); this.publishHistory(); }
  },
  /* Put the Nova's file details (and anything this remote measured, such as length) on a take row. */
  withFile(row, serial) {
    const fi = takeFiles[takeKey(get("store.folder"), serial)];
    if (!fi) return row;
    if (fi.start) Object.assign(row, { start: fi.start, exact: true });
    for (const k of ["folder", "ub", "fr", "names"]) if (fi[k] != null) row[k] = fi[k];
    if (row.dur == null && fi.dur != null) row.dur = fi.dur;
    if (!row.tracks && fi.tracks) row.tracks = fi.tracks;
    return row;
  },
  rememberTake(serial, row) {
    const key = takeKey(get("store.folder"), serial), fi = takeFiles[key]; if (!fi) return;
    if (row.dur != null && fi.dur !== row.dur) { fi.dur = row.dur; saveTakeFiles(); }
  },
  publishHistory() {
    const rows = [...this.history.entries()].sort((a, b) => b[0] - a[0]).slice(0, 10).map(e => e[1]);
    while (rows.length < 10) rows.push(null);
    V["metadata.history"] = rows; this.markDirty("metadata.history");
    /* Nov 12: the highest take of every scene in the whole list, so going back to a scene carries on its takes. */
    const best = {};
    for (const r of this.history.values()) { const k = sceneKey(r.scene), m = String(r.take || "").match(/^\d+/); if (k && m) best[k] = Math.max(best[k] || 0, +m[0]); }
    if (JSON.stringify(best) !== JSON.stringify(V["ui.scenetakes"] || {})) { V["ui.scenetakes"] = best; this.markDirty("ui.scenetakes"); }
  },
  applyHistory(dec) {
    if (dec.kind === "clear") { this.history.clear(); }
    else if (dec.kind === "table" && dec.idx.length) {
      const serial = dec.idx[0], t = dec.table;
      const newest = this.history.size ? Math.max(...this.history.keys()) : -1;
      /* The row's index is the take's segment number on the Nova (store.segment counts on from the newest one). */
      const nova = { scene: t.scene || "", take: t.take || "", note: t.note || "" };
      const row = { seg: serial, ...nova, nova, start: "", startFrames: 0, dur: null, tracks: null };
      const ed = historyEdits[serial];
      if (ed) {
        const o = ed.orig || {};
        if ((o.scene || "") === nova.scene && (o.take || "") === nova.take && (o.note || "") === nova.note) Object.assign(row, { scene: ed.scene, take: ed.take, note: ed.note, edited: true });
        else {
          /* The Nova's row changed: either it took the edit (good) or the segment was reused. Either way the Nova wins. */
          if (ed.scene === nova.scene && ed.take === nova.take && (ed.note || "") === nova.note) logAll("rx", `Nova: segment ${serial + 1} now ${nova.scene}/${nova.take}`);
          delete historyEdits[serial]; saveHistoryEdits();
        }
      }
      const prev = this.history.get(serial);
      if (prev) Object.assign(row, { start: prev.start, startFrames: prev.startFrames, dur: prev.dur, tracks: prev.tracks });
      else if (serial > newest && this.history.size) {
        if (this.state === "RECORDING") {
          /* REC pressed again mid-take: the Nova closes this take and starts the next one without stopping. */
          Object.assign(row, { dur: this.elapsed, start: framesToTC(this.recStartFrames, sim.fr()), startFrames: this.recStartFrames,
            tracks: (get("record.tracks") || []).slice(0, 16).filter(Boolean).length });
          this.elapsed = 0; this.recStartFrames = sim.genFrames;
          logAll("rx", `Nova: take ${row.take} done after ${fmtDur(row.dur)}; the next take started`);
        } else if (this.lastTake) { Object.assign(row, this.lastTake); this.lastTake = null; }
      }
      this.withFile(row, serial); this.rememberTake(serial, row);
      this.history.set(serial, row);
    } else return;
    this.publishHistory();
  },
  markDirty(k) {
    this.dirty.add(k);
    if (!this.flushT) this.flushT = setTimeout(() => {
      this.flushT = null;
      for (const key of this.dirty) { broadcast({ t: "setk", k: key, val: V[key] }); if (!DEVICE_KEYS.has(key)) saveSoon(); }
      this.dirty.clear();
    }, 60);
  },
  /* A change made on one of the devices. */
  send(k, idx, val) {
    if (!this.connected) return;
    const sc = BY_KEY.get(k); if (!sc) return;
    if (k === "metadata.history") { this.sendHistory(val); return; }
    const mode = SEND.get(k);
    if (!mode && QUIET.has(k)) return;
    /* Input settings are written in a 32-entry list (live session 12, Oct 28: trim [N] landed on input N − 10 for
       N = 16–31; 6–15 did nothing; Analog 1 = 0 works as is): 0–3 Analog, 4–5 Return, 16–23 AES 1–8, 24–31 RX 1–8.
       Reports keep the 22-entry list. So inputs 6–21 go out as +10, in the 32-entry size. */
    if (!mode) {
      if (!this.notSent.has(k)) { this.notSent.add(k); logAll("ev", `${sc.n}: changed on the remote only. Not sent to the Nova yet, because this setting's format isn't confirmed.`); }
      return;
    }
    /* Number width as NovaTouch sends it. (The Nova's own reports use the smallest width that fits, e.g. type 01
       for notch frequencies that NovaTouch sends as 2-byte values, so they can't be used for this.) */
    const type = sc.t === "Text" ? 0 : (TX_WIDTH[k] || 1);
    /* Matrix sizes as NovaTouch sends them (they differ from the sizes in the Nova's settings dump). */
    /* Routes are sent with input numbers as they are (live session 6: AES 1–4 sent as routing numbers 10–13 landed
       on the Nova 2 slots; NovaTouch also sent RX 1 as 14). An output fed from OUT 1–4 is sent like the Nova's own
       report of it (size 1×8×50, OUT 1 = 22); OUT 1 sent as 26 in the 1×8×46 size did nothing. */
    const outSrc = k === "outputmix.matrix" && idx[2] >= 22 && idx[2] < 30;
    const txDims = outSrc ? [1, 8, 50] : TX_DIMS[k] && idx.every((v, j) => v < TX_DIMS[k][j]) ? TX_DIMS[k] : TX_DIMS_WIDE[k] || null;
    const dims = sc.d ? (txDims || (k.startsWith("input.") ? sc.d : this.dims.get(sc.id)) || sc.d) : [];
    for (let j = 0; j < idx.length; j++) if (dims[j] != null && idx[j] >= dims[j]) { logAll("ev", `${sc.n}${idxText(idx)}: the Nova doesn't have this one, so it wasn't sent.`); return; }
    let value = val, shown = JSON.stringify(val);
    /* Nov 3: names follow the recorder's name editor (22 characters, its keyboard's characters), whoever sent them. */
    if (NAME_KEYS.has(k)) { value = cleanName(val); shown = JSON.stringify(value); }
    if (sc.t === "Number") { if (PLUS_ONE.has(k)) value -= 1; if (sc.s < 1) value = Math.round(value / sc.s); }
    if (MATRIX.has(k)) {
      value = routeOut(val); shown = ["off", "pre-fade", "", "post-fade"][value];
      if (k === "trackmix.matrix") { this.select(19, "track", idx[1]); if (value) this.select(12, "tfader", value === 3 ? 1 : 0); }
      else if (idx[1] >= 4) {
        /* OUT 5–8 (tracks and OUT 1–4) have no pre/post choice on the Nova; it reports these routes as 1. */
        value = val ? 1 : 0; shown = value ? "on" : "off";
        if (idx[1] < 6) this.select(33, "out", idx[1]);
      }
      else { this.select(33, "out", idx[1]); if (value) this.select(23, "ofader", value === 3 ? 1 : 0); }
    }
    if (OUT_ADDS.has(k) && idx[1] < 6) this.select(33, "out", idx[1]);
    if (k.startsWith("input.") && idx.length && idx[0] < 22) this.touch = { ch: idx[0], until: Date.now() + 4000 };
    let wIdx = idx, wDims = dims;
    if (k.startsWith("input.") && sc.d && sc.d[0] === 22 && idx[0] >= 6 && idx[0] < 22) {
      const n = confFor(idx[0]) ?? idx[0] + 10;   /* the trim finder's result, if run, wins */
      wIdx = [n, ...idx.slice(1)]; wDims = [32, ...dims.slice(1)];
    }
    const data = NOVA.encodeSetting({ id: sc.id, type, dims: wDims, idx: wIdx, value });
    this.write(NOVA.CMD.SETTING, data, `→ Nova  SET ${String(sc.id).padStart(3)} ${sc.n}${idxText(idx)} = ${shown}${wIdx !== idx ? `  (as ${wIdx[0]})` : ""}${mode === "inferred" ? "  (format inferred)" : ""}`);
  },
  /* Take history edits.
     Oct 30: written as table size 10, keys take/scene/note. Nov 1 that froze the Nova (index 76 in a table of 10).
     Nov 1 capture of NovaTouch editing history: SET 58, type 5, ONE dimension sized to the number of segments
     (newest segment + 1, e.g. 78 for newest 77), index = segment, keys in the order scene, note, take. The Nova
     answers with the row (in its usual size-10 form), and editing the newest segment also changes the current
     scene/take. Nova Relay now sends exactly that. Edits are also kept on the remote (history-edits.json) until the
     Nova's echo shows the change, so nothing is lost if the Nova doesn't take it. */
  sendHistory(rows) {
    let changed = false;
    const newest = this.history.size ? Math.max(...this.history.keys()) : null;
    for (const r of rows || []) {
      if (!r || r.seg == null) continue;
      const prev = this.history.get(r.seg); if (!prev) continue;
      const nova = prev.nova || { scene: prev.scene, take: prev.take, note: prev.note };
      const same = (a, b) => (a.scene || "") === (b.scene || "") && (a.take || "") === (b.take || "") && (a.note || "") === (b.note || "");
      if (same(prev, r)) continue;
      if (same(nova, r)) { delete historyEdits[r.seg]; prev.edited = false; }
      else { historyEdits[r.seg] = { scene: r.scene || "", take: r.take || "", note: r.note || "", orig: nova }; prev.edited = true; }
      Object.assign(prev, { scene: r.scene || "", take: r.take || "", note: r.note || "", nova });
      changed = true;
      const size = newest + 1;
      if (newest == null || r.seg > newest || size > 255) {
        logAll("ev", `Segment ${r.seg + 1}: edited on the remote only (${size > 255 ? "segment numbers above 254 haven't been seen in NovaTouch's form yet" : "the Nova's take list isn't loaded"}).`);
        continue;
      }
      const text = [];
      for (const [key, v] of [["scene", r.scene], ["note", r.note], ["take", r.take]]) text.push(...Buffer.from(key, "latin1"), 0, ...Buffer.from(String(v || ""), "latin1"), 0);
      const data = Buffer.from([58, 0, 5, 1, size, 1, r.seg, ...text, 0]);   /* NovaTouch ends the table with one more 00 */
      this.write(NOVA.CMD.SETTING, data, `→ Nova  SET  58 METADATA_HISTORY [segment ${r.seg + 1}: row ${r.seg} of ${size}] = ${r.scene}/${r.take} note ${JSON.stringify(r.note || "")}  (as NovaTouch sends it)`);
      const seg = r.seg, want = { ...r };
      setTimeout(() => {
        const now = this.history.get(seg);
        if (this.connected && now && now.nova && !same(now.nova, want)) logAll("ev", `Segment ${seg + 1}: the Nova hasn't shown the edit yet. It's kept on the remote, marked Edited.`);
      }, 2500);
    }
    if (changed) {
      saveHistoryEdits();
      const out = [...this.history.entries()].sort((a, b) => b[0] - a[0]).slice(0, 10).map(e => e[1]);
      while (out.length < 10) out.push(null);
      V["metadata.history"] = out; this.markDirty("metadata.history");
    }
  },
  /* REC and STOP: sent exactly as the Aria-8 sends its own buttons (CMD 25: button, 00 = press, 80 = release).
     The Nova's record state confirms whether it worked. */
  /* Which input the Nova's focused-input meter (CMD 10 byte 16) is most likely showing. */
  m10seen: {}, cmdSeen: {},
  /* Per-receiver values kept as remote settings (RX 1–8), logged when they change. */
  /* RX 1–8 from a CMD 50 channel (= the transmitter's ZaxNet ID), using the IDs the Nova reports for RX 1–8, and
     Ferris's Nov 1 numbering (12, 1–7) until those are known. */
  rxOfZid(ch) {
    const ids = get("input.zaxnet.id") || [];
    for (let r = 0; r < 8; r++) if (ids[14 + r] === ch) return r;
    return ch === 12 ? 0 : (ch >= 1 && ch <= 7 ? ch : null);
  },
  zidOfRx(rx) { const z = (get("input.zaxnet.id") || [])[14 + rx]; return Number.isInteger(z) && z >= 1 && z <= 30 ? z : (rx === 0 ? 12 : rx); },
  znetSrc(rx, src) {
    const cur = Array.isArray(V && V["ui.znetsrc"]) ? V["ui.znetsrc"].slice() : Array(8).fill(null);
    if (cur[rx] === src) return; cur[rx] = src; setV("ui.znetsrc", [], cur);
  },
  /* Nov 10 (Ferris's tests, through the Aria and on the direct cable): CMD 50 81 01 <ZaxNet ID> 00 <trim × 4> sets
     the transmitter's gain; the Nova's main screen follows, its RX page doesn't, and the Nova sends back only an echo.
     Steps that come quickly (a dial, a held +) are sent as one message after 120 ms. */
  znetT: {},
  znetSet(rx, units, who) {
    if (!(rx >= 0 && rx < 8)) return;
    units = Math.max(0, Math.min(52, Math.round(+units)));
    this.znetSrc(rx, "remote");
    if (!this.connected || this.listenOnly) { logAll("tx", `RX ${rx + 1} ZNet trim ${units}  (from ${who}; ${this.listenOnly ? "Listen only is on" : "no Nova connected"}, so it's kept on the remote)`); return; }
    if (!this.loaded) return;   /* refused before this (onMessage "set"): read-first */
    clearTimeout(this.znetT[rx]);
    this.znetT[rx] = setTimeout(() => {
      const v = (get("ui.znettrim") || [])[rx]; if (v == null) return;
      const id = this.zidOfRx(rx);
      this.write(NOVA.CMD.STATUS, Buffer.from([0x81, 0x01, id, 0x00, v * 4, 0, 0, 0, 0, 0, 0]), `→ Nova  RX ${rx + 1} ZNet trim ${v}  (transmitter ZaxNet ID ${id}, from ${who})`);
    }, 120);
  },
  rxField(key, rx, val, text) {
    const cur = Array.isArray(V && V[key]) ? V[key].slice() : Array(8).fill(null);
    if (cur[rx] === val) return;
    cur[rx] = val; setV(key, [], cur); logAll("rx", "Nova: " + text(val));
  },
  focusCh() { return this.touch && Date.now() < this.touch.until ? this.touch.ch : this.chan; },
  /* Input pages, kept in step with the remote. */
  page: null, pageT: null, lastPageBtn: null, screenName: "", screenAt: 0,
  pageButton(btn, mine) {
    /* After an input-page button press, an "InputConfigure" answer means a page opened; silence means it closed. */
    const at = Date.now(); this.lastPageBtn = btn; this.lastPageBtnAt = at;
    clearTimeout(this.pageT);
    this.pageT = setTimeout(() => {
      if (this.screenAt >= at) return;           // opened (handled by pageOpened)
      if (this.page != null) { const ch = this.page; this.page = null; broadcast({ t: "novaScreen", open: false, ch }); if (!mine) logAll("rx", `Nova: closed the ${inName(ch)} page`); }
    }, 300);   /* the Nova answers an opening press within ~150 ms (live session 8), so 300 ms of silence means it closed */
  },
  pageOpened(ch) {
    clearTimeout(this.pageT);
    if (this.lastPageBtn != null && Date.now() - this.lastPageBtnAt < 700 && savedPages[ch] !== this.lastPageBtn) {
      /* One input per button: whichever input had this button before lets go of it (Nov 13). */
      for (const c of Object.keys(savedPages)) if (+c !== ch && savedPages[c] === this.lastPageBtn) { delete savedPages[c]; logAll("ev", `Aria page button ${this.lastPageBtn - 0x6F} now opens ${inName(ch)} (no longer ${inName(+c)})`); }
      savedPages[ch] = this.lastPageBtn; saveLink(); broadcast({ t: "nova", nova: this.status() });
    }
    this.page = ch; this.lastPageBtn = null;
    broadcast({ t: "novaScreen", open: true, ch });
    logAll("rx", `Nova: opened the ${inName(ch)} page`);
  },
  /* The remote opened or closed an input's page: press that input's Aria button if it's needed and known. */
  pageFromRemote(ch, open) {
    if (!this.connected) return;
    if (open ? this.page === ch : this.page !== ch) return;
    const btn = savedPages[ch];
    if (btn == null) {
      if (open && !this.pageNoted) { this.pageNoted = true; logAll("ev", "To open input pages on the Nova from the remote, press each input's page button on the Aria once so the remote learns which button opens which input."); }
      return;
    }
    if (!open) this.page = null;
    /* Presses are spaced out so a close and an open in quick succession both reach the Nova. */
    const at = Math.max(Date.now(), (this.nextPressAt || 0));
    this.nextPressAt = at + 350;
    setTimeout(() => {
      this.write(NOVA.CMD.BUTTON, Buffer.from([btn, 0x00]), `\u2192 Nova  ${inName(ch)} page button (as the Aria sends it)`);
      setTimeout(() => this.write(NOVA.CMD.BUTTON, Buffer.from([btn, 0x80])), 120);
      this.pageButton(btn, true);
    }, at - Date.now());
  },
  press(button, name, expect) {
    const was = this.state;
    this.write(NOVA.CMD.BUTTON, Buffer.from([button, 0x00]), `\u2192 Nova  ${name} button (as the Aria sends it)`);
    setTimeout(() => this.write(NOVA.CMD.BUTTON, Buffer.from([button, 0x80])), 150);
    setTimeout(() => {
      if (!this.connected) return;
      if (expect === "RECORDING" && this.state !== "RECORDING") logAll("er", "The Nova didn't start recording after REC. Check the Link log (Setup › Connection), and roll from the Aria or the Nova.");
      if (expect === "STOPPED" && was === "RECORDING" && this.state === "RECORDING") logAll("er", "The Nova is still recording after STOP. Stop it from the Aria or the Nova.");
    }, 2500);
  },
  /* Slate and Com (Nov 7, for Stream Deck keys). The Aria's Slate button is CMD 25 90, held while talking (the
     captures show it held 2.5 s and 13 s, press 00 / release 80). The remote presses it the same way: down when the key
     goes down, up when it comes up. Com has never been seen, so it's learned: Setup › Stream Deck › Learn, then a
     press of the Aria's Com button; the first Aria button press that isn't one already known is saved
     (nova-link.json "buttons"). The Aria's own presses also light the keys. A held button is let go after 2 minutes
     in case a key's release never arrives. */
  held: { slate: false, com: false }, holdTimers: {}, learning: null,
  talkCode(what) { return what === "slate" ? 0x90 : what === "com" ? (savedButtons.com ?? null) : null; },
  ariaTalkButton(code, down) {
    const KNOWN = code === 0x80 || code === 0x81 || code === 0x90 || code === 0xA1;
    if (down && this.learning && Date.now() < this.learning.until && !KNOWN) {
      const what = this.learning.what; this.learning = null;
      savedButtons[what] = code; saveLink();
      logAll("ev", `Learned the Aria's ${what === "com" ? "Com" : what} button: CMD 25 ${hex2(code)}.`);
      broadcast({ t: "nova", nova: this.status() }); return;
    }
    for (const what of ["slate", "com"]) if (this.talkCode(what) === code && this.held[what] !== down) {
      this.held[what] = down; logAll("rx", `Aria: ${what === "slate" ? "Slate" : "Com"} ${down ? "pressed" : "released"}`);
      broadcast({ t: "nova", nova: this.status() });
    }
  },
  learn(what) {
    if (what !== "com") return;
    this.learning = { what, until: Date.now() + 20000 };
    logAll("ev", "Learning the Com button: press and let go of Com on the Aria within 20 seconds.");
    broadcast({ t: "nova", nova: this.status() });
    setTimeout(() => { if (this.learning && this.learning.what === what && Date.now() >= this.learning.until) { this.learning = null; logAll("ev", "No new Aria button arrived, so nothing was learned. Is the Aria connected, and does it have a Com button?"); broadcast({ t: "nova", nova: this.status() }); } }, 20100);
  },
  forget(what) { if (what !== "com" || savedButtons[what] == null) return; delete savedButtons[what]; saveLink(); this.held[what] = false; logAll("ev", "Forgot the Aria's Com button."); broadcast({ t: "nova", nova: this.status() }); },
  hold(what, down, who) {
    const code = this.talkCode(what); if (code == null) return false;
    if (this.held[what] === down) return true;
    const name = what === "slate" ? "Slate" : "Com";
    if (!this.write(NOVA.CMD.BUTTON, Buffer.from([code, down ? 0x00 : 0x80]), `\u2192 Nova  ${name} button ${down ? "down" : "up"} (as the Aria sends it${who ? ", from " + who : ""})`)) return false;
    this.held[what] = down;
    clearTimeout(this.holdTimers[what]);
    if (down) this.holdTimers[what] = setTimeout(() => { if (this.held[what]) { logAll("ev", `${name} was held for 2 minutes, so the remote let it go.`); this.hold(what, false, "safety release"); } }, 120000);
    broadcast({ t: "nova", nova: this.status() });
    return true;
  },
  /* Aria solo buttons (live session 11): CMD 25 50+n, one press on, the next off; the Nova doesn't report solo.
     Strip n is the same strip as input-page button 70+n, so the input comes from the learned page buttons
     (falling back to the RX bank: strip n = RX n+1). */
  solo: new Set(),
  soloButton(btn) {
    /* The input on that fader, by exactly the rule the remote's own PFL keys use (faderOf), so both kinds of press
       always land on the same input (Nov 13). */
    const f = btn - 0x50, ch = [...Array(22).keys()].find(c => this.faderOf(c) === f);
    if (ch == null) { logAll("ev", `Aria: PFL on fader ${f + 1}, but the remote doesn't know which input is on it. Press that fader's page button on the Aria once.`); return; }
    if (this.solo.has(ch)) this.solo.delete(ch); else this.solo.add(ch);
    logAll("rx", `Aria: solo ${inName(ch)} ${this.solo.has(ch) ? "on" : "off"}`);
    broadcast({ t: "nova", nova: this.status() });
  },
  /* PFL from the remote (Nov 1). The Aria's PFL keys are CMD 25 50 + fader − 1 (Aria-8: 50–57), press 00 then
     release 80; another Nova 1 user confirmed the Nova takes them from a computer. The fader an input sits on comes
     from the learned page buttons (page button 70 + n is fader n + 1); until one is learned, RX 1–8 are taken to be
     on faders 1–8 (the same fallback as the Aria's own presses). Our button sends aren't echoed back (captures
     live 11 and 22), so the remote keeps the PFL state itself, as it does for the Aria's presses. */
  faderOf(ch) {
    const b = savedPages[ch];
    if (b != null && b >= 0x70 && b <= 0x77) return b - 0x70;
    if (ch >= 14 && ch <= 21 && !Object.values(savedPages).includes(0x70 + ch - 14)) return ch - 14;
    return null;
  },
  /* Nov 14 (0.6.1): move an input's Aria fader from Nova Relay, as the Aria does (cFader 0x22 [fader, 0-255]; Ferris
     confirmed the Nova takes it from a computer). Works while recording: that's mixing. The Nova never reports fader
     positions, so ui.faderpos is where Nova Relay last put each one. Returns true when sent, otherwise the reason. */
  faderSet(ch, v, who) {
    const f = this.faderOf(ch);
    if (f == null) return `${inName(ch)} isn't on an Aria fader the remote knows. Press its page button on the Aria once.`;
    if (this.listenOnly) return "Listen only is on, so nothing is sent.";
    if (!this.connected) return "No Nova connected, so the fader wasn't moved.";
    if (!this.loaded) return `Not sent: Nova Relay is still reading the Nova's settings${this.loadPct != null ? " (" + this.loadPct + "%)" : ""}.`;
    const logs = this._fLog || (this._fLog = {}), now = Date.now(), quiet = now - (logs[ch] || 0) < 600;   /* one log line per drag, not per step */
    if (!quiet) logs[ch] = now;
    if (!this.write(NOVA.CMD.FADER, Buffer.from([f, v]), quiet ? "" : `\u2192 Nova  Fader ${f + 1} (${inName(ch)}) = ${Math.round(v / 2.55)}%  (from ${who})`)) return "Couldn't write to the port.";
    if (V && !Array.isArray(V["ui.faderpos"])) V["ui.faderpos"] = Array(22).fill(null);
    setRaw("ui.faderpos", [ch], v); saveSoon(); broadcast({ t: "set", k: "ui.faderpos", idx: [ch], val: v });
    return true;
  },
  pflMap() { return Array.from({ length: 22 }, (_, ch) => { const f = this.faderOf(ch); return f == null ? 0 : f + 1; }); },
  pfl(ch, who) {
    const f = this.faderOf(ch);
    if (f == null) { logAll("ev", `PFL ${inName(ch)}: the remote doesn't know which Aria fader it's on. Press its page button on the Aria once.`); return; }
    const btn = 0x50 + f;
    /* Spaced like the page buttons, so "all off" doesn't overlap one key's press with another's. */
    const at = Math.max(Date.now(), this.nextPressAt || 0); this.nextPressAt = at + 350;
    setTimeout(() => {
      if (!this.write(NOVA.CMD.BUTTON, Buffer.from([btn, 0x00]), `\u2192 Nova  PFL ${inName(ch)} (Aria fader ${f + 1} PFL key, as the Aria sends it${who ? ", from " + who : ""})`)) return;
      setTimeout(() => this.write(NOVA.CMD.BUTTON, Buffer.from([btn, 0x80])), 150);
      if (this.solo.has(ch)) this.solo.delete(ch); else this.solo.add(ch);
      broadcast({ t: "nova", nova: this.status() });
    }, at - Date.now());
  },
  /* Trim finder (Oct 28): input.configure writes don't move the Nova's page; a trim write to number N lands on some
     input and the Nova echoes it with that input's real number. Send +1 dB then 0 dB to each N and record the echo. */
  scan: null,
  async trimScan(who) {
    if (!this.connected || this.scan) return;
    const sleep = ms => new Promise(r => setTimeout(r, ms)), found = {};
    logAll("ev", `Trim finder started (${who}): sending +1 dB then 0 dB to trim numbers 6–31.`);
    /* Live session 11: numbers 16–21 landed on inputs 6–11 (AES), 10 lower; 6–15 got no answer. If that offset
       holds, RX 1–8 (14–21) sit at 24–31, past the 22-input size, so those go out with a 32-entry size. */
    for (let n = 6; n <= 31 && this.connected; n++) {
      this.scan = { n, hits: [] };
      broadcast({ t: "trimScan", n, done: false });
      this.write(NOVA.CMD.SETTING, NOVA.encodeSetting({ id: 76, type: 1, dims: [trimDims(n)], idx: [n], value: 1 }), `→ Nova  SET  76 INPUT_TRIM_LEVEL[${n}] = +1 dB  (trim finder)`);
      await sleep(700);
      const hit = this.scan.hits.find(h => h.v === 1);
      this.write(NOVA.CMD.SETTING, NOVA.encodeSetting({ id: 76, type: 1, dims: [trimDims(n)], idx: [n], value: 0 }), `→ Nova  SET  76 INPUT_TRIM_LEVEL[${n}] = 0 dB  (trim finder)`);
      await sleep(500);
      if (hit) { found[n] = hit.i; logAll("rx", `Trim finder: number ${n} → ${inName(hit.i)}`); } else logAll("ev", `Trim finder: number ${n} → no answer`);
    }
    this.scan = null;
    for (const k of Object.keys(savedConf)) delete savedConf[k];
    Object.assign(savedConf, found); saveLink();
    broadcast({ t: "trimScan", done: true }); broadcast({ t: "nova", nova: this.status() });
    logAll("ev", `Trim finder done: ${Object.keys(found).length} numbers answered.`);
  },
  /* Open input page n on the Nova the way NovaTouch does (input.configure 153, no index). */
  sendConfigure(n, why) {
    if (!this.connected || this.confSent === n) return;
    this.confSent = n;
    this.write(NOVA.CMD.SETTING, NOVA.encodeSetting({ id: 153, type: 1, value: n }), `→ Nova  SET 153 INPUT_CONFIGURE = ${n}${why ? "  (" + why + ")" : ""}`);
  },
  select(id, slot, n) {
    if (this.which[slot] === n) return;
    this.which[slot] = n;
    const sc = BY_ID.get(id);
    this.write(NOVA.CMD.SETTING, NOVA.encodeSetting({ id, type: 1, value: n }), `→ Nova  SET ${String(id).padStart(3)} ${sc.n} = ${sc.m ? sc.m[n] : n + 1}`);
  }
};
nova.parser = new NOVA.Parser(m => nova.onMessage(m));

/* ---------------------------------------------------------------- auto-connect
   On start-up, and whenever the link drops, the cart looks for the Nova by itself: first on the port that
   worked last time, then on each likely USB serial port (38400 baud, odd parity), giving each a few seconds
   to answer the hello. Pressing Close port pauses this until Connect is pressed again. */
const AUTO_OFF = args.includes("--no-auto");
const auto = {
  on: !AUTO_OFF, trying: null, triedAt: 0, queue: [], seen: new Set(), lastNote: 0,
  likely(list) {
    const names = list.map(p => p.path);
    const pick = process.platform === "darwin" ? names.filter(n => /\/cu\.(usbserial|usbmodem)/i.test(n))
      : process.platform === "win32" ? names.filter(n => /^COM\d+$/i.test(n))
      : names.filter(n => /ttyUSB|ttyACM/.test(n));
    if (process.env.NOVA_REMOTE_TRY) for (const n of process.env.NOVA_REMOTE_TRY.split(",")) { if (!names.includes(n)) names.push(n); pick.push(n); } /* testing */
    /* Windows without the serialport package reads ports with blocking calls, so only retry the port that worked
       before (connect by hand once); everywhere else, scan the likely ports. */
    if (process.platform === "win32" && !SerialPortLib) return savedPort && names.includes(savedPort) ? [savedPort] : [];
    return savedPort && names.includes(savedPort) ? [savedPort, ...pick.filter(n => n !== savedPort)] : pick;
  },
  manual(open) {
    this.trying = null;
    if (open) { if (!this.on && !AUTO_OFF) logAll("ev", "Auto-connect is back on."); this.on = !AUTO_OFF; }
    else { this.on = false; logAll("ev", "Auto-connect paused. Press Connect (Setup \u2192 Cart & Recorder Link) to resume."); }
    broadcast({ t: "serial", serial: Object.assign(serial, { auto: this.on }) });
  },
  found(p) { this.trying = null; this.queue = []; logAll("ev", `Found the Nova on ${p}. Nova Relay will reconnect here automatically.`); },
  async tick() {
    if (!this.on || nova.connected || serial.status === "opening") return;
    const now = Date.now();
    if (this.trying) {
      /* Nov 14: 15 s, not 6: on the direct cable the Nova has taken 10-15 s to answer a new computer, and closing just
         before it answers, then re-opening inside 3-4 s, gets the stream without the settings. */
      if (now - this.triedAt < 15000) return;
      /* Nov 15: noise on this port = something is there, probably a Nova still starting up: stay (up to 90 s). */
      if (nova.noiseLast && performance.now() - nova.noiseLast < 20000 && now - this.triedAt < 90000) return;
      if (nova.quietUntil && performance.now() < nova.quietUntil + 15000) return;   /* waiting for a Nova that's starting up */
      /* Nov 18 (Ferris: "Would also like a faster initial connection"): the only likely port (the Pi box, a Mac with just
         the Nova's cable) stays open, saying hello once a second as NovaTouch does, so a Nova that's ready late is
         picked up within a second, not after a close, a 5 s gap and a new 10-15 s wait as a "new computer". Two or
         more likely ports: try the next one, as before. */
      const likely = this.likely(await listPorts());
      if (likely.length === 1 && likely[0] === this.trying && serialHandle) {
        this.triedAt = now;
        if (!this.loneLogged) { this.loneLogged = true; logAll("ev", `Nova link: ${this.trying} is the only port, so Nova Relay keeps it open and keeps saying hello until the Nova answers.`); }
        return;
      }
      /* No answer: close quietly and drop the empty capture file. */
      const cap = serial.capture, bytes = serial.bytes;
      closeSerial(true); Object.assign(serial, { status: "closed", error: null }); broadcast({ t: "serial", serial });
      if (cap && bytes < 20000) fs.unlink(cap, () => { });
      (this.closedAt || (this.closedAt = {}))[this.trying] = now;
      this.trying = null; return;
    }
    if (serialHandle) return;               /* a port is open (opened by hand) but no Nova yet: leave it */
    if (!this.queue.length) this.queue = this.likely(await listPorts());
    const p = this.queue.shift(); if (!p) { if (now - this.lastNote > 60000) { this.lastNote = now; logAll("ev", "Looking for the Nova\u2026 (no USB serial ports found yet)"); } return; }
    if (!this.seen.has(p) || now - this.lastNote > 60000) { this.seen.add(p); this.lastNote = now; logAll("ev", `Looking for the Nova on ${p}\u2026`); }
    if (this.closedAt && now - (this.closedAt[p] || 0) < 5000) { this.queue.unshift(p); return; }   /* let the Nova see a gap */
    this.trying = p; this.triedAt = now;
    openSerial(p, 38400, "odd");
  }
};
serial.auto = auto.on;
function checkPower() {
  if (!VCGEN) return;
  execFile(VCGEN, ["get_throttled"], { timeout: 4000 }, (err, out) => {
    const m = !err && String(out).match(/throttled=0x([0-9a-f]+)/i); if (!m) return;
    const v = parseInt(m[1], 16), under = !!(v & 0x1), since = !!(v & 0x10000), first = !power.known;
    const was = { ...power }; Object.assign(power, { known: true, under, since });
    if (under && !was.under) logAll("er", "Nova Relay box: its power supply is too weak right now (under-voltage). The Nova's cable, the Aria and a Stream Deck can misbehave and the Nova can freeze. Use the Pi's own supply (a Pi 5 needs the 5 V 5 A one) or a stronger power bank.");
    else if (!under && was.under) logAll("ev", "Nova Relay box: power is back to normal. (It ran short earlier, so if the Nova misbehaved, that's the likely reason.)");
    else if (first && since && !under) logAll("er", "Nova Relay box: its power supply ran short since it started (under-voltage). If the Nova froze or the link shows noise, use a stronger supply.");
    if (under !== was.under || since !== was.since) broadcast({ t: "nova", nova: nova.status() });
  });
}
if (VCGEN) { setTimeout(checkPower, 3000); setInterval(checkPower, 10000); }
setInterval(() => { auto.tick().catch(() => { }); }, 1500);

/* ---------------------------------------------------------------- WebSocket (built in, no packages) */
const clients = new Set();
let nextId = 1;
function frame(op, payload) {
  const len = payload.length; let head;
  if (len < 126) head = Buffer.from([0x80 | op, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([head, payload]);
}
function sendText(c, text) { if (!c.socket.destroyed) c.socket.write(frame(1, Buffer.from(text))); }
const send = (c, obj) => sendText(c, JSON.stringify(obj));
function broadcast(obj, except) { const text = JSON.stringify(obj); for (const c of clients) if (c !== except && c.ready) sendText(c, text); }
function logAll(dir, text, except) { broadcast({ t: "log", dir, text }, except); }
/* Nov 14: a Stream Deck plugged straight into this computer (Linux / the Nova Relay box; --deck = on until switched off
   in Setup). deck/host.js runs the Stream Deck plugin's own key code against it; see deck/manager.js. */
const deck = require("./deck/manager.js").createDeck({ DATA, PORT, FADERS, onByDefault: args.includes("--deck"), logAll, broadcast,
  sendTo: (c, obj) => { if (c.socket) send(c, obj); }, watchers: () => [...clients].filter(c => c.ready && c.deckWatch) });

function parseFrames(c) {
  for (;;) {
    const b = c.buf;
    if (b.length < 2) return;
    const fin = b[0] & 0x80, op = b[0] & 0x0f, masked = b[1] & 0x80;
    let len = b[1] & 0x7f, off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
    if (len > 32 * 1024 * 1024) { c.socket.destroy(); return; }
    const mlen = masked ? 4 : 0;
    if (b.length < off + mlen + len) return;
    let payload = Buffer.from(b.subarray(off + mlen, off + mlen + len));
    if (masked) { const m = b.subarray(off, off + 4); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
    c.buf = b.subarray(off + mlen + len);
    if (op === 8) { c.socket.end(frame(8, Buffer.alloc(0))); return; }
    if (op === 9) { if (!c.socket.destroyed) c.socket.write(frame(10, payload)); continue; }
    if (op === 10) continue;
    c.frags.push(payload);
    if (fin) { const text = Buffer.concat(c.frags).toString("utf8"); c.frags = []; try { onMessage(c, JSON.parse(text)); } catch (e) { console.error("Bad message:", e.message); } }
  }
}
function networkUrls() {
  const out = [];
  if (localOnly()) return out;
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === "IPv4" && !a.internal) out.push({ name, url: `http://${a.address}:${PORT}` });
  }
  const host = os.hostname().replace(/\.local$/i, "");
  if (process.platform === "darwin") out.unshift({ name: "Bonjour name", url: `http://${host}.local:${PORT}` });
  /* Nova Relay box (Pi, Oct 31): the installer sets the friendly address(es) to show first. */
  if (process.env.NOVA_REMOTE_URLS) process.env.NOVA_REMOTE_URLS.split(",").reverse().forEach(u => out.unshift({ name: "Nova Relay box", url: u.trim() }));
  return out;
}
function welcome(c) {
  send(c, { t: "state", V, live: liveMsg(), serial, nova: nova.status(), urls: networkUrls(), local: localOnly(), desktop: DESKTOP, network: shareNet, here: !!c.here, version: VERSION, clientId: c.id, devices: clients.size, deck: deck.info(), update: updStatus() });
}
function onMessage(c, m) {
  switch (m.t) {
    case "network":   /* desktop app: only the computer itself may switch phones and iPads on or off */
      if (c.here) setNetwork(!!m.on);
      break;
    case "hello":
      c.ready = true; c.name = String(m.name || "device").slice(0, 40);
      welcome(c); broadcast({ t: "devices", count: [...clients].filter(x => x.ready).length });
      break;
    case "init": /* the first device to connect supplies the starting setup */
      if (!V && m.V && typeof m.V === "object") {
        V = m.V; saveSoon();
        console.log("Started a new, blank setup. It fills in from the Nova when one connects.");
        for (const o of clients) if (o.ready && o !== c) welcome(o);
      }
      break;
    case "replace": /* "Clear remote setup" on any device clears it on every device, then reloads from the Nova */
      if (m.V && typeof m.V === "object") {
        V = m.V; saveSoon();
        logAll("ev", `Remote setup cleared by ${c.name}${nova.connected ? "; reloading from the Nova" : ""}`);
        for (const o of clients) if (o.ready && o !== c) welcome(o);
        if (nova.connected) { nova.namesCleared = false; nova.reload(); }
      }
      break;
    case "set":
      if (!V || typeof m.k !== "string" || !Array.isArray(m.idx)) return;
      if (m.k === "ui.faderpos") {
        if (!FADERS) { send(c, { t: "set", k: m.k, idx: m.idx, val: null }); break; }
        const ch = m.idx[0]; if (!(ch >= 0 && ch < 22) || m.val == null || !isFinite(+m.val)) return;
        const r = nova.faderSet(ch, Math.max(0, Math.min(255, Math.round(+m.val))), c.name);
        if (r !== true) {   /* not sent: put that device's cap back where it was, and say why (once in a while, not per step) */
          send(c, { t: "set", k: m.k, idx: [ch], val: ((get("ui.faderpos") || [])[ch]) ?? null });
          const rej = nova._fRej || (nova._fRej = {}); if (Date.now() - (rej[ch] || 0) > 3000) { rej[ch] = Date.now(); logAll("ev", `Fader ${inName(ch)}: ${r}`, c); }
        }
        break;
      }
      if ((SEND.get(m.k) || m.k === "metadata.history" || m.k === "ui.znettrim") && nova.connected && !nova.loaded && !nova.listenOnly) {
        /* read-first (Nov 18): put that device's control back to what the remote has, and say why */
        send(c, { t: "set", k: m.k, idx: m.idx, val: get(m.k, m.idx) ?? null });
        const now = Date.now(); if (now - (nova._bounceLog || 0) > 2000) { nova._bounceLog = now; logAll("ev", `Not sent, because Nova Relay is still reading the Nova's settings${nova.loadPct != null ? " (" + nova.loadPct + "%)" : ""}. Try again in a moment.`); }
        break;
      }
      if (m.k === "ui.znettrim") {
        const rx = m.idx[0]; if (!(rx >= 0 && rx < 8) || m.val == null || !isFinite(+m.val)) return;
        const v = Math.max(0, Math.min(52, Math.round(+m.val)));
        setRaw(m.k, [rx], v); saveSoon(); broadcast({ t: "set", k: m.k, idx: [rx], val: v }, c);
        nova.znetSet(rx, v, c.name); break;
      }
      setRaw(m.k, m.idx, m.val);
      if (!DEVICE_KEYS.has(m.k)) saveSoon();
      broadcast({ t: "set", k: m.k, idx: m.idx, val: m.val }, c);
      if (nova.connected) { nova.send(m.k, m.idx, m.val); break; }
      if (m.log) logAll("tx", `${m.log}  (from ${c.name}; no Nova connected, so it's kept on the remote)`, c);
      break;
    case "cmd":
      if (typeof m.name !== "string") return;
      if (nova.connected) {
        if (m.name === "RECORD") nova.press(0x80, "REC", "RECORDING");
        else if (m.name === "STOP") nova.press(0x81, "STOP", "STOPPED");
        else if (JAMS[m.name]) nova.write(NOVA.CMD.ACTION, Buffer.from(JAMS[m.name], "latin1"), `→ Nova  ${JAMS[m.name]}  (as NovaTouch sends it)`);
        else if (/^PFL \d+$/.test(m.name)) nova.pfl(+m.name.slice(4) - 1, c.name);
        else if (/^PFL FIX \d+$/.test(m.name)) { const ch = +m.name.slice(8) - 1; if (ch >= 0 && ch < 22) { if (nova.solo.has(ch)) nova.solo.delete(ch); else nova.solo.add(ch); logAll("ev", `PFL light for ${inName(ch)} corrected to ${nova.solo.has(ch) ? "on" : "off"} by ${c.name} (nothing sent to the Nova)`); broadcast({ t: "nova", nova: nova.status() }); } }
        else if (/^(SLATE|COM) (DOWN|UP)$/.test(m.name)) { const [w, d] = m.name.toLowerCase().split(" "); if (!nova.hold(w, d === "down", c.name)) logAll("ev", "The Aria's Com button isn't learned yet (Setup \u203a Stream Deck \u203a Learn)."); }
        else logAll("ev", `${m.name}: not sent to the Nova (this command isn't known yet).`);
        return;
      }
      logAll("ev", `${m.name}: no Nova connected, so nothing was sent (from ${c.name}).`, c);
      break;
    case "ports":
      listPorts().then(list => send(c, { t: "ports", list }));
      break;
    case "serialOpen":
      auto.manual(true);
      if (typeof m.path === "string" && m.path) { nova.listenOnly = !!m.listen; openSerial(m.path, m.baud, m.parity); }
      break;
    case "serialClose":
      auto.manual(false);
      closeSerial(false);
      break;
    case "trimScan": nova.trimScan(c.name); break;
    case "learnButton": if (nova.connected) nova.learn(m.what); else send(c, { t: "log", dir: "ev", text: "Connect to the Nova (through the Aria) first, then Learn." }); break;
    case "forgetButton": nova.forget(m.what); break;
    case "novaConfigure": if (Number.isInteger(m.n) && m.n >= 0 && m.n < 32) {
        if (!nova.connected) { logAll("ev", `Page finder: not connected to the Nova, so page ${m.n} wasn't sent.`); break; }
        nova.confSent = null; nova.sendConfigure(m.n, "page finder");
        if (captureStream) captureStream.write(`${new Date().toISOString()}  EV page finder: open page ${m.n} (${c.name})\n`);
      } break;
    case "pageMap": if (Number.isInteger(m.n) && m.n >= 0 && m.n < 32) {
        if (Number.isInteger(m.ch) && m.ch >= 0 && m.ch < 22) savedConf[m.n] = m.ch; else delete savedConf[m.n];
        saveLink(); broadcast({ t: "nova", nova: nova.status() });
        logAll("ev", Number.isInteger(m.ch) && m.ch >= 0 ? `Page finder: page ${m.n} opens ${inName(m.ch)} on the Nova (${c.name}).` : `Page finder: page ${m.n} cleared.`);
      } break;
    case "novaInput": if (Number.isInteger(m.ch) && m.ch >= 0 && m.ch < 22) nova.pageFromRemote(m.ch, !!m.open); break;
    case "novaReload":
      nova.reload();
      break;
    case "txPower": {   /* Nov 15: transmitter power from Setup › Transmitters */
      const r = nova.txPower(Number.isInteger(m.unit) ? m.unit : 0, m.v, c.name || "a device");
      if (r !== true) send(c, { t: "log", dir: "ev", text: "Transmitter power: " + r });
      break;
    }
    case "helloMode":   /* Nov 15: which hello to start with; used from the next Connect */
      if (m.mode !== "own" && m.mode !== "touch") break;
      helloMode = m.mode; helloChosen = true; saveLink(); broadcast({ t: "nova", nova: nova.status() });
      logAll("ev", `Nova link: the next Connect says hello as ${helloMode === "touch" ? "NovaTouch (PCnovaT-0.92.03)" : `Nova Relay (${HELLO_OWN.split("#")[0]})`} (set by ${c.name || "a device"}).`);
      break;
    case "clock": clockFromClient(+m.now, c.name || "a device"); break;
    /* Setup › Updates (Nov 18) */
    case "updateCheck": updCheck(c.name || "a device"); break;
    case "updateAuto": if (typeof m.on === "boolean") { upd.auto = m.on; updSave(); updBroadcast(); logAll("ev", `Updates: checking ${m.on ? "on" : "off"} (${c.name || "a device"}).`); if (m.on) updCheck(); } break;
    case "updateInstall": updFromRepo(c.name || "a device").catch(e => { logAll("er", "Update not installed: " + e.message); send(c, { t: "update", update: updStatus(), fail: e.message }); }); break;
    case "updateBack": try { updBack(c.name || "a device"); } catch (e) { send(c, { t: "update", update: updStatus(), fail: e.message }); } break;   /* Pi box: set the clock from a device (--set-clock) */
    /* Nov 14: Stream Deck plugged into this computer: switch, brightness, layouts; key pictures for the Setup page. */
    case "deck": deck.set(m, c.name || "a device"); break;
    case "deckWatch": deck.watch(c, !!m.on); break;
    case "deckPage": deck.showPage(m.page); break;
    case "captureNote": {
      /* Nov 1: notes typed during a tap ("pressed MENU", "opened Input 3") go into the capture file and Link log. */
      const txt = String(m.text || "").replace(/[\r\n]+/g, " ").slice(0, 200).trim(); if (!txt) break;
      if (captureStream) captureStream.write(`${new Date().toISOString()}  NOTE ${txt}\n`);
      logAll("ev", `NOTE  ${txt}  (from ${c.name})`);
      break;
    }
  }
}

/* ---------------------------------------------------------------- button API (Oct 30)
   Plain web addresses for Stream Deck (API Ninja / Web Requests), Bitfocus Companion and other button boxes.
   Every address answers with the same status JSON, so a button can show the state after it's pressed. */
const API_CLIENT = { name: "Stream Deck", ready: false };
const API_HELP = [
  ["/api/status", "state, timecode, scene/take, tone, headphone preset, armed tracks"],
  ["/api/rec", "start recording (same as REC on the Aria)"],
  ["/api/stop", "stop"],
  ["/api/tone", "tone on/off  (also /api/tone/on, /api/tone/off)"],
  ["/api/hp/next", "next headphone preset that's on  (also /api/hp/prev, /api/hp/3)"],
  ["/api/arm/5", "arm or disarm track 5  (also /api/arm/5/on, /api/arm/5/off, /api/arm/all, /api/arm/none)"],
  ["/api/pfl/3", "PFL the input on Aria fader 3 on/off  (also /api/pfl/3/on, /api/pfl/3/off, /api/pfl/off for all off)"],
  ["/api/slate/down", "Slate mic on, as when the Aria's Slate button is held; /api/slate/up lets it go (/api/slate on its own: on, or off if on)"],
  ["/api/scene/number", "next scene number (075A -> 076; leading zeros kept); /api/scene/letter: next letter (075 -> 075A)"],
  ["/api/take/up", "next take +1 (/api/take/down: -1)"],
  ["/api/note/3", "note preset 3 on the take (the one recording, else the next); again clears it. /api/note/text/WILD for your own text, /api/note/clear"],
  ["/api/arm/set/3,4,5", "arm exactly tracks 3, 4 and 5 (the others off)"],
  ["/api/meters", "track and output meter levels in dB (for meter buttons)"],
  ["/api/capture", "the newest serial capture (the raw link log), as a file"],
  ["/api/report.csv", "sound report: every take with file number, start timecode, length, user bits, tracks and note (CSV)"],
  ["/api/page/15", "open (or close) input 15's page on the Nova (inputs 1-22: Analog 1-4, Return 1-2, AES 1-8, RX 1-8)"],
  ["/api/route/3/com1", "Com 1 on OUT 3 on or off (also tone, slate, com2, track-5 for OUT 5-8, input-15 for OUT 1-4; add /on or /off)"],
  ["/api/jam/tc", "jam timecode from the reader (also /api/jam/ub, /api/jam/date, /api/jam/time); not while recording"],
  ["/api/trim/15/up", "input 15 trim +1 dB (/down, /up/3, /set/0)"],
  ["/api/znet/1/up", "RX 1 ZNet trim (transmitter gain) +1 (/down, /up/2, /set/25; 0-52)"],
  ...(FADERS ? [["/api/fader/15/set/200", "move an input's Aria fader (0-255): /set/200, /up, /down, /up/8, /toggle (all the way down and back). Works while recording"]] : []),
  ["/api/scream", "Scream trim on/off: the chosen transmitters drop to the scream ZNet trim, then go back (/on, /off)"],
  ["/api/tx/power/on", "transmitter power for every transmitter: /on, /wake or /low; add a ZaxNet ID for one transmitter (/api/tx/power/low/3)"],
  ["/api/test/power/wake", "EXPERIMENTAL: transmitters On/Wake/Low (cQRXTX 98): /api/test/power/wake for all, /api/test/power/wake/3 for ZaxNet ID 3. Also /api/test/fader|trim|out/<ch>/<0-255> and /api/test/enc/<-63..63>. Not while recording."],
  ["/api/com/down", "Com mic on (the Aria's Com button, once learned in Setup \u203a Stream Deck); /api/com/up lets it go (/api/com: on or off)"],
];
/* Scream trim (Nov 12): the same steps as the Meters page button, for the Stream Deck and button boxes. */
function screamSet(on, who) {
  const st = get("ui.scream.state") || {}, rx = get("ui.scream.rx") || [], lvl = get("ui.scream.level") ?? 15;
  const rxs = [0, 1, 2, 3, 4, 5, 6, 7].filter(i => rx[i]);
  if (on === !!st.on) return { changed: false };
  if (on) {
    if (!rxs.length) return { error: "No receivers chosen for Scream trim (Setup › Scream trim)." };
    const saved = {}, arr = (get("ui.znettrim") || Array(8).fill(null)).slice();
    for (const r of rxs) { saved[r] = arr[r] ?? null; arr[r] = lvl; }
    setV("ui.scream.state", [], { on: true, saved, level: lvl }); setV("ui.znettrim", [], arr);
    for (const r of rxs) nova.znetSet(r, lvl, who);
    logAll("ev", `Scream trim ON from ${who}: ${rxs.map(r => "RX " + (r + 1)).join(", ")} to ${lvl}`);
  } else {
    const saved = st.saved || {}, arr = (get("ui.znettrim") || Array(8).fill(null)).slice(), back = [];
    for (const [k, v] of Object.entries(saved)) { const r = +k; if (v != null && arr[r] === st.level) { arr[r] = v; back.push(r); } }
    setV("ui.scream.state", [], { on: false, saved: null }); setV("ui.znettrim", [], arr);
    for (const r of back) nova.znetSet(r, arr[r], who);
    logAll("ev", `Scream trim off from ${who}: ${back.length ? back.map(r => `RX ${r + 1} back to ${arr[r]}`).join(", ") : "nothing to put back"}`);
  }
  return { changed: true };
}
/* Fader keys and dials: "toggle" sends a fader all the way down and remembers where it was, for the way back. */
const faderPrev = {};
function apiStatus() {
  const live = nova.connected ? nova : sim, hp = get("hpmix.preset") || 1;
  const armed = (get("record.tracks") || []).slice(0, 16).map(Boolean);
  return { ok: true, recorder: nova.connected ? "nova" : "none", state: live.state, recording: live.state === "RECORDING",
    ...(VCGEN ? { boxPower: power.under ? "low" : power.since ? "was low" : power.known ? "ok" : "unknown" } : {}),
    tc: framesToTC(sim.genFrames, sim.fr()), elapsed: Math.floor(live.elapsed || 0),
    scene: get("scene.current") || "", take: get("take.current") || "", slate: `${get("scene.current") || ""}/${get("take.current") || ""}`,
    scream: (() => { const st = get("ui.scream.state") || {}, rx = get("ui.scream.rx") || []; return { on: !!st.on, level: get("ui.scream.level") ?? 15, rx: [0,1,2,3,4,5,6,7].filter(i => rx[i]).map(i => i + 1) }; })(),
    tone: !!get("tone.enable"), hp: hp, hpName: (get("hpmix.names") || [])[hp - 1] || `HP ${hp}`,
    armed: armed.map((a, i) => a ? i + 1 : 0).filter(Boolean), armedCount: armed.filter(Boolean).length,
    pfl: [...nova.solo].map(ch => ({ input: inName(ch), fader: (nova.faderOf(ch) ?? -1) + 1 || null })),
    /* Nov 7: for the Stream Deck plugin's keys (track names on Arm keys, preset names on headphone keys, the input on
       each Aria fader for PFL keys). Older plugins ignore them. */
    version: VERSION,
    tracks: Array.from({ length: 16 }, (_, t) => ({ track: t + 1, name: (get("track.name", [t]) || "").trim(), armed: armed[t] })),
    hpNames: Array.from({ length: 12 }, (_, i) => (get("hpmix.names", [i]) || "").trim() || `HP ${i + 1}`),
    hpOn: Array.from({ length: 12 }, (_, i) => !!get("hpmix.enable", [i])),
    slateMic: !!nova.held.slate, comMic: !!nova.held.com, comKnown: savedButtons.com != null,
    ...driveStatus(),
    ...loggingStatus(),
    inputs: Array.from({ length: 22 }, (_, i) => ({ input: i + 1, label: inName(i), track: soleTrackName(i), trim: get("input.trim.level", [i]) ?? null, pageKnown: savedPages[i] != null || nova.faderOf(i) != null,
      fader: nova.faderOf(i) == null ? null : nova.faderOf(i) + 1, faderPos: ((get("ui.faderpos") || [])[i]) ?? null, faderDown: faderPrev[i] != null })),
    page: nova.page != null ? nova.page + 1 : null,
    outs: Array.from({ length: 8 }, (_, o) => ({ out: o + 1, name: ((get("ui.outnames") || [])[o] || "").trim(),
      tone: !!get("outputmix.tone", [0, o]), slate: !!get("outputmix.slate", [0, o]), com1: !!get("outputmix.com1", [0, o]), com2: !!get("outputmix.com2", [0, o]),
      routes: (get("outputmix.matrix", [0, o]) || []).map((v, sx) => v ? { sx, v } : null).filter(Boolean) })),
    faders: nova.pflMap().reduce((out, f, ch) => { if (f) out[f - 1] = { fader: f, input: inName(ch), track: soleTrackName(ch), pfl: nova.solo.has(ch) }; return out; }, Array(8).fill(null)),
    receivers: Array.from({ length: 8 }, (_, i) => ({ rx: i + 1, freq: ((get("ui.rxfreq") || [])[i]) || null, znetTrim: ((get("ui.znettrim") || [])[i]) ?? null, znetFrom: ((get("ui.znetsrc") || [])[i]) ?? null, tx: ((get("ui.txstate") || [])[i]) || null })) };
}
/* Drives and mirror (Nov 7, for the Stream Deck status keys), from the Nova's status text (setting 145), the same
   reading as the header: " [Pri: 69GB free :: Mirroring (27%)  :: File 2 of 78]", " [CF1: 61GB free (NAME) :: …]",
   " [ ::  :: Mirror = Off]". The first part alternates between the primary and mirror drives, so values are kept. */
const DRIVES = { pri: null, mir: null, mirName: "", state: "", pct: null, file: null, files: null, mode: "" };
function parseDriveStatus(t) {
  const m = String(t || "").match(/^\s*\[(.*)\]\s*$/); if (!m) return;
  const parts = m[1].split("::").map(x => x.trim());
  const drv = parts[0].match(/^(\w+):\s*([\d.]+)\s*([KMGT]?B)\s*free(?:\s*\((.*)\))?/i);
  if (drv) { const gb = +drv[2] * ({ B: 1e-9, KB: 1e-6, MB: 1e-3, GB: 1, TB: 1000 }[drv[3].toUpperCase()] || 1);
    if (/^pri/i.test(drv[1])) DRIVES.pri = gb; else { DRIVES.mir = gb; DRIVES.mirName = drv[4] || ""; } }
  const mi = m[1].match(/Mirroring\s*\((\d{1,3})%\)/i), fi = m[1].match(/File\s+(\d+)\s+of\s+(\d+)/i), mo = m[1].match(/Mirror\s*=\s*(\w+)/i);
  if (mo) DRIVES.mode = mo[1].toUpperCase();
  if (mi) { DRIVES.state = "mirroring"; DRIVES.pct = Math.min(100, +mi[1]); DRIVES.file = fi ? +fi[1] : null; DRIVES.files = fi ? +fi[2] : null; }
  else if (mo) { DRIVES.state = mo[1].toLowerCase(); DRIVES.pct = null; DRIVES.file = DRIVES.files = null; if (DRIVES.state === "off") DRIVES.mir = null; }
}
function driveStatus() {
  const on = nova.connected;
  const behind = DRIVES.state === "mirroring" && DRIVES.files != null ? Math.max(0, DRIVES.files - DRIVES.file) : DRIVES.state && DRIVES.state !== "off" ? 0 : null;
  return {
    driveLeft: on && nova.drive ? Math.round(nova.drive) : null,         /* seconds of recording left at the armed track count */
    volts: on && nova.volts ? nova.volts : null,
    primaryFreeGB: on ? DRIVES.pri : null,
    mirror: on ? { mode: DRIVES.mode || null, state: DRIVES.state || null, pct: DRIVES.pct, file: DRIVES.file, files: DRIVES.files, behind,
      freeGB: DRIVES.mir, name: DRIVES.mirName || "" } : null,
  };
}
/* Logging from buttons (Nov 7): scene numbering as on screen (075A -> 076 / 075B, leading zeros kept; a new scene starts
   at take 1, compared with the scene recorded last), take +1/-1 on the next take, notes on the take. */
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
const lastRecordedScene = () => { const r = (get("metadata.history") || []).find(Boolean); return r ? r.scene : get("scene.current"); };
const sceneKey = v => String(v || "").trim().toUpperCase();
/* A new scene starts at take 1; a scene already in the take list carries on from its highest take (Nov 12). */
const takeForScene = v => {
  if (!v || sceneKey(v) === sceneKey(lastRecordedScene())) return "";
  let best = (get("ui.scenetakes") || {})[sceneKey(v)] ?? null;
  for (const r of get("metadata.history") || []) { if (!r || sceneKey(r.scene) !== sceneKey(v)) continue; const m = String(r.take || "").match(/^\d+/); if (m) best = Math.max(best ?? 0, +m[0]); }
  return best == null ? "1" : String(best + 1);
};
function effectiveNextTake() {
  const tn = String(get("take.next") || "").trim(); if (tn) return tn;
  if (get("scene.next") && get("scene.next") !== get("scene.current")) return "1";
  const m = String(get("take.current") || "").match(/^(\d+)/); return m ? String(+m[1] + 1) : "1";
}
function loggingStatus() {
  const rec = nova.connected ? nova.state === "RECORDING" : false;
  const r = (get("metadata.history") || []).find(Boolean);
  return {
    sceneNext: String(get("scene.next") || "").trim() || String(get("scene.current") || ""), sceneNextSet: !!String(get("scene.next") || "").trim(),
    takeNext: effectiveNextTake(), noteNext: get("note.next") || "", noteCurrent: get("note.current") || "",
    noteTarget: rec ? "current" : "next", notePresets: Array.from({ length: 10 }, (_, i) => (get("note.preset", [i]) || "").trim()),
    lastTake: r ? { seg: r.seg != null ? r.seg + 1 : null, scene: r.scene || "", take: r.take || "", note: r.note || "", length: r.dur ?? null } : null,
  };
}
/* The track an input feeds on its own (lowest-numbered), as the remote shows it on input buttons. */
function soleTrackName(ch) {
  const p = Math.max(0, (get("trackmix.preset") || 1) - 1);
  for (let t = 0; t < 16; t++) {
    let n = 0, found = null;
    for (let i = 0; i < 22; i++) if (get("trackmix.matrix", [p, t, i]) > 0) { n++; found = i; }
    if (n === 1 && found === ch) return (get("track.name", [t]) || "").trim() || `TRK ${t + 1}`;
  }
  return "";
}
function apiSet(k, idx, val) {
  onMessage(API_CLIENT, { t: "set", k, idx, val, log: `SET ${k}${idx.length ? "[" + idx.map(i => i + 1).join(",") + "]" : ""} = ${val}  (button API)` });
}
function soundReportCsv() {
  const rows = nova.history.size ? [...nova.history.entries()].sort((a, b) => a[0] - b[0]).map(([serial, r]) => ({ ...r, seg: serial }))
    : (get("metadata.history") || []).filter(Boolean).slice().sort((a, b) => a.seg - b.seg);
  const q = v => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const head = ["Folder", "File", "Scene", "Take", "Start TC", "Length", "Frame rate", "User bits", "Tracks", "Track names", "Note"];
  const lines = rows.map(r => [r.folder || get("store.folder") || "", r.seg == null ? "" : String(r.seg + 1).padStart(3, "0"), r.scene, r.take, r.start || "",
    r.dur == null ? "" : fmtDur(r.dur), r.fr || "", r.ub || "", r.tracks || "", (r.names || []).join(" / "), r.note || ""].map(q).join(","));
  return [head.join(","), ...lines].join("\r\n") + "\r\n";
}
function apiRoute(req, res, p) {
  /* Open to other apps on the cart network (Sides Pro, Companion…), so allow cross-origin requests. */
  const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  const out = (code, obj) => res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS }).end(JSON.stringify(obj));
  if (req.method === "OPTIONS") { res.writeHead(204, CORS).end(); return; }
  const later = () => setTimeout(() => out(200, apiStatus()), 80);  /* give the change a moment so the reply shows it */
  /* Nov 11: the newest serial capture, so a Pi box (or any computer) can hand over its log from Setup. */
  if (/^\/api\/capture(\.log)?\/?$/i.test(p)) {
    let f = serial.capture && fs.existsSync(serial.capture) ? serial.capture : null;
    if (!f) try { f = fs.readdirSync(DATA).filter(n => /^serial-capture-.*\.log$/.test(n)).map(n => path.join(DATA, n)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null; } catch (_) { f = null; }
    if (!f) return out(404, { ok: false, error: "No serial capture yet. One starts when the serial port is opened." });
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${path.basename(f)}"`, "Cache-Control": "no-store", ...CORS });
    fs.createReadStream(f).pipe(res);
    return;
  }
  if (!V) return out(503, { ok: false, error: "No setup yet: open Nova Relay on a device first." });
  const parts = p.split("/").filter(Boolean).slice(1), [what, a, b, c] = parts.map(x => x.toLowerCase());
  const rec = live => live.state === "RECORDING";
  const live = nova.connected ? nova : sim;
  switch (what) {
    case undefined: case "help":
      return out(200, { ok: true, endpoints: Object.fromEntries(API_HELP) });
    case "status": return out(200, apiStatus());
    case "deck": return out(200, { ok: true, ...deck.info(), images: deck.images() });   /* Nov 14: Stream Deck on this computer (read only) */
    /* Nov 7: the sound report, every take the Nova has listed (oldest first), as a spreadsheet. */
    case "report": case "report.csv": {
      const d = new Date(), name = `Sound report ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.csv`;
      res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store", ...CORS }).end(soundReportCsv());
      return;
    }
    case "rec": case "record":
      onMessage(API_CLIENT, { t: "cmd", name: "RECORD" }); logAll("ev", "REC from the button API"); return later();
    case "stop":
      onMessage(API_CLIENT, { t: "cmd", name: "STOP" }); logAll("ev", "STOP from the button API"); return later();
    case "tone": {
      const v = a === "on" ? 1 : a === "off" ? 0 : (get("tone.enable") ? 0 : 1);
      apiSet("tone.enable", [], v); return later();
    }
    case "hp": {
      const on = (get("hpmix.enable") || []).map(Boolean), cur = (get("hpmix.preset") || 1) - 1;
      let n = null;
      if (/^\d+$/.test(a || "")) n = +a - 1;
      else if (a === "next" || a === "prev" || !a) {
        const step = a === "prev" ? -1 : 1;
        for (let k = 1; k <= 12; k++) { const j = (cur + step * k + 12) % 12; if (on[j]) { n = j; break; } }
      }
      if (n == null || n < 0 || n > 11) return out(400, { ok: false, error: "Use /api/hp/next, /api/hp/prev or /api/hp/1 to /api/hp/12." });
      apiSet("hpmix.preset", [], n + 1); return later();
    }
    case "pfl": {
      const map = nova.pflMap(), sendPfl = ch => onMessage(API_CLIENT, { t: "cmd", name: `PFL ${ch + 1}` });
      if (a === "off" || a === "none") { [...nova.solo].forEach(sendPfl); return later(); }
      if (!/^\d+$/.test(a || "") || +a < 1 || +a > 8) return out(400, { ok: false, error: "Use /api/pfl/1 to /api/pfl/8 (Aria fader), or /api/pfl/off." });
      const ch = map.indexOf(+a);
      if (ch < 0) return out(409, { ...apiStatus(), ok: false, error: `The remote doesn't know which input is on Aria fader ${a} yet. Press that fader's page button on the Aria once.` });
      const on = nova.solo.has(ch);
      if (b === "on" ? !on : b === "off" ? on : true) sendPfl(ch);
      return later();
    }
    case "scene": {
      const base = get("scene.next") || get("scene.current");
      const v = a === "number" ? sceneNextNumber(base) : a === "letter" ? sceneNextLetter(base) : undefined;
      if (v === undefined) return out(400, { ok: false, error: "Use /api/scene/number or /api/scene/letter." });
      if (!v) return out(409, { ...apiStatus(), ok: false, error: `Can't work out the next scene from "${base || "nothing"}".` });
      apiSet("scene.next", [], v); apiSet("take.next", [], takeForScene(v)); return later();
    }
    case "take": {
      if (a !== "up" && a !== "down") return out(400, { ok: false, error: "Use /api/take/up or /api/take/down." });
      const m = effectiveNextTake().match(/^(\d+)(.*)$/);
      if (!m) return out(409, { ...apiStatus(), ok: false, error: "The next take isn't a number." });
      apiSet("take.next", [], String(Math.max(1, +m[1] + (a === "up" ? 1 : -1))) + m[2]); return later();
    }
    case "note": {
      const rec = nova.connected && nova.state === "RECORDING", k = rec ? "note.current" : "note.next", cur = get(k) || "";
      let v;
      if (a === "clear") v = "";
      else if (a === "text") v = decodeURIComponent(parts.slice(2).join("/")).trim().toUpperCase().slice(0, 40);
      else if (/^\d+$/.test(a || "") && +a >= 1 && +a <= 10) v = (get("note.preset", [+a - 1]) || "").trim();
      else return out(400, { ok: false, error: "Use /api/note/1 to /api/note/10, /api/note/text/WORDS or /api/note/clear." });
      if (a !== "clear" && !v) return out(409, { ...apiStatus(), ok: false, error: "That note preset is empty." });
      apiSet(k, [], v && cur === v ? "" : v); return later();
    }
    case "meters":
      return out(200, { ok: true, recorder: nova.connected ? "nova" : "none", tracks: nova.connected ? nova.trk.slice(0, 16) : Array(16).fill(-120), outs: nova.connected ? nova.out.slice(0, 8) : Array(8).fill(-120) });
    case "page": {
      if (!nova.connected) return out(409, { ...apiStatus(), ok: false, error: "No Nova connected." });
      if (!/^\d+$/.test(a || "") || +a < 1 || +a > 22) return out(400, { ok: false, error: "Use /api/page/1 to /api/page/22." });
      const ch = +a - 1;
      if (savedPages[ch] == null) return out(409, { ...apiStatus(), ok: false, error: `The remote doesn't know which Aria button opens ${inName(ch)} yet. Press its page button on the Aria once.` });
      const open = b === "open" ? true : b === "close" ? false : nova.page !== ch;
      nova.pageFromRemote(ch, open); return later();
    }
    case "route": {
      const o = +a - 1, m = (b || "").match(/^(tone|slate|com1|com2)$|^(track|input)-?(\d+)$/);
      if (!(o >= 0 && o < 8) || !m) return out(400, { ok: false, error: "Use /api/route/<1-8>/tone, slate, com1, com2, track-N (OUT 5-8) or input-N (OUT 1-4), with /on or /off." });
      if (m[1]) {
        const k = "outputmix." + m[1], on = !!get(k, [0, o]), v = c === "on" ? 1 : c === "off" ? 0 : on ? 0 : 1;
        apiSet(k, [0, o], v); return later();
      }
      const n = +m[3] - 1, isTrack = m[2] === "track";
      if (isTrack ? !(o >= 4 && n >= 0 && n < 16) : !(o < 4 && n >= 0 && n < 22)) return out(400, { ok: false, error: isTrack ? "Tracks go to OUT 5-8 (track-1 to track-16)." : "Inputs go to OUT 1-4 (input-1 to input-22)." });
      const sx = isTrack ? 30 + n : n, cur = get("outputmix.matrix", [0, o, sx]) || 0;
      const onVal = isTrack ? 1 : (parts[3] && /pre/i.test(parts[3]) ? 1 : 2);
      const v = c === "on" ? onVal : c === "off" ? 0 : cur ? 0 : onVal;
      apiSet("outputmix.matrix", [0, o, sx], v); return later();
    }
    case "jam": {
      const name = { tc: "JAM TC", ub: "JAM UB", date: "JAM DATE", time: "JAM TIME" }[a];
      if (!name) return out(400, { ok: false, error: "Use /api/jam/tc, /api/jam/ub, /api/jam/date or /api/jam/time." });
      if (!nova.connected) return out(409, { ...apiStatus(), ok: false, error: "No Nova connected." });
      if (rec(live)) return out(409, { ...apiStatus(), ok: false, error: "Jams are locked while recording." });
      onMessage(API_CLIENT, { t: "cmd", name }); logAll("ev", `${name} from the button API`); return later();
    }
    case "trim": {
      const i = +a - 1; if (!(i >= 0 && i < 22)) return out(400, { ok: false, error: "Use /api/trim/<1-22>/up, /down, /up/3 or /set/0." });
      const cur = +get("input.trim.level", [i]) || 0;
      let v = b === "up" ? cur + (+c || 1) : b === "down" ? cur - (+c || 1) : b === "set" && isFinite(+c) ? +c : null;
      if (v == null) return out(400, { ok: false, error: "Use /api/trim/<1-22>/up, /down, /up/3 or /set/0." });
      v = Math.max(-20, Math.min(30, Math.round(v)));
      if (v !== cur) apiSet("input.trim.level", [i], v);
      return later();
    }
    /* Nov 10: transmitter gain (ZNet trim, 0–52) for RX 1–8: /api/znet/1/up, /down, /up/2, /set/25. */
    case "tx": {   /* Nov 15: /api/tx/power/<on|wake|low>[/<ZaxNet ID>] */
      const v = { on: 0, wake: 1, low: 2 }[b];
      if (a !== "power" || v == null) return out(400, { ok: false, error: "Use /api/tx/power/on, /wake or /low, then optionally /<ZaxNet ID 1-30> for one transmitter." });
      const unit = c === undefined ? 0 : +c;
      const r = nova.txPower(Number.isInteger(unit) ? unit : -1, v, "button API");
      if (r !== true) return out(409, { ...apiStatus(), ok: false, error: r });
      return later();
    }
    case "scream": {
      const cur = !!(get("ui.scream.state") || {}).on, want = a === "on" ? true : a === "off" ? false : !cur;
      const r = screamSet(want, "button API");
      if (r.error) return out(409, { ...apiStatus(), ok: false, error: r.error });
      return later();
    }
    /* Hidden experiments (Nov 14, 0.6.0): ZaxNet power-all (cQRXTX sub 98) and surface controls (fader/trim/output/
       encoder, 0x21-0x24) — confirmed in Zaxcom's protocol notes but not yet on a PC link. Guarded: a real Nova, not
       Listen only, not recording, 1.5 s between sends. The UI panel is installed-app only (added by make_local).
       Everything lands in the capture as TEST SEND so the result can be read back. */
    case "test": {
      if (!nova.connected) return out(409, { ...apiStatus(), ok: false, error: "No Nova connected." });
      if (nova.listenOnly) return out(409, { ...apiStatus(), ok: false, error: "Listen only is on; nothing is sent." });
      if (rec(live)) return out(409, { ...apiStatus(), ok: false, error: "Not sent: the Nova is recording." });
      const now = Date.now(); if (now - (nova._lastTest || 0) < 1500) return out(429, { ...apiStatus(), ok: false, error: "Wait a moment between test sends." });
      const send = (cmd, bytes, desc) => { nova._lastTest = now; nova.write(cmd, Buffer.from(bytes), `→ Nova  TEST SEND ${desc}`); logAll("ev", `TEST SEND ${desc}`); };
      const num = (x, lo, hi) => { const n = Math.round(+x); return isFinite(n) && n >= lo && n <= hi ? n : null; };
      if (a === "power") {
        /* Nov 14 (0.6.1): an optional unit = one transmitter's ZaxNet ID (1-30); 0 or none = every transmitter. The Nova
           passes cQRXTX sub-commands other than gain/frequency straight through with our unit byte (firmware
           process_QRXTX_RX12), so whether one transmitter obeys an addressed 98 is up to the transmitter. */
        const map = { on: 0, wake: 1, low: 2 }; if (!(b in map)) return out(400, { ok: false, error: "Use /api/test/power/on, /wake or /low (then optionally /<ZaxNet ID 1-30>)." });
        const unit = c === undefined ? 0 : num(c, 0, 30); if (unit == null) return out(400, { ok: false, error: "The transmitter is a ZaxNet ID, 1-30 (0 = every transmitter)." });
        send(NOVA.CMD.STATUS, [0x98, 0x01, unit, 0x00, map[b], 0, 0, 0, 0, 0, 0], `power ${unit ? "Z" + unit : "ALL"} = ${b.toUpperCase()}  (cQRXTX 98 unit ${unit})`); return later();
      }
      if (a === "fader" || a === "trim" || a === "out") {
        const chMax = a === "out" ? 7 : 15, ch = num(b, 0, chMax), v = num(c, 0, 255);
        if (ch == null || v == null) return out(400, { ok: false, error: `Use /api/test/${a}/<0-${chMax}>/<0-255>.` });
        const cmd = a === "fader" ? NOVA.CMD.FADER : a === "trim" ? NOVA.CMD.TRIM : NOVA.CMD.OUTKNOB;
        const nm = a === "fader" ? "fader" : a === "trim" ? "trim knob" : "output knob";
        send(cmd, [ch, v], `${nm} ${ch} = ${v}`); return later();
      }
      if (a === "enc") {
        const t = num(b, -63, 63); if (t == null || t === 0) return out(400, { ok: false, error: "Use /api/test/enc/<-63..63>." });
        send(NOVA.CMD.ENCODER, [0x03, (0x80 + t) & 0xff], `encoder ${t > 0 ? "+" : ""}${t}`); return later();
      }
      return out(400, { ok: false, error: "Use /api/test/power/..., /fader, /trim, /out/<ch>/<0-255> or /enc/<-63..63>." });
    }
    /* Nov 14 (0.6.1): an input's Aria fader. /api/fader/15/set/200 (0-255), /up, /down, /up/8, /toggle (all the way down,
       and back to where it was). Stepping needs a known position: the Nova never says where a fader is. */
    case "fader": {
      if (!FADERS) return out(404, { ok: false, error: "Faders aren't in this version of Nova Relay yet." });
      const i = +a - 1; if (!(i >= 0 && i < 22)) return out(400, { ok: false, error: "Use /api/fader/<input 1-22>/set/<0-255>, /up, /down, /up/8 or /toggle." });
      const cur = ((get("ui.faderpos") || [])[i]) ?? null;
      const unknown = () => out(409, { ...apiStatus(), ok: false, error: `${inName(i)}'s fader hasn't been set from Nova Relay yet, so there's nothing to step from. Drag it once on the meters, or use /api/fader/${i + 1}/set/<0-255>.` });
      let v;
      if (b === "set" && c !== undefined && c !== "" && isFinite(+c)) v = +c;
      else if (b === "up" || b === "down") { if (cur == null) return unknown(); v = cur + (b === "up" ? 1 : -1) * (Math.abs(+c) || 4); }
      else if (b === "toggle") {
        if (cur == null) return unknown();
        if (cur > 0) v = 0;
        else if (faderPrev[i] != null) v = faderPrev[i];
        else return out(409, { ...apiStatus(), ok: false, error: `${inName(i)}'s fader is already down, with nowhere remembered to go back to.` });
      }
      else return out(400, { ok: false, error: "Use /api/fader/<input 1-22>/set/<0-255>, /up, /down, /up/8 or /toggle." });
      v = Math.max(0, Math.min(255, Math.round(v)));
      const r = nova.faderSet(i, v, "button API"); if (r !== true) return out(409, { ...apiStatus(), ok: false, error: r });
      if (b === "toggle" && cur > 0) faderPrev[i] = cur; else delete faderPrev[i];
      return later();
    }
    case "znet": {
      const r = +a - 1; if (!(r >= 0 && r < 8)) return out(400, { ok: false, error: "Use /api/znet/<1-8>/up, /down, /up/2 or /set/25 (RX 1-8)." });
      const cur = (get("ui.znettrim") || [])[r];
      if ((b === "up" || b === "down") && cur == null) return out(409, { ...apiStatus(), ok: false, error: `RX ${r + 1}'s ZNet trim isn't known yet: change it once on the Nova or the Aria, or use /api/znet/${r + 1}/set/<0-52>.` });
      let v = b === "up" ? cur + (+c || 1) : b === "down" ? cur - (+c || 1) : b === "set" && c !== undefined && isFinite(+c) ? +c : null;
      if (v == null) return out(400, { ok: false, error: "Use /api/znet/<1-8>/up, /down, /up/2 or /set/25 (RX 1-8)." });
      v = Math.max(0, Math.min(52, Math.round(v)));
      if (v !== cur) { const arr = (get("ui.znettrim") || Array(8).fill(null)).slice(); arr[r] = v; setV("ui.znettrim", [], arr); nova.znetSet(r, v, "button API"); }
      return later();
    }
    case "slate": case "com": {
      if (!nova.connected) return out(409, { ...apiStatus(), ok: false, error: "No Nova connected, so there's nothing to talk to." });
      if (nova.talkCode(what) == null) return out(409, { ...apiStatus(), ok: false, error: "The Com button isn't learned yet: Setup \u203a Stream Deck \u203a Learn, then press Com on the Aria." });
      const down = a === "down" ? true : a === "up" ? false : a === undefined ? !nova.held[what] : null;
      if (down == null) return out(400, { ok: false, error: `Use /api/${what}/down and /api/${what}/up (or /api/${what} to switch it on or off).` });
      nova.hold(what, down, "button API"); return out(200, apiStatus());
    }
    case "arm": case "disarm": {
      if (rec(live)) return out(409, { ...apiStatus(), ok: false, error: "Track arming is locked while recording." });
      const tracks = get("record.tracks") || [];
      const setT = (i, v) => { if (!!tracks[i] !== !!v) apiSet("record.tracks", [i], v ? 1 : 0); };
      if (a === "set") {
        const want = new Set(String(b || "").split(/[,+ ]/).map(Number).filter(n => n >= 1 && n <= 16));
        if (!want.size) return out(400, { ok: false, error: "Use /api/arm/set/1,3,5 (tracks 1-16)." });
        for (let i = 0; i < 16; i++) setT(i, want.has(i + 1));
        return later();
      }
      if (a === "all" || a === "none" || (what === "disarm" && (a === "all" || !a))) {
        const v = what === "arm" && a === "all" ? 1 : 0;
        for (let i = 0; i < 16; i++) setT(i, v);
        return later();
      }
      if (!/^\d+$/.test(a || "") || +a < 1 || +a > 16) return out(400, { ok: false, error: "Use /api/arm/1 to /api/arm/16, /api/arm/all or /api/arm/none." });
      const i = +a - 1, v = what === "disarm" ? 0 : b === "on" ? 1 : b === "off" ? 0 : (tracks[i] ? 0 : 1);
      setT(i, v); return later();
    }
  }
  return out(404, { ok: false, error: `Unknown address. Try /api/help.` });
}

/* ---------------------------------------------------------------- web server */
/* Help (Nov 6, Ferris): the user manual ships inside every install as public/manual.pdf. On the computer running Nova
   Remote, Help opens it in the system's default PDF app (Preview, Acrobat, the desktop's PDF viewer); phones and iPads
   open /manual.pdf in their own viewer. Only this computer can ask for that, and only for this one file. */
const MANUAL_PDF = path.join(PUBLIC, "manual.pdf");
function openManual(req, res) {
  const reply = (code, o) => res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }).end(JSON.stringify(o));
  if (req.method !== "POST") return reply(405, { ok: false, error: "Use POST" });
  if (!isLoopback(req.socket.remoteAddress)) return reply(403, { ok: false, error: "Opens on the cart computer only; this device opens /manual.pdf itself." });
  if (!fs.existsSync(MANUAL_PDF)) return reply(404, { ok: false, error: "This install has no manual." });
  const [cmd, args] = process.platform === "darwin" ? ["open", [MANUAL_PDF]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", MANUAL_PDF]] : ["xdg-open", [MANUAL_PDF]];
  let done = false;
  const finish = (ok, err) => { if (done) return; done = true; if (ok) logAll("ev", "Opened the user manual"); reply(ok ? 200 : 500, ok ? { ok: true } : { ok: false, error: err }); };
  try {
    /* open / xdg-open / start hand the file to the PDF app and exit; a non-zero exit means no app took it (then the
       remote opens it in the browser instead). One still running after 4 s is taken as opened. */
    const ch = spawn(cmd, args, { detached: true, stdio: "ignore", windowsHide: true });
    ch.once("error", e => finish(false, e.message));
    ch.once("exit", code => finish(code === 0, `No PDF app opened the manual (${cmd} exit ${code})`));
    setTimeout(() => finish(true), 4000).unref(); ch.unref();
  } catch (e) { finish(false, e.message); }
}
/* Setup › Updates › Install from a file (Nov 18): the zip, sent as the request body from any device's page. */
function updUpload(req, res) {
  const reply = (code, o) => res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }).end(JSON.stringify(o));
  if (req.method !== "POST") return reply(405, { ok: false, error: "Use POST" });
  const who = String(req.headers["x-nova-device"] || "a device").slice(0, 40);
  const no = updRefuse(); if (no) { req.resume(); return reply(409, { ok: false, error: no }); }
  const chunks = []; let n = 0, over = false;
  req.on("data", d => { n += d.length; if (n > 40 * 1024 * 1024) { over = true; req.destroy(); } else chunks.push(d); });
  req.on("end", () => {
    if (over) return;
    try { updFromFile(Buffer.concat(chunks), who); reply(200, { ok: true }); }
    catch (e) { logAll("er", "Update not installed: " + e.message); reply(400, { ok: false, error: e.message }); }
  });
  req.on("close", () => { if (over) try { reply(413, { ok: false, error: "That file is too big to be a Nova Relay update." }); } catch (_) { } });
}
const TYPES = { ".html": "text/html; charset=utf-8", ".pdf": "application/pdf", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/api" || p.startsWith("/api/")) { apiRoute(req, res, p); return; }
  if (p === "/manual/open") { openManual(req, res); return; }
  if (p === "/update/file") { updUpload(req, res); return; }
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
});
server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if ((req.url || "").split("?")[0] !== "/ws" || !key) { socket.destroy(); return; }
  const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.setNoDelay(true);
  const c = { id: nextId++, socket, buf: Buffer.alloc(0), frags: [], ready: false, name: "device", here: isLoopback(socket.remoteAddress) };
  clients.add(c);
  socket.on("data", d => { c.buf = c.buf.length ? Buffer.concat([c.buf, d]) : d; parseFrames(c); });
  const gone = () => { if (clients.delete(c)) broadcast({ t: "devices", count: [...clients].filter(x => x.ready).length }); };
  socket.on("close", gone); socket.on("error", gone);
});
/* Keep idle connections (and phone Wi-Fi) awake. */
setInterval(() => { for (const c of clients) if (!c.socket.destroyed) c.socket.write(frame(9, Buffer.from("k"))); }, 15000);

/* Every open connection, so switching phones and iPads off can drop theirs. */
const sockets = new Set();
server.on("connection", s => { sockets.add(s); s.on("close", () => sockets.delete(s)); });
let started = false, listenTries = 0;
server.on("error", e => {
  if (started) { logAll("er", `Couldn't change who can connect (${e.code || e.message}). Restart Nova Relay.`); return; }
  if (e.code === "EADDRINUSE" && process.env.NOVA_RESTARTED && (listenTries = (listenTries || 0) + 1) < 40) { setTimeout(() => server.listen(PORT, localOnly() ? "127.0.0.1" : "0.0.0.0"), 250); return; }
  if (e.code === "EADDRINUSE") console.error(`\nPort ${PORT} is already in use. Nova Relay may already be running, or start it on another port:  node server.js --port 8090\n`);
  else console.error(e);
  process.exit(1);
});
/* Desktop app: open or close the remote to phones and iPads without a restart. The window's own connection is on
   127.0.0.1 and stays up; switching off drops every other connection. */
function setNetwork(on) {
  if (!DESKTOP || shareNet === on) return;
  shareNet = on;
  fs.writeFile(DESKTOP_FILE, JSON.stringify({ network: on }), () => { });
  server.close();
  if (!on) for (const s of sockets) if (!isLoopback(s.remoteAddress)) s.destroy();
  server.listen(PORT, on ? "0.0.0.0" : "127.0.0.1", () => {
    const urls = networkUrls();
    logAll("ev", on ? (urls.length ? `Phones and iPads can connect: ${urls.map(u => u.url).join("  or  ")}` : "Phones and iPads are allowed, but this computer isn't on a network yet. Join the cart Wi-Fi.")
      : "Phones and iPads switched off: only this computer can use Nova Relay.");
    broadcast({ t: "net", urls, local: localOnly(), desktop: DESKTOP, network: shareNet });
  });
}
server.listen(PORT, localOnly() ? "127.0.0.1" : "0.0.0.0", () => {
  started = true;
  const urls = networkUrls();
  console.log(`\n  Nova Relay ${VERSION} is running.\n`);
  console.log(`  On this computer:   http://localhost:${PORT}`);
  if (localOnly()) console.log("  This computer only (phones and iPads are off; switch them on in Setup).");
  else if (urls.length) { console.log("  On a phone or iPad (same Wi-Fi):"); for (const u of urls) console.log(`    ${u.url}    (${u.name})`); }
  else console.log("  No network found. Connect this computer to the cart Wi-Fi to use phones and iPads.");
  console.log(`\n  Settings are saved in ${DATA}`);
  console.log(`  Serial: ${SerialPortLib ? "using the serialport package" : "using this computer's built-in serial tools"}`);
  console.log("  Leave this window open while you work. Close it (or press Ctrl+C) to stop.\n");
  if (OPEN_BROWSER) {
    const url = `http://localhost:${PORT}`;
    const [cmd, cargs] = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
    try { spawn(cmd, cargs, { stdio: "ignore", detached: true, windowsHide: true }).unref(); } catch (_) { }
  }
});
const saveNow = () => { if (saveT) { clearTimeout(saveT); saveT = null; if (V) { const out = {}; for (const k in V) if (!DEVICE_KEYS.has(k)) out[k] = V[k]; try { fs.writeFileSync(STATE_FILE, JSON.stringify({ app: "nova-remote", version: VERSION, saved: new Date().toISOString(), V: out })); } catch (_) { } } } };
const shutdown = () => { closeSerial(true); saveNow(); process.exit(0); };
process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);

/* ---------------------------------------------------------------- updates (Nov 18, see update.js)
   Setup › Updates: what's running, a check of github.com/gfssound/nova-relay (at start and every 6 hours while
   "Check for updates" is on, or on demand), Install (only when someone presses it: never by itself), an update file
   from any device, and Go back. Never while the Nova records. After installing, Nova Relay restarts itself:
   systemd restarts the box's service; the AppImage window restarts its server (exit 75); otherwise (the Mac app,
   plain node) it starts the new copy itself and exits. */
const UPD = require("./update.js");
const UPD_BUNDLED = process.env.NOVA_UPDATE_BUNDLED || __dirname;
const UPD_FILE = path.join(DATA, "updates.json");
const upd = { auto: true, checking: false, latest: null, error: null, offline: false, checkedAt: 0, busy: null, announced: null };
try { const j = JSON.parse(fs.readFileSync(UPD_FILE, "utf8")); if (typeof j.auto === "boolean") upd.auto = j.auto; if (j.announced) upd.announced = j.announced; } catch (_) { }
const updSave = () => { try { fs.writeFileSync(UPD_FILE, JSON.stringify({ auto: upd.auto, announced: upd.announced })); } catch (_) { } };
const updCtx = () => ({ data: DATA, running: VERSION, bundledDir: UPD_BUNDLED });
function updStatus() {
  let i = {}; try { i = UPD.info(updCtx()); } catch (_) { i = { running: VERSION }; }
  return { ...i, auto: upd.auto, checking: upd.checking, checkedAt: upd.checkedAt, error: upd.error, offline: upd.offline, busy: upd.busy,
    latest: upd.latest, available: !!(upd.latest && UPD.cmp(upd.latest.version, VERSION) > 0), recording: nova.connected && nova.state === "RECORDING", latestUrl: UPD.latestUrl() };
}
const updBroadcast = () => broadcast({ t: "update", update: updStatus() });
async function updCheck(who) {
  if (upd.checking) return;
  upd.checking = true; updBroadcast();
  try {
    upd.latest = await UPD.checkLatest(); upd.error = null; upd.offline = false;
    if (UPD.cmp(upd.latest.version, VERSION) > 0 && upd.announced !== upd.latest.version) {
      upd.announced = upd.latest.version; updSave();
      logAll("ev", `Nova Relay ${upd.latest.version} is available (this is ${VERSION}). Setup \u203a Updates installs it when you choose; nothing changes until then.`);
    } else if (who) logAll("ev", UPD.cmp(upd.latest.version, VERSION) > 0 ? `Nova Relay ${upd.latest.version} is available (this is ${VERSION}).` : `Nova Relay ${VERSION} is the newest version (checked by ${who}).`);
  } catch (e) { upd.error = e.message; upd.offline = !!e.offline; if (who) logAll("ev", "Updates: " + e.message); }
  upd.checking = false; upd.checkedAt = Date.now(); updBroadcast();
}
function updRefuse() {
  if (upd.busy) return "An update is already being installed.";
  if (nova.connected && nova.state === "RECORDING") return "The Nova is recording. Updates wait until it stops.";
  return null;
}
function updInstalled(r, who) {
  logAll("ev", `Nova Relay ${r.version} installed by ${who}. Restarting into it now; every device reconnects by itself. Settings stay.`);
  upd.busy = "restarting"; broadcast({ t: "update", update: updStatus(), done: { version: r.version, notes: r.notes || [] } });
  setTimeout(() => updRestart(), 1500);
}
async function updFromRepo(who) {
  const no = updRefuse(); if (no) throw new Error(no);
  upd.busy = "downloading"; updBroadcast();
  try {
    const latest = upd.latest && UPD.cmp(upd.latest.version, VERSION) > 0 ? upd.latest : await UPD.checkLatest();
    if (UPD.cmp(latest.version, VERSION) <= 0) throw new Error(`Nova Relay ${VERSION} is already the newest version.`);
    logAll("ev", `Updates: downloading Nova Relay ${latest.version} (asked by ${who})…`);
    const buf = await UPD.download(latest);
    const no2 = updRefuse.call(null); if (no2 && no2 !== "An update is already being installed.") throw new Error(no2);
    upd.busy = "installing"; updBroadcast();
    updInstalled(UPD.install(buf, updCtx()), who);
  } catch (e) { upd.busy = null; updBroadcast(); throw e; }
}
function updFromFile(buf, who) {
  const no = updRefuse(); if (no) throw new Error(no);
  upd.busy = "installing"; updBroadcast();
  try { updInstalled(UPD.install(buf, updCtx()), who); }
  catch (e) { upd.busy = null; updBroadcast(); throw e; }
}
function updBack(who) {
  const no = updRefuse(); if (no) throw new Error(no);
  const r = UPD.rollback(updCtx());
  logAll("ev", `Going back to Nova Relay ${r.version} (asked by ${who}). Restarting now.`);
  upd.busy = "restarting"; broadcast({ t: "update", update: updStatus(), done: { version: r.version, back: true } });
  setTimeout(() => updRestart(), 1500);
}
function updRestart() {
  closeSerial(true); saveNow();
  try { server.close(); } catch (_) { }
  for (const s of sockets) try { s.destroy(); } catch (_) { }
  if (process.env.INVOCATION_ID) { console.log("Restarting (systemd starts Nova Relay again)."); process.exit(0); }   /* the box: Restart=always */
  if (process.env.NOVA_PARENT_RESTARTS === "1") process.exit(75);   /* the AppImage window starts its server again */
  const argv = process.argv.slice(1); if (!argv.includes("--no-open")) argv.push("--no-open");
  const env = { ...process.env, NOVA_RESTARTED: "1" }; delete env.NOVA_UPDATE_RUNNING; delete env.NOVA_UPDATE_BUNDLED;
  try { spawn(process.execPath, argv, { cwd: process.cwd(), env, detached: true, stdio: "inherit" }).unref(); }
  catch (e) { console.error("Couldn't restart Nova Relay: " + e.message + ". Start it again by hand."); }
  setTimeout(() => process.exit(0), 200);
}
/* running from an update: once it has served for 20 s it counts as working (no more fallback counting) */
if (process.env.NOVA_UPDATE_RUNNING) setTimeout(() => { try { UPD.markGood(DATA, VERSION); } catch (_) { } }, 20000).unref();
setTimeout(() => { if (upd.auto) updCheck(); }, 20000).unref();
setInterval(() => { if (upd.auto) updCheck(); }, 6 * 3600 * 1000).unref();
