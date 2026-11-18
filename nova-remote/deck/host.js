/* Nova Relay: Stream Deck plugged straight into the Pi box (or any Linux computer running Nova Relay), Nov 14, 2026.
 *
 * There is no Stream Deck app on Linux, so this stands in for it: it finds the Stream Deck through Linux's hidraw
 * devices, runs the Nova Relay Stream Deck plugin's own key code (plugin.js, the same file the Mac/Windows plugin runs)
 * and plays the Stream Deck app's part — telling the plugin which keys are on screen, passing it presses and dial
 * turns, and putting the pictures it draws (SVG) onto the keys as JPEG or BMP. So the keys look and behave exactly
 * like the plugin's: live labels from /api/status, the same holds, flashes and options.
 *
 * Runs as a child process of server.js (which starts it only on Linux, when turned on in Setup › Stream Deck); the
 * layout comes from the server, and the pictures go back to it for the Setup page. No add-on libraries: plain file
 * reads and writes on /dev/hidrawN, plus python3 (always on Raspberry Pi OS) for the one ioctl that sets brightness.
 *
 * Env: NOVA_DECK_PORT (Nova Relay's port), NOVA_DECK_FADERS=1 (fader keys allowed), NOVA_DECK_SYS / NOVA_DECK_DEV
 * (tests: a stand-in /sys/class/hidraw and /dev; a test device reads from <dev>/hidrawN and writes to <dev>/hidrawN.out).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const MD = require("./models.js");
const LY = require("./layouts.js");
const R = require("./raster.js");
const J = require("./jpeg.js");

const PORT = +(process.env.NOVA_DECK_PORT || 8080);
const FADERS = process.env.NOVA_DECK_FADERS === "1";
const SYS = process.env.NOVA_DECK_SYS || "/sys/class/hidraw";
const DEV = process.env.NOVA_DECK_DEV || "/dev";
const TEST = !!process.env.NOVA_DECK_DEV;
const PFX = "com.gfssound.novaremote.";
const tell = m => { try { if (process.send && process.connected) process.send(m); } catch (_) { } };
const log = text => tell({ t: "log", text });

/* ------------------------------------------------------------------ the plugin, hosted */
let P;
try { P = require("./plugin.js"); } catch (e) { tell({ t: "status", state: "error", error: "The Stream Deck key code is missing from this install (" + e.message + ")." }); process.exit(2); }
const toPlugin = P.host(text => { let m; try { m = JSON.parse(text); } catch (_) { return; } try { fromPlugin(m); } catch (e) { log("Stream Deck: " + e.message); } });
toPlugin({ event: "didReceiveGlobalSettings", payload: { settings: { address: `127.0.0.1:${PORT}` } } });

/* ------------------------------------------------------------------ config from the server */
let config = { enabled: false, brightness: 70, layouts: {} };
const layoutFor = size => LY.normalize(size, config.layouts[size], FADERS);
process.on("message", m => {
  if (!m || m.t !== "config") return;
  const old = config; config = { enabled: !!m.enabled, brightness: +m.brightness || 70, layouts: m.layouts || {} };
  if (!config.enabled) { if (dev) closeDevice("Turned off in Setup", true); return; }
  if (!dev) { scan(); return; }
  if (old.brightness !== config.brightness) setBrightness();
  if (JSON.stringify(old.layouts[dev.model.size]) !== JSON.stringify(config.layouts[dev.model.size])) showPage();
});
process.on("disconnect", () => shutdown());
process.on("SIGTERM", () => shutdown());
process.on("SIGINT", () => shutdown());

