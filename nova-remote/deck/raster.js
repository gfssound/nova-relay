/* Nov 14: draws the Stream Deck plugin's key pictures (SVG) into pixels, for a Stream Deck plugged into the Pi box.
   Only what the plugin draws is understood: <svg viewBox>, <rect> (x, y, width, height, rx, fill, stroke,
   stroke-width), <circle>, <path> made of M and circular a (arc) segments with a stroke, <polygon> (convex, filled)
   and centred bold <text>. Shapes are anti-aliased from their exact distance to each pixel; text comes from the
   bundled glyphs (font.js), box-filtered to the size asked for, so keys look the same at 72, 80, 96 or 120 pixels. */
"use strict";
const zlib = require("zlib");
const FONT = require("./font.js");

/* ---------------------------------------------------------------- glyphs */
const GLYPH_DATA = zlib.inflateSync(Buffer.from(FONT.DATA, "base64"));
const satCache = new Map();
function glyph(ch) {
  let g = FONT.GLYPHS[ch];
  if (!g) g = FONT.GLYPHS[ch.normalize("NFD")[0]] || FONT.GLYPHS["?"];   /* é → e when missing; else ? */
  const [adv, w, h, ox, oy, off] = g;
  let sat = null;
  if (w && h) {
    sat = satCache.get(ch);
    if (!sat) {   /* summed-area table: (w+1) x (h+1) */
      sat = new Float64Array((w + 1) * (h + 1));
      for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += GLYPH_DATA[off + y * w + x]; sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + row; } }
      satCache.set(ch, sat);
    }
  }
  return { adv, w, h, ox, oy, sat };
}
/* Summed area at a fractional point (bilinear between the table's corners). */
function satAt(g, u, v) {
  u = Math.max(0, Math.min(g.w, u)); v = Math.max(0, Math.min(g.h, v));
  const x0 = Math.floor(u), y0 = Math.floor(v), x1 = Math.min(g.w, x0 + 1), y1 = Math.min(g.h, y0 + 1), fx = u - x0, fy = v - y0, W = g.w + 1, s = g.sat;
  const a = s[y0 * W + x0], b = s[y0 * W + x1], c = s[y1 * W + x0], d = s[y1 * W + x1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}
function textWidth(text, size) { let w = 0; for (const ch of text) w += glyph(ch).adv; return w * size / FONT.EM; }

/* ---------------------------------------------------------------- canvas */
function parseColor(c) {
  if (!c || c === "none") return null;
  c = String(c).trim().toLowerCase();
  if (c === "white") return [255, 255, 255]; if (c === "black") return [0, 0, 0];
  let m = c.match(/^#([0-9a-f]{3})$/); if (m) return [...m[1]].map(x => parseInt(x + x, 16));
  m = c.match(/^#([0-9a-f]{6})$/); if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  return null;
}
class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.rgb = new Uint8Array(w * h * 3); }
  blend(x, y, col, a) {
    if (a <= 0 || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (a > 1) a = 1;
    const i = (y * this.w + x) * 3, p = this.rgb;
    p[i] += (col[0] - p[i]) * a; p[i + 1] += (col[1] - p[i + 1]) * a; p[i + 2] += (col[2] - p[i + 2]) * a;
  }
  /* Cover every pixel in the box with alpha = 0.5 − signed distance (one-pixel soft edge). */
  shade(x0, y0, x1, y1, dist, col, opacity = 1) {
    if (!col) return;
    x0 = Math.max(0, Math.floor(x0 - 1)); y0 = Math.max(0, Math.floor(y0 - 1)); x1 = Math.min(this.w, Math.ceil(x1 + 1)); y1 = Math.min(this.h, Math.ceil(y1 + 1));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const a = 0.5 - dist(x + 0.5, y + 0.5);
      if (a > 0) this.blend(x, y, col, Math.min(1, a) * opacity);
    }
  }
}

/* Signed distances (negative inside). */
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  r = Math.max(0, Math.min(r, hw, hh));
  const qx = Math.abs(px - cx) - hw + r, qy = Math.abs(py - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
/* Distance to a circular arc from angle a0 sweeping by `sweep` radians (sign = direction). */
function sdArc(px, py, cx, cy, r, a0, sweep) {
  let ang = Math.atan2(py - cy, px - cx), rel = sweep >= 0 ? ang - a0 : a0 - ang;
  rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (rel <= Math.abs(sweep)) return Math.abs(Math.hypot(px - cx, py - cy) - r);
  const a1 = a0 + sweep;
  return Math.min(Math.hypot(px - cx - r * Math.cos(a0), py - cy - r * Math.sin(a0)), Math.hypot(px - cx - r * Math.cos(a1), py - cy - r * Math.sin(a1)));
}
function sdPolygon(px, py, pts) {   /* any simple polygon */
  let d = Infinity, inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j], [bx, by] = pts[i];
    d = Math.min(d, sdSegment(px, py, ax, ay, bx, by));
    if ((by > py) !== (ay > py) && px < (ax - bx) * (py - by) / (ay - by) + bx) inside = !inside;
  }
  return inside ? -d : d;
}
/* SVG endpoint arc → centre form (circular arcs only, which is all the plugin draws). */
function arcCenter(x1, y1, r, large, sweepFlag, x2, y2) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = (x2 - x1) / 2, dy = (y2 - y1) / 2, d2 = dx * dx + dy * dy;
  r = Math.max(r, Math.sqrt(d2));
  const h = Math.sqrt(Math.max(0, r * r - d2)) * (large === sweepFlag ? -1 : 1), len = Math.sqrt(d2) || 1;
  const cx = mx - h * dy / len, cy = my + h * dx / len;
  const a0 = Math.atan2(y1 - cy, x1 - cx); let a1 = Math.atan2(y2 - cy, x2 - cx), sw = a1 - a0;
  if (sweepFlag && sw < 0) sw += 2 * Math.PI; if (!sweepFlag && sw > 0) sw -= 2 * Math.PI;
  return { cx, cy, r, a0, sweep: sw };
}

