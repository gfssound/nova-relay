/* Nov 14: Stream Deck models Nova Relay can drive itself on Linux / the Pi box (Elgato USB vendor 0x0fd9).
   Facts from the open-source python-elgato-streamdeck (MIT) and node-elgato-stream-deck (MIT) libraries:
   key grid, key picture size and format, how the picture is turned, report layouts.
     gen: "v1"   first Stream Deck: BMP sent in two 8191-byte reports, key numbers mirrored left to right
          "mini" Mini: BMP in 1024-byte reports with a 16-byte header, keys from byte 1
          "v2"   Stream Deck V2 / MK.2 / XL / Neo / +: JPEG in 1024-byte reports with an 8-byte header, keys from byte 4
     plus: the Stream Deck + (dials and an 800×100 touch strip). */
"use strict";
const M = (o) => Object.freeze(o);
const V2 = { gen: "v2", fmt: "jpeg", packet: 1024, header: 8, keyOff: 4 };
const MK2 = M({ ...V2, cols: 5, rows: 3, px: 72, rotate: 0, flipX: true, flipY: true, size: "15" });
const XL = M({ ...V2, cols: 8, rows: 4, px: 96, rotate: 0, flipX: true, flipY: true, size: "32" });
const MINI = M({ gen: "mini", fmt: "bmp", packet: 1024, header: 16, keyOff: 1, cols: 3, rows: 2, px: 80, rotate: 90, flipX: false, flipY: true, size: "6" });
const MODELS = {
  0x0060: M({ name: "Stream Deck (first model)", gen: "v1", fmt: "bmp", packet: 8191, header: 16, keyOff: 1, cols: 5, rows: 3, px: 72, rotate: 0, flipX: true, flipY: true, size: "15" }),
  0x006d: M({ ...MK2, name: "Stream Deck (V2)" }),
  0x0080: M({ ...MK2, name: "Stream Deck MK.2" }),
  0x00a5: M({ ...MK2, name: "Stream Deck MK.2 (scissor keys)" }),
  0x00b9: M({ ...MK2, name: "Stream Deck MK.2" }),
  0x0063: M({ ...MINI, name: "Stream Deck Mini" }),
  0x0090: M({ ...MINI, name: "Stream Deck Mini MK.2" }),
  0x00b3: M({ ...MINI, name: "Stream Deck Mini" }),
  0x00b8: M({ ...MINI, name: "Stream Deck Mini" }),
  0x006c: M({ ...XL, name: "Stream Deck XL" }),
  0x008f: M({ ...XL, name: "Stream Deck XL" }),
  0x00ba: M({ ...XL, name: "Stream Deck XL" }),
  0x009a: M({ ...V2, name: "Stream Deck Neo", cols: 4, rows: 2, px: 96, rotate: 0, flipX: true, flipY: true, touchKeys: 2, size: "8" }),
  0x0084: M({ ...V2, name: "Stream Deck +", cols: 4, rows: 2, px: 120, rotate: 0, flipX: false, flipY: false, dials: 4, strip: [800, 100], plus: true, size: "8+4" }),
};
/* Ones we know of but don't drive (no keys to show, or not checked): named so Setup can say so. */
const OTHERS = { 0x0086: "Stream Deck Pedal", 0x00aa: "Stream Deck Studio", 0x00c6: "Stream Deck + XL" };

/* Layout sizes the editor offers, whatever is plugged in. */
const SIZES = {
  "15": { label: "15 keys (Stream Deck MK.2, V2, first model)", cols: 5, rows: 3 },
  "32": { label: "32 keys (Stream Deck XL)", cols: 8, rows: 4 },
  "6": { label: "6 keys (Stream Deck Mini)", cols: 3, rows: 2 },
  "8": { label: "8 keys (Stream Deck Neo)", cols: 4, rows: 2, touch: 2 },
  "8+4": { label: "8 keys and 4 dials (Stream Deck +)", cols: 4, rows: 2, dials: 4 },
};