/* ------------------------------------------------------------------ finding the Stream Deck */
let dev = null, lastStatus = "", lastError = "";
function status(state, extra = {}) {
  const s = { t: "status", state, ...extra };
  const key = JSON.stringify(s); if (key === lastStatus) return; lastStatus = key; tell(s);
}
function listDecks() {
  let names = [];
  try { names = fs.readdirSync(SYS).filter(n => /^hidraw\d+$/.test(n)).sort((a, b) => +a.slice(6) - +b.slice(6)); } catch (_) { return []; }
  const out = [];
  for (const n of names) {
    let ue = ""; try { ue = fs.readFileSync(path.join(SYS, n, "device", "uevent"), "utf8"); } catch (_) { continue; }
    const id = (ue.match(/^HID_ID=([0-9A-Fa-f]+):([0-9A-Fa-f]+):([0-9A-Fa-f]+)/m) || []);
    if (!id[2] || parseInt(id[2], 16) !== MD.VENDOR) continue;
    const pid = parseInt(id[3], 16);
    out.push({ node: n, path: path.join(DEV, n), pid, model: MD.MODELS[pid] || null, other: MD.OTHERS[pid] || null,
      name: ((ue.match(/^HID_NAME=(.*)$/m) || [])[1] || "").trim(), serial: ((ue.match(/^HID_UNIQ=(.*)$/m) || [])[1] || "").trim() });
  }
  return out;
}
let scanTimer = null;
function scan() {
  clearTimeout(scanTimer); scanTimer = null;
  if (dev || !config.enabled) return;
  const found = listDecks(), use = found.find(d => d.model);
  if (use) { openDevice(use); if (dev) return; }
  else if (found.length) status("unsupported", { name: found[0].other || found[0].name || "this Stream Deck" });
  else status("none");
  scanTimer = setTimeout(scan, 2000);
}

function openDevice(info) {
  let fd, wfd;
  try {
    fd = fs.openSync(info.path, TEST ? fs.constants.O_RDONLY | fs.constants.O_NONBLOCK : "r+");   /* test: a pipe, don't wait for a writer */
    wfd = TEST ? fs.openSync(info.path + ".out", "a") : fd;
  } catch (e) {
    const err = e.code === "EACCES" || e.code === "EPERM"
      ? `Nova Relay isn't allowed to use the ${info.model.name}. On the Nova Relay box, run the box installer again (it adds the permission); on other Linux computers, add the udev rule shown in Setup › Stream Deck.`
      : `Couldn't open the ${info.model.name} (${e.code || e.message}).`;
    if (err !== lastError) { lastError = err; log("Stream Deck: " + err); }
    status("error", { name: info.model.name, error: err });
    return;
  }
  lastError = "";
  dev = { info, model: info.model, fd, wfd, page: 0, ctxs: new Map(), keyCtx: [], down: [], downCtx: [], push: [], queue: new Map(), pumping: false, svgs: {}, alertT: {} };
  log(`Stream Deck: ${info.model.name} plugged in${info.serial ? ` (${info.serial})` : ""}.`);
  status("open", { device: { name: info.model.name, size: info.model.size, serial: info.serial, cols: info.model.cols, rows: info.model.rows, dials: info.model.dials || 0, touch: info.model.touchKeys || 0 } });
  setBrightness();
  readLoop(dev);
  showPage();
}

function closeDevice(why, blank) {
  const d = dev; if (!d) return;
  for (const ctx of d.ctxs.keys()) toPlugin({ event: "willDisappear", context: ctx, payload: {} });
  d.ctxs.clear(); d.queue.clear();
  Object.values(d.alertT).forEach(clearTimeout);
  dev = null;
  if (blank) try { paintAllSync(d, why === "Turned off in Setup" ? "OFF" : "STOPPED"); } catch (_) { }
  try { fs.closeSync(d.fd); } catch (_) { } if (d.wfd !== d.fd) try { fs.closeSync(d.wfd); } catch (_) { }
  log(`Stream Deck: ${why}.`);
  tell({ t: "clear" });
  status(config.enabled ? "none" : "off");
  if (config.enabled) scanTimer = setTimeout(scan, 2000);
}

function readLoop(d) {
  const buf = Buffer.alloc(1024);
  const next = () => fs.read(d.fd, buf, 0, buf.length, null, (err, n) => {
    if (dev !== d) return;
    if (TEST && err && err.code === "EAGAIN") return setTimeout(next, 20);
    if (err || n === 0) {
      /* stand-in device: a pipe with no writer just now; it's "unplugged" when its /sys entry goes */
      if (TEST && !err && fs.existsSync(path.join(SYS, d.info.node))) return setTimeout(next, 20);
      closeDevice("unplugged"); return;
    }
    try { onInput(d, MD.parseInput(d.model, buf.subarray(0, n))); } catch (e) { log("Stream Deck: " + e.message); }
    next();
  });
  next();
}

