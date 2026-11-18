/* Diagnostics (Nov 18, Ferris: "Let's work on 1, 2, 3 ... at the moment"), after a job where the Nova's headphone
   routing, routing and scene/take changed around connecting and the captures only held a few seconds:
   1. What changed on the Nova since the last session: the Nova's settings are kept in <data>/nova-snapshot.json while
      connected; once its settings have been read at the next connect, anything different is listed in the Link log
      ("Headphones 2 › track 3: L → off"), so it's clear whether the Nova was already like that.
   2. A rolling capture: the last 30 minutes of everything on the Nova's line (and the Link log's events), across port
      re-openings and reconnects, kept in memory; Save the last 5 / 10 / 30 minutes writes it to
      <data>/saved-captures/ with a note.
   3. A problem report: one zip with what's needed to look into a problem (see server.js buildReport). */
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const RING_MS = 30 * 60 * 1000, RING_MAX_BYTES = 24 * 1024 * 1024;

/* ---- zip writer (deflate), for the report ---- */
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(b) { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function dosTime(d) { return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }
function writeZip(entries) {
  const parts = [], central = []; let off = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8"), data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data), "utf8");
    const comp = zlib.deflateRawSync(data), crc = crc32(data), { time, date } = dosTime(e.date || new Date());
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
    parts.push(lh, name, comp);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(time, 12); ch.writeUInt16LE(date, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    central.push(ch, name);
    off += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}

function createDiag({ DATA, VERSION }) {
  /* ---- 2. rolling capture + Link log ---- */
  const ring = []; let ringBytes = 0; const logs = [];
  const trim = () => { const old = Date.now() - RING_MS; while (ring.length && (ring[0][0] < old || ringBytes > RING_MAX_BYTES)) ringBytes -= ring.shift()[1].length; };
  function capLine(line) { ring.push([Date.now(), line]); ringBytes += line.length; if (ring.length % 200 === 0) trim(); }
  function logLine(dir, text) {
    if (dir === "raw") return;   /* raw bytes are already in the capture */
    const line = `${new Date().toISOString()}  ${String(dir).toUpperCase().padEnd(3)} ${text}`;
    logs.push(line); if (logs.length > 3000) logs.splice(0, logs.length - 3000);
    if (dir === "ev" || dir === "er") capLine(`${new Date().toISOString()}  LOG ${dir.toUpperCase()} ${text}\n`);
  }
  const SAVED = path.join(DATA, "saved-captures");
  const stamp = () => new Date().toISOString().replace(/[:]/g, "-").replace(/\..+$/, "");
  function captureText(minutes) {
    trim(); const from = Date.now() - Math.max(1, Math.min(30, +minutes || 10)) * 60000;
    return ring.filter(r => r[0] >= from).map(r => r[1]).join("");
  }
  function saveCapture({ minutes = 10, note = "", who = "a device", header = "" }) {
    fs.mkdirSync(SAVED, { recursive: true });
    const m = Math.max(1, Math.min(30, Math.round(+minutes || 10)));
    const body = captureText(m);
    const name = `saved-capture-${stamp()}.log`;
    const head = `# Nova Relay ${VERSION} saved capture: the last ${m} minutes, saved by ${who} at ${new Date().toString()}\n` +
      (note ? `# Note: ${String(note).replace(/\s+/g, " ").slice(0, 400)}\n` : "") + header;
    fs.writeFileSync(path.join(SAVED, name), head + (body || "# (nothing on the line in that time)\n"));
    /* keep the newest 40 */
    const all = savedList(); for (const f of all.slice(40)) try { fs.unlinkSync(path.join(SAVED, f.name)); } catch (_) { }
    return { name, bytes: Buffer.byteLength(head + body), lines: body ? body.split("\n").length - 1 : 0, minutes: m };
  }
  function savedList() {
    try { return fs.readdirSync(SAVED).filter(n => /^saved-capture-[\dT-]+\.log$/.test(n)).map(n => { const st = fs.statSync(path.join(SAVED, n)); return { name: n, size: st.size, mtime: st.mtimeMs }; }).sort((a, b) => b.mtime - a.mtime); }
    catch (_) { return []; }
  }
  const savedPath = name => /^saved-capture-[\dT-]+\.log$/.test(name || "") && fs.existsSync(path.join(SAVED, name)) ? path.join(SAVED, name) : null;
  const ringInfo = () => { trim(); return { lines: ring.length, bytes: ringBytes, since: ring.length ? ring[0][0] : null }; };

  /* ---- 1. the Nova's settings since the last session ---- */
  const SNAP = path.join(DATA, "nova-snapshot.json");
  let lastKey = "";
  function snapSave(values, model) {
    const key = JSON.stringify([model || "", values]); if (key === lastKey) return false;
    const j = JSON.stringify({ saved: new Date().toISOString(), version: VERSION, model: model || "", values });
    try { fs.writeFileSync(SNAP + ".tmp", j); fs.renameSync(SNAP + ".tmp", SNAP); lastKey = key; return true; } catch (_) { return false; }
  }
  function snapRead() { try { return JSON.parse(fs.readFileSync(SNAP, "utf8")); } catch (_) { return null; } }

  return { capLine, logLine, saveCapture, savedList, savedPath, captureText, ringInfo, logs: () => logs.slice(), snapSave, snapRead, writeZip };
}

/* Differences between two copies of the Nova's settings: [{k, idx, from, to}], leaf by leaf. */
function diffValues(prev, now, keys) {
  const out = [];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const walk = (k, idx, a, b) => {
    if (same(a, b)) return;
    if (Array.isArray(a) && Array.isArray(b)) { for (let i = 0; i < Math.max(a.length, b.length); i++) walk(k, [...idx, i], a[i], b[i]); return; }
    out.push({ k, idx, from: a, to: b });
  };
  for (const k of keys) if (k in prev && k in now) walk(k, [], prev[k], now[k]);
  return out;
}

module.exports = { createDiag, diffValues, writeZip, crc32 };
