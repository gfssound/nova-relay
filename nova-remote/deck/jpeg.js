/* Nov 14: baseline JPEG and 24-bit BMP encoders for Stream Deck key pictures (no add-on libraries on the Pi box).
   Stream Decks from the 2019 Original V2 on take a JPEG per key; the first Original and the Mini take a BMP.
   JPEG: 4:4:4 (no colour subsampling: at key size 4:2:0 smears saturated colours), standard tables (ITU T.81 Annex K),
   quality 95 like the reference Stream Deck libraries. */
"use strict";

const ZIGZAG = [0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28,
  35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63];
const Q_LUM = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];
const Q_CHR = [17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99,
  ...Array(32).fill(99)];
const DC_LUM = [[0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]];
const DC_CHR = [[0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]];
const AC_LUM = [[0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125], [1, 2, 3, 0, 4, 17, 5, 18, 33, 49, 65, 6, 19, 81, 97, 7, 34, 113, 20, 50, 129, 145, 161, 8, 35, 66, 177, 193, 21, 82, 209, 240, 36, 51, 98, 114, 130, 9, 10, 22, 23, 24, 25, 26, 37, 38, 39, 40, 41, 42, 52, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122, 131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163, 164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250]];
const AC_CHR = [[0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119], [0, 1, 2, 3, 17, 4, 5, 33, 49, 6, 18, 65, 81, 7, 97, 113, 19, 34, 50, 129, 8, 20, 66, 145, 161, 177, 193, 9, 35, 51, 82, 240, 21, 98, 114, 209, 10, 22, 36, 52, 225, 37, 241, 23, 24, 25, 26, 38, 39, 40, 41, 42, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122, 130, 131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163, 164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 226, 227, 228, 229, 230, 231, 232, 233, 234, 242, 243, 244, 245, 246, 247, 248, 249, 250]];

/* Canonical Huffman codes: symbol -> [code, length]. */
function codes([bits, vals]) {
  const out = []; let code = 0, k = 0;
  for (let len = 1; len <= 16; len++) { for (let i = 0; i < bits[len - 1]; i++) out[vals[k++]] = [code++, len]; code <<= 1; }
  return out;
}
const H = { dcL: codes(DC_LUM), dcC: codes(DC_CHR), acL: codes(AC_LUM), acC: codes(AC_CHR) };

/* 1-D DCT basis: C[u][x] = c(u)/2 * cos((2x+1)uπ/16) */
const COS = new Float64Array(64);
for (let u = 0; u < 8; u++) for (let x = 0; x < 8; x++) COS[u * 8 + x] = (u === 0 ? Math.SQRT1_2 : 1) / 2 * Math.cos((2 * x + 1) * u * Math.PI / 16);

function scaledTable(base, quality) {
  const q = Math.max(1, Math.min(100, quality | 0)), s = q < 50 ? 5000 / q : 200 - q * 2;
  return base.map(v => Math.max(1, Math.min(255, Math.floor((v * s + 50) / 100))));
}
const tableCache = new Map();
function tables(quality) {
  if (!tableCache.has(quality)) tableCache.set(quality, [scaledTable(Q_LUM, quality), scaledTable(Q_CHR, quality)]);
  return tableCache.get(quality);
}

class Bits {
  constructor() { this.buf = []; this.acc = 0; this.n = 0; }
  put(code, len) {
    for (let i = len - 1; i >= 0; i--) {
      this.acc = (this.acc << 1) | ((code >> i) & 1); this.n++;
      if (this.n === 8) { this.buf.push(this.acc); if (this.acc === 0xff) this.buf.push(0); this.acc = 0; this.n = 0; }
    }
  }
  flush() { if (this.n) this.put((1 << (8 - this.n)) - 1, 8 - this.n); }   /* pad with 1s */
}
const category = v => { v = Math.abs(v); let n = 0; while (v) { n++; v >>= 1; } return n; };
const bitsOf = (v, n) => v >= 0 ? v : v + (1 << n) - 1;