/* Brightness: a feature report, which needs the HIDIOCSFEATURE ioctl (python3 does it in one line). */
function setBrightness() {
  const d = dev; if (!d) return;
  const rep = MD.brightnessReport(d.model, config.brightness);
  if (TEST) { try { fs.appendFileSync(d.info.path + ".feature", rep.toString("hex") + "\n"); } catch (_) { } return; }
  const py = "import fcntl,os,sys;b=bytes.fromhex(sys.argv[2]);f=os.open(sys.argv[1],os.O_RDWR);fcntl.ioctl(f,(3<<30)|(len(b)<<16)|(0x48<<8)|6,b);os.close(f)";
  execFile("python3", ["-c", py, d.info.path, rep.toString("hex")], { timeout: 5000 }, err => { if (err) log("Stream Deck: couldn't set the brightness (" + (err.code === "ENOENT" ? "python3 not found" : String(err.message).split("\n")[0]) + ")."); });
}

/* ------------------------------------------------------------------ keys on screen */
const keyCount = m => m.cols * m.rows;
function showPage() {
  const d = dev; if (!d) return;
  for (const ctx of d.ctxs.keys()) toPlugin({ event: "willDisappear", context: ctx, payload: {} });
  d.ctxs.clear(); d.svgs = {};
  tell({ t: "clear" });
  const lay = layoutFor(d.model.size), pages = lay.pages.length;
  if (d.page >= pages) d.page = 0;
  const page = lay.pages[d.page], m = d.model;
  d.keyCtx = [];
  page.keys.forEach((slot, i) => {
    if (!slot) { if (i < keyCount(m)) drawSvg(i, BLANK); return; }
    if (slot.a.startsWith("deck.")) { if (i < keyCount(m)) drawSvg(i, pageKey(slot.a, d.page, pages)); return; }
    const ctx = `k${i}`;
    d.ctxs.set(ctx, { kind: "key", i, slot }); d.keyCtx[i] = ctx;
    toPlugin({ event: "willAppear", context: ctx, action: PFX + slot.a, device: "deck", payload: { controller: "Keypad", settings: { ...slot.s }, coordinates: { column: i % m.cols, row: Math.floor(i / m.cols) } } });
  });
  (page.dials || []).forEach((slot, i) => {
    if (!slot) { drawStrip(i, stripSvg(null)); return; }
    const ctx = `d${i}`;
    d.ctxs.set(ctx, { kind: "dial", i, slot });
    toPlugin({ event: "willAppear", context: ctx, action: PFX + slot.a, device: "deck", payload: { controller: "Encoder", settings: { ...slot.s }, coordinates: { column: i, row: 0 } } });
  });
  tell({ t: "page", page: d.page, pages });
}
const BLANK = '<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"></svg>';
function pageKey(a, p, n) {
  const next = a === "deck.next", to = next ? (p + 1) % n : (p - 1 + n) % n;
  if (n < 2) return P.renderKey({ top: "PAGE", big: next ? "▸" : "◂", bigColor: P.C.dim, bottom: "One page" });
  return P.renderKey({ top: `PAGE ${p + 1} / ${n}`, big: next ? "▸" : "◂", bigMax: 40, bottom: `to page ${to + 1}` });
}
/* The Stream Deck app's yellow alert triangle, over the key for a second. */
function alertSvg(svg) {
  const tri = '<rect width="144" height="144" rx="18" fill="#000" opacity="0.55"/><polygon points="72,26 120,110 24,110" fill="#f2c230"/>' +
    '<rect x="67" y="52" width="10" height="34" rx="4" fill="#1a1400"/><circle cx="72" cy="98" r="6" fill="#1a1400"/>';
  return (svg || BLANK).replace(/<\/svg>\s*$/, tri + "</svg>");
}
/* Stream Deck + touch strip, a 200 × 100 part per dial: title, value and a bar (the plugin's $B1 layout). */
function stripSvg(fb) {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fit = (t, max, w) => Math.max(10, Math.min(max, Math.floor(w / (Math.max(1, String(t).length) * 0.62))));
  if (!fb) return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect width="200" height="100" fill="#000"/></svg>';
  const v = fb.indicator && fb.indicator.value != null ? Math.max(0, Math.min(100, +fb.indicator.value)) : null;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">' +
    '<rect width="200" height="100" fill="#17191c"/><rect x="199" y="8" width="1" height="84" fill="#3a3f45"/>' +
    `<text x="100" y="26" font-size="${fit(fb.title, 16, 188)}" font-weight="700" fill="#8a9097" text-anchor="middle">${esc(fb.title)}</text>` +
    `<text x="100" y="62" font-size="${fit(fb.value, 28, 188)}" font-weight="700" fill="#f2f2f2" text-anchor="middle">${esc(fb.value)}</text>` +
    (v == null ? "" : `<rect x="20" y="78" width="160" height="8" rx="4" fill="#3a3f45"/><rect x="20" y="78" width="${(160 * v / 100).toFixed(1)}" height="8" rx="4" fill="#f2f2f2"/>`) +
    "</svg>";
}

