/* Nov 14: each model's picture turn (rotate counter-clockwise, then flip) must match python-elgato-streamdeck's
   PILHelper (rotate(rotation, expand=True), FLIP_LEFT_RIGHT, FLIP_TOP_BOTTOM). Writes raw and turned pictures. */
const fs = require("fs"), path = require("path"), R = require("../../nova-remote/deck/raster.js"), J = require("../../nova-remote/deck/jpeg.js"), MD = require("../../nova-remote/deck/models.js");
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const svg = '<svg viewBox="0 0 144 144"><rect width="144" height="144" fill="#202020"/><rect x="0" y="0" width="60" height="30" fill="#e0262d"/><circle cx="120" cy="120" r="16" fill="#2fbf71"/><text x="72" y="80" font-size="30" fill="#ffffff" text-anchor="middle">F7</text></svg>';
for (const [pid, m] of Object.entries(MD.MODELS)) {
  if (!["96", "99", "128", "132", "108"].includes(pid)) continue;   /* 0x60 v1, 0x63 mini, 0x80 MK.2, 0x84 +, 0x6c XL */
  const cv = R.render(svg, m.px), t = R.transform(cv, m);
  fs.writeFileSync(path.join(out, `${pid}.json`), JSON.stringify({ px: m.px, rotate: m.rotate, flipX: m.flipX, flipY: m.flipY, fmt: m.fmt }));
  fs.writeFileSync(path.join(out, `${pid}.raw`), Buffer.from(cv.rgb));
  fs.writeFileSync(path.join(out, `${pid}.turned`), Buffer.from(t.rgb));
  fs.writeFileSync(path.join(out, `${pid}.${m.fmt}`), m.fmt === "jpeg" ? J.encodeJPEG(t.rgb, t.w, t.h, 95) : J.encodeBMP(t.rgb, t.w, t.h));
}