/* ---------------------------------------------------------------- SVG */
const unesc = s => s.replace(/&(amp|lt|gt|quot|#39|apos|#(\d+)|#x([0-9a-f]+));/gi, (m, n, d, x) =>
  d ? String.fromCodePoint(+d) : x ? String.fromCodePoint(parseInt(x, 16)) : { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'" }[n.toLowerCase()]);
function attrs(s) { const o = {}; s.replace(/([\w:-]+)\s*=\s*"([^"]*)"/g, (m, k, v) => { o[k] = unesc(v); return m; }); return o; }
const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; };

function pathSegments(d) {
  const t = String(d).match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const segs = []; let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0;
  const n = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    switch (cmd) {
      case "M": x = sx = n(); y = sy = n(); cmd = "L"; break;
      case "m": x += n(); y += n(); sx = x; sy = y; cmd = "l"; break;
      case "L": case "l": { const nx = cmd === "l" ? x + n() : n(), ny = cmd === "l" ? y + n() : n(); segs.push({ line: [x, y, nx, ny] }); x = nx; y = ny; break; }
      case "H": case "h": { const nx = cmd === "h" ? x + n() : n(); segs.push({ line: [x, y, nx, y] }); x = nx; break; }
      case "V": case "v": { const ny = cmd === "v" ? y + n() : n(); segs.push({ line: [x, y, x, ny] }); y = ny; break; }
      case "A": case "a": {
        const rx = n(), ry = n(); n(); const large = n(), sw = n(), ex = n(), ey = n();
        const nx = cmd === "a" ? x + ex : ex, ny = cmd === "a" ? y + ey : ey;
        segs.push({ arc: arcCenter(x, y, (rx + ry) / 2, !!large, !!sw, nx, ny) }); x = nx; y = ny; break;
      }
      case "Z": case "z": segs.push({ line: [x, y, sx, sy] }); x = sx; y = sy; break;
      default: i++;
    }
  }
  return segs;
}

/* Draw an SVG string onto a new size×size canvas (or w×h). Returns the Canvas. */
function render(svg, w, h = w, background = [0, 0, 0]) {
  const cv = new Canvas(w, h);
  for (let i = 0; i < cv.rgb.length; i += 3) { cv.rgb[i] = background[0]; cv.rgb[i + 1] = background[1]; cv.rgb[i + 2] = background[2]; }
  const root = (svg.match(/<svg\b([^>]*)>/) || [])[1] || "", ra = attrs(root);
  const vb = (ra.viewBox || `0 0 ${ra.width || 144} ${ra.height || 144}`).split(/[\s,]+/).map(Number);
  const s = Math.min(w / vb[2], h / vb[3]), ox = -vb[0] * s, oy = -vb[1] * s;
  const X = v => v * s + ox, Y = v => v * s + oy;
  const re = /<(rect|circle|path|polygon|text)\b([^>]*?)(\/?)>(?:([^<]*)<\/text>)?/g;
  let m;
  while ((m = re.exec(svg))) {
    const tag = m[1], a = attrs(m[2]), fill = a.fill === undefined ? [0, 0, 0] : parseColor(a.fill), stroke = parseColor(a.stroke);
    const sw = num(a["stroke-width"], 1) * s, op = num(a.opacity, 1);
    if (tag === "rect") {
      const x = X(num(a.x)), y = Y(num(a.y)), rw = num(a.width) * s, rh = num(a.height) * s, r = num(a.rx, num(a.ry)) * s;
      if (rw <= 0 || rh <= 0) continue;
      const cx = x + rw / 2, cy = y + rh / 2;
      if (fill) cv.shade(x, y, x + rw, y + rh, (px, py) => sdRoundRect(px, py, cx, cy, rw / 2, rh / 2, r), fill, op);
      if (stroke) cv.shade(x - sw, y - sw, x + rw + sw, y + rh + sw, (px, py) => Math.abs(sdRoundRect(px, py, cx, cy, rw / 2, rh / 2, r)) - sw / 2, stroke, op);
    } else if (tag === "circle") {
      const cx = X(num(a.cx)), cy = Y(num(a.cy)), r = num(a.r) * s;
      if (fill) cv.shade(cx - r, cy - r, cx + r, cy + r, (px, py) => Math.hypot(px - cx, py - cy) - r, fill, op);
      if (stroke) cv.shade(cx - r - sw, cy - r - sw, cx + r + sw, cy + r + sw, (px, py) => Math.abs(Math.hypot(px - cx, py - cy) - r) - sw / 2, stroke, op);
    } else if (tag === "polygon") {
      const v = (a.points || "").trim().split(/[\s,]+/).map(Number), pts = [];
      for (let k = 0; k + 1 < v.length; k += 2) pts.push([X(v[k]), Y(v[k + 1])]);
      if (pts.length < 3) continue;
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      if (fill) cv.shade(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), (px, py) => sdPolygon(px, py, pts), fill, op);
    } else if (tag === "path") {
      if (!stroke) continue;   /* the plugin only strokes paths */
      const segs = pathSegments(a.d).map(g => g.line ? { line: [X(g.line[0]), Y(g.line[1]), X(g.line[2]), Y(g.line[3])] }
        : { arc: { ...g.arc, cx: X(g.arc.cx), cy: Y(g.arc.cy), r: g.arc.r * s } });
      if (!segs.length) continue;
      const dist = (px, py) => { let d = Infinity; for (const g of segs) d = Math.min(d, g.line ? sdSegment(px, py, ...g.line) : sdArc(px, py, g.arc.cx, g.arc.cy, g.arc.r, g.arc.a0, g.arc.sweep)); return d - sw / 2; };
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (const g of segs) {
        const pts = g.line ? [[g.line[0], g.line[1]], [g.line[2], g.line[3]]] : [[g.arc.cx - g.arc.r, g.arc.cy - g.arc.r], [g.arc.cx + g.arc.r, g.arc.cy + g.arc.r]];
        for (const [px, py] of pts) { bx0 = Math.min(bx0, px); by0 = Math.min(by0, py); bx1 = Math.max(bx1, px); by1 = Math.max(by1, py); }
      }
      cv.shade(bx0 - sw, by0 - sw, bx1 + sw, by1 + sw, dist, stroke, op);
    } else if (tag === "text") {
      const text = unesc(m[4] || ""); if (!text || !fill) continue;
      const size = num(a["font-size"], 16) * s, k = size / FONT.EM, anchor = a["text-anchor"] || "start";
      let pen = X(num(a.x)); const base = Y(num(a.y)), tw = textWidth(text, size);
      if (anchor === "middle") pen -= tw / 2; else if (anchor === "end") pen -= tw;
      for (const ch of text) {
        const g = glyph(ch);
        if (g.sat) {
          const gx = pen + g.ox * k, gy = base + g.oy * k, gw = g.w * k, gh = g.h * k;
          const x0 = Math.max(0, Math.floor(gx)), y0 = Math.max(0, Math.floor(gy)), x1 = Math.min(cv.w, Math.ceil(gx + gw)), y1 = Math.min(cv.h, Math.ceil(gy + gh));
          /* Each canvas pixel covers a 1/k × 1/k patch of the glyph: its coverage is that patch's mean. */
          const scale = k * k / 255 * op;
          for (let y = y0; y < y1; y++) {
            const v0 = (y - gy) / k, v1 = (y + 1 - gy) / k;
            for (let x = x0; x < x1; x++) {
              const u0 = (x - gx) / k, u1 = (x + 1 - gx) / k;
              const sum = satAt(g, u1, v1) - satAt(g, u0, v1) - satAt(g, u1, v0) + satAt(g, u0, v0);
              cv.blend(x, y, fill, sum * scale);
            }
          }
        }
        pen += g.adv * k;
      }
    }
  }
  return cv;
}

