/*
 * Nova serial protocol: framing, setting messages and live data.
 *
 * Decoded independently from serial captures of a Nova + Aria-8 (Oct 2026) and matched against the
 * recorder's published settings table (schema.json). See the project notes for the evidence.
 *
 *   Message:  AA | SUM | LEN lo | LEN hi | 00 | CMD | DATA[LEN]
 *             SUM = (LEN lo + LEN hi + 00 + CMD + DATA...) & 0xFF
 *   Port:     38400 baud, 8 data bits, odd parity, 1 stop bit
 */
"use strict";

const SYNC = 0xAA;
const CMD = { METERS_A: 0x10, TRACK_METERS: 0x11, OUT_METERS: 0x12, TIMECODE: 0x16, TICK: 0x18,
  HELLO: 0x20, ENCODER: 0x21, FADER: 0x22, TRIM: 0x23, OUTKNOB: 0x24, BUTTON: 0x25,
  STATUS: 0x50, SCREEN: 0x52, SETTING: 0x55, ACTION: 0x57, EVENT: 0x58, SOLOPFL: 0x75 };
/* ACTION (0x57): NovaTouch sends a plain name with no value, e.g. "jam.tc", "jam.ub", "jam.date", "jam.time" (capture Nov 1). */

function frame(cmd, data) {
  const d = Buffer.from(data);
  const body = Buffer.concat([Buffer.from([d.length & 0xff, (d.length >> 8) & 0xff, 0, cmd]), d]);
  let sum = 0; for (const b of body) sum = (sum + b) & 0xff;
  return Buffer.concat([Buffer.from([SYNC, sum]), body]);
}

/* Splits the incoming byte stream into checked messages. Bad checksums are skipped one byte at a time,
   so the parser resynchronises on the next AA. */
class Parser {
  constructor(onMessage) { this.buf = Buffer.alloc(0); this.onMessage = onMessage; this.bad = 0; }
  push(chunk) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : Buffer.from(chunk);
    let i = 0; const b = this.buf;
    while (i < b.length) {
      if (b[i] !== SYNC) { i++; this.bad++; continue; }
      if (b.length - i < 6) break;
      const len = b[i + 2] | (b[i + 3] << 8);
      if (len > 4096) { i++; this.bad++; continue; }
      if (b.length - i < 6 + len) break;
      let sum = 0; for (let j = i + 2; j < i + 6 + len; j++) sum = (sum + b[j]) & 0xff;
      if (sum !== b[i + 1]) { i++; this.bad++; continue; }
      const msg = { cmd: b[i + 5], data: Buffer.from(b.subarray(i + 6, i + 6 + len)) };
      i += 6 + len;
      try { this.onMessage(msg); } catch (e) { console.error("Nova message handler:", e); }
    }
    this.buf = this.buf.subarray(i);
    if (this.buf.length > 65536) this.buf = Buffer.alloc(0);
  }
}

/* ---- settings (CMD 55) ----
   ID lo | ID hi | type | ndims | dim sizes... | nidx | indices... | value
   type: 0 = text, 1 / 2 / 4 = number of that many bytes (little-endian), 5 = table of key\0value\0 pairs.
   nidx == ndims  -> one element; the value follows (numbers may have trailing zero bytes dropped).
   nidx <  ndims  -> the rest of the array below those indices: sparse (index, value) pairs for the
                     non-zero entries of the next dimension; no pairs means all zero. */
function readText(buf, at) { let e = at; while (e < buf.length && buf[e] !== 0) e++; return [buf.subarray(at, e).toString("latin1"), e + 1]; }
function readNum(buf, at, width) { let v = 0; for (let k = 0; k < width; k++) v += (buf[at + k] || 0) * 2 ** (8 * k); return v; }

function decodeSetting(data) {
  if (data.length < 2) return null;
  const id = data[0] | (data[1] << 8);
  if (data.length < 4) return { id, empty: true };
  const type = data[2], ndims = data[3];
  let p = 4;
  const dims = []; for (let k = 0; k < ndims; k++) dims.push(data[p++]);
  if (p > data.length) return null;
  let nidx = 0; const idx = [];
  if (ndims > 0) { nidx = data[p++] ?? 0; for (let k = 0; k < nidx; k++) idx.push(data[p++]); }
  const out = { id, type, dims, idx };
  if (type === 5) {
    const table = {}; const keys = [];
    while (p < data.length) { const [k, p2] = readText(data, p); if (!k && p2 >= data.length) break; const [v, p3] = readText(data, p2); table[k] = v; keys.push(k); p = p3; }
    out.kind = ndims > 0 && nidx < ndims ? "clear" : "table"; out.table = table; out.keys = keys;
    return out;
  }
  if (ndims === 0 || nidx === ndims) {
    out.kind = "value";
    out.raw = type === 0 ? readText(data, p)[0] : readNum(data, p, type);
    out.rawBytes = data.length - p;
    return out;
  }
  out.kind = "row";
  out.pairs = [];
  if (type === 0) { while (p < data.length) { const i = data[p++]; const [t, p2] = readText(data, p); out.pairs.push([i, t]); p = p2; } }
  else { const w = type || 1; while (p + 1 <= data.length) { const i = data[p++]; out.pairs.push([i, readNum(data, p, w)]); p += w; } }
  return out;
}

/* Builds a setting message the way NovaTouch does: an indexed 0 is sent as no bytes, other numbers use the
   setting's full width (1, 2 or 4 bytes), text is null-terminated. */
function encodeSetting({ id, type, dims = [], idx = [], value }) {
  const head = [id & 0xff, (id >> 8) & 0xff, type, dims.length, ...dims];
  if (dims.length) head.push(idx.length, ...idx);
  let val;
  if (type === 0) val = [...Buffer.from(String(value ?? ""), "latin1"), 0];
  else {
    const w = type; let v = Math.round(+value || 0);
    if (v < 0) v += 2 ** (8 * w);
    val = []; for (let k = 0; k < w; k++) val.push(Math.floor(v / 2 ** (8 * k)) & 0xff);
    if (dims.length && v === 0) val = [];          // indexed zero: no bytes
  }
  return Buffer.from([...head, ...val]);
}

/* ---- live data ---- */
const meterDb = b => b === 0 ? -120 : b - 255;           // 1 dB per step, FF = 0 dBFS, 00 = silence
function decodeTimecode(d) {                               // 00 hh mm ss ff xx MM DD YY 00 01
  if (d.length < 5) return null;
  return { h: d[1], m: d[2], s: d[3], f: d[4], date: d.length >= 9 ? { month: d[6], day: d[7], year: 2000 + d[8] } : null };
}
const hms = t => { const m = String(t || "").match(/(\d+):(\d+):(\d+)/); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : null; };

module.exports = { SYNC, CMD, frame, Parser, decodeSetting, encodeSetting, meterDb, decodeTimecode, hms };