function fromPlugin(m) {
  const d = dev; if (!d) return;
  const e = d.ctxs.get(m.context);
  switch (m.event) {
    case "setImage": {
      if (!e || e.kind !== "key") return;
      const img = String((m.payload && m.payload.image) || ""), svg = img.startsWith("data:image/svg+xml,") ? decodeURIComponent(img.slice(19)) : BLANK;
      if (d.alertT[e.i]) { d.svgs[e.i] = svg; return; }
      drawSvg(e.i, svg); return;
    }
    case "setFeedback": if (e && e.kind === "dial") drawStrip(e.i, stripSvg(m.payload || {})); return;
    case "showAlert": {
      if (!e || e.kind !== "key") return;
      clearTimeout(d.alertT[e.i]);
      const keep = d.svgs[e.i]; drawSvg(e.i, alertSvg(keep), true); d.svgs[e.i] = keep;
      d.alertT[e.i] = setTimeout(() => { delete d.alertT[e.i]; if (dev === d && d.keyCtx[e.i] === m.context) drawSvg(e.i, d.svgs[e.i] || BLANK); }, 900);
      return;
    }
    case "setSettings":
      if (!e) return;
      e.slot.s = { ...(m.payload || {}) };
      { const lay = layoutFor(d.model.size), list = lay.pages[d.page] && lay.pages[d.page][e.kind === "dial" ? "dials" : "keys"];
        if (list && list[e.i]) { list[e.i].s = e.slot.s; config.layouts[d.model.size] = lay; } }   /* so the server's copy matches: no redraw */
      tell({ t: "settings", size: d.model.size, page: d.page, kind: e.kind, index: e.i, s: e.slot.s });
      return;
    case "logMessage": log(String((m.payload && m.payload.message) || "")); return;
    default: return;   /* openUrl, sendToPropertyInspector, setGlobalSettings: nothing here */
  }
}