/* rgb: Uint8Array of width*height*3 (R, G, B). */
function encodeJPEG(rgb, width, height, quality = 95) {
  const [qL, qC] = tables(quality);
  const out = [];
  const w16 = v => out.push(v >> 8, v & 255);
  out.push(0xff, 0xd8);                                                           /* SOI */
  out.push(0xff, 0xe0); w16(16); out.push(0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0);   /* APP0 JFIF */
  for (const [id, t] of [[0, qL], [1, qC]]) { out.push(0xff, 0xdb); w16(67); out.push(id); for (let k = 0; k < 64; k++) out.push(t[ZIGZAG[k]]); }
  out.push(0xff, 0xc0); w16(17); out.push(8); w16(height); w16(width); out.push(3, 1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1);   /* SOF0 4:4:4 */
  for (const [cls, t] of [[0x00, DC_LUM], [0x10, AC_LUM], [0x01, DC_CHR], [0x11, AC_CHR]]) {
    out.push(0xff, 0xc4); w16(3 + 16 + t[1].length); out.push(cls, ...t[0], ...t[1]);
  }
  out.push(0xff, 0xda); w16(12); out.push(3, 1, 0x00, 2, 0x11, 3, 0x11, 0, 63, 0);   /* SOS */

  const bits = new Bits(), pred = [0, 0, 0];
  const blk = [new Float64Array(64), new Float64Array(64), new Float64Array(64)], tmp = new Float64Array(64), coef = new Float64Array(64);
  for (let by = 0; by < height; by += 8) for (let bx = 0; bx < width; bx += 8) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const px = Math.min(width - 1, bx + x), py = Math.min(height - 1, by + y), i = (py * width + px) * 3;
      const r = rgb[i], g = rgb[i + 1], b = rgb[i + 2], k = y * 8 + x;
      blk[0][k] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
      blk[1][k] = -0.168736 * r - 0.331264 * g + 0.5 * b;
      blk[2][k] = 0.5 * r - 0.418688 * g - 0.081312 * b;
    }
    for (let c = 0; c < 3; c++) {
      const src = blk[c], q = c ? qC : qL, dc = c ? H.dcC : H.dcL, ac = c ? H.acC : H.acL;
      for (let y = 0; y < 8; y++) for (let u = 0; u < 8; u++) { let s = 0; for (let x = 0; x < 8; x++) s += COS[u * 8 + x] * src[y * 8 + x]; tmp[y * 8 + u] = s; }
      for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) { let s = 0; for (let y = 0; y < 8; y++) s += COS[v * 8 + y] * tmp[y * 8 + u]; coef[v * 8 + u] = s; }
      const zz = new Int32Array(64);
      for (let k = 0; k < 64; k++) zz[k] = Math.round(coef[ZIGZAG[k]] / q[ZIGZAG[k]]);
      const diff = zz[0] - pred[c]; pred[c] = zz[0];
      const n = category(diff); bits.put(dc[n][0], dc[n][1]); if (n) bits.put(bitsOf(diff, n), n);
      let run = 0;
      for (let k = 1; k < 64; k++) {
        const v = zz[k];
        if (!v) { run++; continue; }
        while (run > 15) { bits.put(ac[0xf0][0], ac[0xf0][1]); run -= 16; }
        const m = category(v), sym = (run << 4) | m;
        bits.put(ac[sym][0], ac[sym][1]); bits.put(bitsOf(v, m), m); run = 0;
      }
      if (run) bits.put(ac[0][0], ac[0][1]);                                        /* EOB */
    }
  }
  bits.flush();
  return Buffer.concat([Buffer.from(out), Buffer.from(bits.buf), Buffer.from([0xff, 0xd9])]);
}

/* 24-bit BMP, bottom-up rows of B, G, R, each row padded to 4 bytes. */
function encodeBMP(rgb, width, height) {
  const row = Math.ceil(width * 3 / 4) * 4, size = 54 + row * height, b = Buffer.alloc(size);
  b.write("BM", 0); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14); b.writeInt32LE(width, 18); b.writeInt32LE(height, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28);
  b.writeUInt32LE(row * height, 34); b.writeInt32LE(3780, 38); b.writeInt32LE(3780, 42);
  for (let y = 0; y < height; y++) {
    const o = 54 + (height - 1 - y) * row;
    for (let x = 0; x < width; x++) { const i = (y * width + x) * 3; b[o + x * 3] = rgb[i + 2]; b[o + x * 3 + 1] = rgb[i + 1]; b[o + x * 3 + 2] = rgb[i]; }
  }
  return b;
}

module.exports = { encodeJPEG, encodeBMP };