/* Turn / mirror for the panel (the python-elgato-streamdeck conventions: rotate counter-clockwise first, then flip). */
function transform(cv, { rotate = 0, flipX = false, flipY = false }) {
  let { w, h, rgb } = cv;
  if (rotate % 360) {
    const turns = ((rotate / 90) % 4 + 4) % 4, out = new Uint8Array(rgb.length);
    for (let t = 0; t < turns; t++) {   /* one counter-clockwise quarter turn: new(x, y) = old(w-1-y, x) */
      const nw = h, nh = w;
      for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
        const si = (x * w + (w - 1 - y)) * 3, di = (y * nw + x) * 3;
        out[di] = rgb[si]; out[di + 1] = rgb[si + 1]; out[di + 2] = rgb[si + 2];
      }
      rgb = Uint8Array.from(out); w = nw; h = nh;
    }
  }
  if (flipX || flipY) {
    const out = new Uint8Array(rgb.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const si = ((flipY ? h - 1 - y : y) * w + (flipX ? w - 1 - x : x)) * 3, di = (y * w + x) * 3;
      out[di] = rgb[si]; out[di + 1] = rgb[si + 1]; out[di + 2] = rgb[si + 2];
    }
    rgb = out;
  }
  return { w, h, rgb };
}

module.exports = { render, transform, textWidth, parseColor };