/* ------------------------------------------------------------------ pictures to the keys */
function drawSvg(i, svg, alert) {
  const d = dev; if (!d) return;
  if (!alert) d.svgs[i] = svg;
  tell({ t: "img", page: d.page, key: i, svg });
  if (i >= keyCount(d.model)) return;   /* Neo's touch keys have no picture */
  d.queue.set("k" + i, () => {
    const m = d.model, cv = R.render(svg, m.px), t = R.transform(cv, m);
    const img = m.fmt === "jpeg" ? J.encodeJPEG(t.rgb, t.w, t.h, 95) : J.encodeBMP(t.rgb, t.w, t.h);
    return MD.keyReports(m, i, img);
  });
  pump(d);
}
function drawStrip(i, svg) {
  const d = dev; if (!d || !d.model.strip) return;
  tell({ t: "img", page: d.page, dial: i, svg });
  const w = d.model.strip[0] / d.model.dials, h = d.model.strip[1];
  d.queue.set("d" + i, () => { const cv = R.render(svg, w, h); return MD.stripReports(d.model, i * w, 0, w, h, J.encodeJPEG(cv.rgb, cv.w, cv.h, 95)); });
  pump(d);
}
function pump(d) {
  if (d.pumping) return;
  d.pumping = true;
  setImmediate(async () => {
    while (dev === d && d.queue.size) {
      const [name, make] = d.queue.entries().next().value; d.queue.delete(name);
      let reports; try { reports = make(); } catch (e) { log("Stream Deck: couldn't draw a key (" + e.message + ")"); continue; }
      for (const r of reports) {
        const ok = await new Promise(res => fs.write(d.wfd, r, 0, r.length, null, err => res(!err)));
        if (!ok) { if (dev === d) closeDevice("unplugged"); d.pumping = false; return; }
      }
    }
    d.pumping = false;
  });
}
/* Shutting down: every key says Nova Relay is stopped (written straight away, before the process ends). */
function paintAllSync(d, word) {
  const m = d.model;
  for (let i = 0; i < keyCount(m); i++) {
    const svg = i === 0 ? P.renderKey({ top: "NOVA RELAY", big: word, bigColor: P.C.dim, bigMax: 30 }) : BLANK;
    const cv = R.render(svg, m.px), t = R.transform(cv, m);
    const img = m.fmt === "jpeg" ? J.encodeJPEG(t.rgb, t.w, t.h, 95) : J.encodeBMP(t.rgb, t.w, t.h);
    for (const r of MD.keyReports(m, i, img)) fs.writeSync(d.wfd, r);
  }
  if (m.strip) for (let i = 0; i < m.dials; i++) { const w = m.strip[0] / m.dials, cv = R.render(stripSvg(null), w, m.strip[1]); for (const r of MD.stripReports(m, i * w, 0, w, m.strip[1], J.encodeJPEG(cv.rgb, cv.w, cv.h, 95))) fs.writeSync(d.wfd, r); }
}
let stopping = false;
function shutdown() {
  if (stopping) return; stopping = true;
  if (dev) closeDevice("Nova Relay stopped", true);
  process.exit(0);
}

/* ------------------------------------------------------------------ presses, dials, touch */
function onInput(d, ev) {
  if (!ev) return;
  if (ev.keys) ev.keys.forEach((on, i) => {
    if (on === !!d.down[i]) return;
    d.down[i] = on;
    if (on) keyDown(d, i); else keyUp(d, i);
  });
  if (ev.dial && ev.dial.turn) ev.dial.turn.forEach((t, i) => { if (t) toPlugin({ event: "dialRotate", context: `d${i}`, payload: { ticks: t, pressed: !!d.push[i] } }); });
  if (ev.dial && ev.dial.push) ev.dial.push.forEach((on, i) => {
    if (on === !!d.push[i]) return; d.push[i] = on;
    toPlugin({ event: on ? "dialDown" : "dialUp", context: `d${i}`, payload: {} });
  });
  if (ev.touch && d.model.strip) {
    const i = Math.max(0, Math.min(d.model.dials - 1, Math.floor(ev.touch.x / (d.model.strip[0] / d.model.dials))));
    toPlugin({ event: "touchTap", context: `d${i}`, payload: { tapPos: [ev.touch.x, ev.touch.y], hold: !!ev.touch.long } });
  }
}
function keyDown(d, i) {
  const lay = layoutFor(d.model.size), slot = lay.pages[d.page] && lay.pages[d.page].keys[i];
  tell({ t: "press", key: i });
  if (slot && slot.a.startsWith("deck.")) {
    const n = lay.pages.length; if (n < 2) return;
    d.page = slot.a === "deck.next" ? (d.page + 1) % n : (d.page - 1 + n) % n;
    showPage(); return;
  }
  const ctx = d.keyCtx[i]; d.downCtx[i] = ctx;
  if (ctx) toPlugin({ event: "keyDown", context: ctx, payload: {} });
}
function keyUp(d, i) {
  const ctx = d.downCtx[i]; d.downCtx[i] = null;
  if (ctx && d.ctxs.has(ctx)) toPlugin({ event: "keyUp", context: ctx, payload: {} });
}

/* Page asked for from the Setup page (to edit what's on it). */
process.on("message", m => { if (m && m.t === "showPage" && dev && Number.isInteger(m.page)) { dev.page = m.page; showPage(); } });

status("off");
