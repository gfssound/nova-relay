/* Nov 14: draw the plugin's real key pictures with deck/raster.js (as JPEG at a size) and with Chromium, side by side. */
const fs = require("fs"), path = require("path");
const P = require("../../streamdeck/com.gfssound.novaremote.sdPlugin/bin/plugin.js");
const R = require("../../nova-remote/deck/raster.js"), J = require("../../nova-remote/deck/jpeg.js");
const out = process.argv[2] || "/tmp/claude-0/-home-claude/10fb85d4-efc5-5dbf-a537-af46f5c1d13e/scratchpad/test/deck/out";
const size = +(process.argv[3] || 72);
fs.mkdirSync(out, { recursive: true });
const st = { ok: true, recording: false, elapsed: 83, armedCount: 3, armed: [1, 2, 3], tone: true, hp: 2, hpName: "BOOM+LAV", hpNames: [], scene: "075A", take: "3",
  sceneNext: "075A", takeNext: "4", tc: "18:22:50:13", recorder: "nova", slate: "075A/3", volts: 13.4, driveLeft: 3 * 3600, primaryFreeGB: 3.2,
  tracks: [{ name: "MIX01", armed: true }, { name: "BOOM01", armed: true }, { name: "LAV01", armed: true }, { name: "LAV02", armed: false }],
  slateMic: false, comMic: true, comKnown: true, scream: { on: false, level: 15, rx: [1, 2] }, pfl: [], faders: [{ pfl: true, track: "BOOM01", input: "RX 1" }],
  receivers: [{ freq: 512.3, tx: "Low", znetTrim: 21 }], inputs: [], notePresets: ["CIRCLE"], noteTarget: "next", noteNext: "", lastTake: { scene: "075A", take: "2", length: 95, note: "CIRCLE" },
  mirror: { state: "mirroring", mode: "CONT", pct: 42, file: 3, files: 9, behind: 2 }, outs: [{ name: "BOOM", com1: true }] };
P.setStatus(st, "ok");
const K = (settings = {}) => ({ settings, msg: "", progress: null });
const list = [["rec", K()], ["stop", K()], ["tone", K()], ["status", K()], ["arm", K({ track: "2" })], ["arm", K({ track: "4" })], ["pfl", K({ fader: "1" })],
  ["com", K()], ["slate", K()], ["hp", K()], ["scene", K()], ["take", K()], ["battery", K()], ["drive", K()], ["primary", K({ blink: false })], ["mirror", K()],
  ["rx", K({ rx: "1" })], ["lasttake", K()], ["note", K()], ["route", K({ out: "1", what: "com1" })], ["jam", K()], ["scream", K()]];
const recSt = { ...st, recording: true };
const svgs = list.map(([a, k]) => [a, P.DRAW[a](st, k)]);
P.setStatus(recSt, "ok"); svgs.push(["rec-rolling", P.DRAW.rec(recSt, K())], ["status-rolling", P.DRAW.status(recSt, K())]);
svgs.push(["offline", P.DRAW.rec(null, K())]);
const t0 = Date.now(); let bytes = 0;
svgs.forEach(([name, svg], i) => {
  const cv = R.render(svg, size); const jpg = J.encodeJPEG(cv.rgb, cv.w, cv.h, 95); bytes += jpg.length;
  fs.writeFileSync(path.join(out, `${String(i).padStart(2, "0")}-${name}.jpg`), jpg);
  fs.writeFileSync(path.join(out, `${String(i).padStart(2, "0")}-${name}.svg`), svg);
});
console.log(`${svgs.length} keys at ${size}px: ${Date.now() - t0} ms, ${Math.round(bytes / svgs.length)} bytes per JPEG`);