/* Feature reports (sent with the HIDIOCSFEATURE ioctl): brightness 0-100. */
function brightnessReport(model, pct) {
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  if (model.gen === "v2") { const b = Buffer.alloc(32); b[0] = 0x03; b[1] = 0x08; b[2] = pct; return b; }
  const b = Buffer.alloc(17); [0x05, 0x55, 0xaa, 0xd1, 0x01, pct].forEach((v, i) => b[i] = v); return b;
}

/* The reports that carry one key's picture. */
function keyReports(model, key, image) {
  const out = [];
  if (model.gen === "v1") {
    const half = Math.floor(image.length / 2), k = mirrorKey(model, key);   /* as the reference library: two halves */
    for (let page = 0; page * half < image.length; page++) {
      const chunk = image.subarray(page * half, Math.min(image.length, (page + 1) * half)), last = (page + 1) * half >= image.length;
      const r = Buffer.alloc(model.packet); [0x02, 0x01, page + 1, 0, last ? 1 : 0, k + 1].forEach((v, i) => r[i] = v);
      chunk.copy(r, model.header); out.push(r);
    }
    return out;
  }
  const room = model.packet - model.header;
  for (let page = 0; page * room < image.length || page === 0; page++) {
    const chunk = image.subarray(page * room, (page + 1) * room), last = (page + 1) * room >= image.length;
    const r = Buffer.alloc(model.packet);
    if (model.gen === "mini") [0x02, 0x01, page, 0, last ? 1 : 0, key + 1].forEach((v, i) => r[i] = v);
    else [0x02, 0x07, key, last ? 1 : 0, chunk.length & 255, chunk.length >> 8, page & 255, page >> 8].forEach((v, i) => r[i] = v);
    chunk.copy(r, model.header); out.push(r);
  }
  return out;
}
/* Stream Deck +: a picture on part of the touch strip. */
function stripReports(model, x, y, w, h, image) {
  const out = [], room = model.packet - 16;
  for (let page = 0; page * room < image.length; page++) {
    const chunk = image.subarray(page * room, (page + 1) * room), last = (page + 1) * room >= image.length;
    const r = Buffer.alloc(model.packet);
    [0x02, 0x0c, x & 255, x >> 8, y & 255, y >> 8, w & 255, w >> 8, h & 255, h >> 8, last ? 1 : 0, page & 255, page >> 8, chunk.length & 255, chunk.length >> 8, 0].forEach((v, i) => r[i] = v);
    chunk.copy(r, 16); out.push(r);
  }
  return out;
}
/* The first Stream Deck numbers its keys right to left in each row. */
function mirrorKey(model, key) { if (model.gen !== "v1") return key; const c = key % model.cols; return key - c + (model.cols - 1 - c); }

/* An input report → what changed. Returns {keys: [bool…]} or {dial: {turn: [n…]} | {push: [bool…]}} or {touch: {x, y, long}}. */
function parseInput(model, d) {
  if (!d || d.length < 2 || d[0] !== 0x01) return null;
  const n = model.cols * model.rows + (model.touchKeys || 0);
  if (model.plus) {
    const type = d[1];
    if (type === 0x00) return { keys: [...d.subarray(4, 4 + n)].map(Boolean) };
    if (type === 0x03) {
      const vals = [...d.subarray(5, 5 + model.dials)];
      if (d[4] === 0x01) return { dial: { turn: vals.map(v => v < 0x80 ? v : v - 0x100) } };
      if (d[4] === 0x00) return { dial: { push: vals.map(Boolean) } };
      return null;
    }
    if (type === 0x02) { const kind = d[4]; if (kind !== 1 && kind !== 2) return null; return { touch: { x: d[6] | (d[7] << 8), y: d[8] | (d[9] << 8), long: kind === 2 } }; }
    return null;
  }
  const raw = d.subarray(model.keyOff, model.keyOff + n);
  if (raw.length < n) return null;
  const keys = [...raw].map(Boolean);
  return { keys: model.gen === "v1" ? keys.map((_, i) => keys[mirrorKey(model, i)]) : keys };
}

module.exports = { MODELS, OTHERS, SIZES, brightnessReport, keyReports, stripReports, parseInput, VENDOR: 0x0fd9 };
