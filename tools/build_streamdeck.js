/* Builds the Nova Relay Stream Deck plugin (Nov 7, 2026):
 *   node tools/build_streamdeck.js
 * Makes the icons and default key pictures, checks the manifest, and packs
 *   out/Nova-Relay.streamDeckPlugin                      (sent with each version)
 *   nova-remote/public/streamdeck/Nova-Relay.streamDeckPlugin  (downloadable from Setup › Stream Deck)
 * A .streamDeckPlugin file is a zip of the com.gfssound.novaremote.sdPlugin folder. */
"use strict";
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), SD = path.join(ROOT, "streamdeck"), PLUG = path.join(SD, "com.gfssound.novaremote.sdPlugin");
const { renderKey, C } = require(path.join(PLUG, "bin/plugin.js"));
const W = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };

/* Action-list icons: white on transparent, 20×20 (SVG scales for @2x). */
const ICONS = {
  rec: `<circle cx="10" cy="10" r="7" fill="#fff"/>`,
  stop: `<rect x="3.5" y="3.5" width="13" height="13" rx="1.5" fill="#fff"/>`,
  tone: `<path d="M1 10 Q3.5 2 6 10 T11 10 T16 10 T19 10" fill="none" stroke="#fff" stroke-width="2"/>`,
  scream: `<path d="M10 2 V13 M5 9 L10 14 L15 9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 18 H16" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  hp: `<path d="M3 13 V10 a7 7 0 0 1 14 0 V13" fill="none" stroke="#fff" stroke-width="2"/><rect x="2" y="11" width="4" height="7" rx="1.5" fill="#fff"/><rect x="14" y="11" width="4" height="7" rx="1.5" fill="#fff"/>`,
  arm: `<rect x="2" y="5" width="16" height="10" rx="2" fill="none" stroke="#fff" stroke-width="2"/><circle cx="10" cy="10" r="2.6" fill="#fff"/>`,
  pfl: `<rect x="3" y="2" width="4" height="16" rx="1" fill="#fff"/><rect x="11" y="9" width="7" height="4" rx="1" fill="#fff"/><rect x="13.2" y="2" width="2.6" height="16" rx="1" fill="#fff" opacity=".5"/>`,
  drive: `<rect x="2" y="4" width="16" height="12" rx="2" fill="none" stroke="#fff" stroke-width="2"/><circle cx="13" cy="10" r="2.2" fill="#fff"/><rect x="5" y="9" width="4" height="2" fill="#fff"/>`,
  battery: `<rect x="1.5" y="5.5" width="15" height="9" rx="1.5" fill="none" stroke="#fff" stroke-width="2"/><rect x="17" y="8" width="2" height="4" fill="#fff"/><rect x="4" y="8" width="7" height="4" fill="#fff"/>`,
  primary: `<ellipse cx="10" cy="5" rx="7" ry="2.6" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M3 5 V15 a7 2.6 0 0 0 14 0 V5" fill="none" stroke="#fff" stroke-width="1.8"/>`,
  mirror: `<rect x="1.5" y="3" width="8" height="10" rx="1.5" fill="none" stroke="#fff" stroke-width="1.8"/><rect x="10.5" y="7" width="8" height="10" rx="1.5" fill="none" stroke="#fff" stroke-width="1.8"/>`,
  scene: `<rect x="2" y="7" width="16" height="10" rx="1.5" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M2 7 L5 2.5 L8.5 7 M9 7 L12 2.5 L15.5 7" fill="none" stroke="#fff" stroke-width="1.6"/>`,
  take: `<path d="M10 3 V17 M3 10 H17" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`,
  note: `<path d="M4 2.5 H12 L16 6.5 V17.5 H4 Z" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M7 10 H13 M7 13.5 H13" stroke="#fff" stroke-width="1.6"/>`,
  lasttake: `<circle cx="10" cy="10" r="7.5" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M10 5.5 V10 L13 12" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`,
  armset: `<rect x="1.5" y="3" width="11" height="7" rx="1.5" fill="none" stroke="#fff" stroke-width="1.6"/><rect x="7.5" y="10" width="11" height="7" rx="1.5" fill="#fff"/>`,
  meter: `<rect x="2" y="12" width="3" height="6" fill="#fff"/><rect x="6.5" y="8" width="3" height="10" fill="#fff"/><rect x="11" y="4" width="3" height="14" fill="#fff"/><rect x="15.5" y="9" width="3" height="9" fill="#fff" opacity=".5"/>`,
  rx: `<path d="M10 9 V18" stroke="#fff" stroke-width="2"/><circle cx="10" cy="7" r="2" fill="#fff"/><path d="M5.5 3.5 a6 6 0 0 0 0 7 M14.5 3.5 a6 6 0 0 1 0 7" fill="none" stroke="#fff" stroke-width="1.6"/>`,
  page: `<rect x="3" y="2" width="14" height="16" rx="2" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M6 7 H14 M6 10.5 H14 M6 14 H11" stroke="#fff" stroke-width="1.6"/>`,
  route: `<circle cx="4" cy="10" r="2.5" fill="#fff"/><path d="M6.5 10 H16 M12.5 6.5 L16 10 L12.5 13.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  jam: `<rect x="2" y="5" width="16" height="10" rx="2" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M10 7.5 V12.5 M7.5 10 H12.5" stroke="#fff" stroke-width="1.8"/>`,
  trimdial: `<circle cx="10" cy="10" r="7.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M10 10 L10 3.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
  hpdial: `<circle cx="10" cy="11" r="6.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M5 8 a5 5 0 0 1 10 0" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="10" cy="11" r="1.6" fill="#fff"/>`,
  slate: `<rect x="7.5" y="1.5" width="5" height="9" rx="2.5" fill="#fff"/><path d="M5 9 a5 5 0 0 0 10 0" fill="none" stroke="#fff" stroke-width="1.6"/><rect x="9.2" y="14" width="1.6" height="3" fill="#fff"/><rect x="6" y="17" width="8" height="1.6" fill="#fff"/>`,
  com: `<rect x="4.5" y="1.5" width="5" height="9" rx="2.5" fill="#fff"/><path d="M2 9 a5 5 0 0 0 10 0" fill="none" stroke="#fff" stroke-width="1.6"/><rect x="6.2" y="14" width="1.6" height="3" fill="#fff"/><path d="M14 5 a4 4 0 0 1 0 6 M16.5 3 a7 7 0 0 1 0 10" fill="none" stroke="#fff" stroke-width="1.5"/>`,
  status: `<rect x="1.5" y="5" width="17" height="10" rx="2" fill="none" stroke="#fff" stroke-width="2"/><rect x="4" y="9" width="2.5" height="2" fill="#fff"/><rect x="8.7" y="9" width="2.5" height="2" fill="#fff"/><rect x="13.5" y="9" width="2.5" height="2" fill="#fff"/>`,
};
for (const [n, body] of Object.entries(ICONS))
  W(path.join(PLUG, `imgs/actions/${n}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">${body}</svg>`);
W(path.join(PLUG, "imgs/category.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="11" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="14" cy="14" r="5" fill="#fff"/></svg>`);

/* Default key pictures (shown in the app before Nova Relay answers, and in multi-actions). */
const dot = (c, y = 54, r = 16) => `<circle cx="72" cy="${y}" r="${r}" fill="${c}"/>`;
const micG = c => `<rect x="62" y="28" width="20" height="32" rx="10" fill="${c}"/><path d="M54 50 a18 18 0 0 0 36 0" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><rect x="69.5" y="67" width="5" height="9" fill="${c}"/>`;
const sq = c => `<rect x="58" y="40" width="28" height="28" rx="4" fill="${c}"/>`;
const KEYS = {
  rec: renderKey({ icon: dot(C.rec), big: "REC", bigY: 98, bigMax: 26 }),
  stop: renderKey({ icon: sq(C.fg), big: "STOP", bigY: 98, bigMax: 26 }),
  tone: renderKey({ top: "TONE", big: "OFF" }),
  scream: renderKey({ top: "SCREAM", big: "\u2193 TRIM", bigMax: 34 }),
  hp: renderKey({ top: "HEADPHONES", big: "HP", bigMax: 34 }),
  arm: renderKey({ top: "TRACK", big: "ARM", bigMax: 34 }),
  pfl: renderKey({ top: "PFL", big: "FADER", bigMax: 30 }),
  slate: renderKey({ icon: micG(C.slate), big: "SLATE", bigY: 98, bigMax: 26 }),
  com: renderKey({ icon: micG(C.com), big: "COM", bigY: 98, bigMax: 26 }),
  drive: renderKey({ top: "DRIVE LEFT", big: "0h 00m", bigMax: 34 }),
  battery: renderKey({ top: "BATTERY", big: "00.0 V", bigMax: 34 }),
  primary: renderKey({ top: "PRIMARY", big: "000 GB", bigMax: 34, bottom: "free" }),
  mirror: renderKey({ top: "MIRROR", big: "CONT", bigMax: 34 }),
  scene: renderKey({ top: "NEXT SCENE", big: "SCENE", bigMax: 30 }),
  take: renderKey({ top: "TAKE +1", big: "TAKE", bigMax: 30 }),
  note: renderKey({ top: "NOTE", big: "NOTE", bigMax: 30 }),
  lasttake: renderKey({ top: "LAST TAKE", big: "\u2014", bigMax: 30 }),
  armset: renderKey({ top: "ARM SET", big: "ARM SET", bigMax: 28 }),
  meter: renderKey({ top: "METER", icon: `<rect x="14" y="60" width="116" height="26" rx="3" fill="#24272b"/><rect x="14" y="60" width="70" height="26" fill="#2fbf71"/>` }),
  rx: renderKey({ top: "RX", big: "000.0", bigMax: 34 }),
  page: renderKey({ top: "INPUT PAGE", big: "PAGE", bigMax: 30 }),
  route: renderKey({ top: "ROUTE", big: "\u2192 OUT", bigMax: 30 }),
  jam: renderKey({ top: "JAM", big: "TC", bigMax: 30 }),
  trimdial: renderKey({ top: "TRIM", big: "DIAL", bigMax: 30 }),
  hpdial: renderKey({ top: "HEADPHONES", big: "DIAL", bigMax: 30 }),
  status: renderKey({ top: "NOVA RELAY", big: "00:00:00", bigMax: 30 }),
};
for (const [n, svg] of Object.entries(KEYS)) W(path.join(PLUG, `imgs/keys/${n}.svg`), svg);

/* Plugin icon: PNG 256 and 512 from the app icon. */
const icon = path.join(ROOT, "nova-remote/public/icon-512.png");
execFileSync("python3", ["-I", "-c", `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGBA")
im.resize((512, 512), Image.LANCZOS).save(sys.argv[2] + "@2x.png")
im.resize((256, 256), Image.LANCZOS).save(sys.argv[2] + ".png")
`, icon, path.join(PLUG, "imgs/plugin")]);

/* Check the manifest points at files that exist. */
const man = JSON.parse(fs.readFileSync(path.join(PLUG, "manifest.json"), "utf8"));
const need = [];
const img = (p, exts) => { if (!exts.some(e => fs.existsSync(path.join(PLUG, p + e)))) need.push(p); };
img(man.Icon, [".png"]); img(man.CategoryIcon, [".svg", ".png"]);
for (const f of [man.CodePath, man.PropertyInspectorPath]) if (!fs.existsSync(path.join(PLUG, f))) need.push(f);
for (const a of man.Actions) {
  if (!a.UUID.startsWith(man.UUID + ".") || !/^[a-z0-9.-]+$/.test(a.UUID)) need.push("bad UUID " + a.UUID);
  img(a.Icon, [".svg", ".png"]); a.States.forEach(s => img(s.Image, [".svg", ".png"]));
}
if (!/^\d+\.\d+\.\d+\.\d+$/.test(man.Version)) need.push("Version must be a.b.c.d");
if (need.length) { console.error("Manifest problems: " + need.join(", ")); process.exit(1); }
execFileSync(process.execPath, ["--check", path.join(PLUG, man.CodePath)]);

/* Pack. Nov 14 (0.6.1, Ferris: "wait on faders"): actions in HOLD stay in the source but are left out of the package
   (a staged copy with those actions removed from its manifest). Empty HOLD and bump the version when they ship. */
const HOLD = ["faderdial", "faderstep"];
const stage = fs.mkdtempSync(path.join(require("os").tmpdir(), "sdpack-")), SP = path.join(stage, path.basename(PLUG));
fs.cpSync(PLUG, SP, { recursive: true });
const shipMan = { ...man, Actions: man.Actions.filter(a => !HOLD.includes(a.UUID.split(".").pop())) };
fs.writeFileSync(path.join(SP, "manifest.json"), JSON.stringify(shipMan, null, 2) + "\n");
const outs = [path.join(ROOT, "out/Nova-Relay.streamDeckPlugin"), path.join(ROOT, "nova-remote/public/streamdeck/Nova-Relay.streamDeckPlugin")];
const tmp = path.join(SD, "Nova-Relay.streamDeckPlugin");
fs.rmSync(tmp, { force: true });
execFileSync("zip", ["-qrX", tmp, path.basename(PLUG), "-x", "*.DS_Store"], { cwd: stage });
fs.rmSync(stage, { recursive: true, force: true });
for (const o of outs) { fs.mkdirSync(path.dirname(o), { recursive: true }); fs.copyFileSync(tmp, o); }
/* Nov 14: Nova Relay on Linux / the Pi box runs the same key code for a Stream Deck plugged into it (deck/host.js). */
fs.copyFileSync(path.join(PLUG, man.CodePath), path.join(ROOT, "nova-remote/deck/plugin.js"));
console.log(`Nova-Relay.streamDeckPlugin  ${(fs.statSync(tmp).size / 1024).toFixed(0)} KB  (plugin ${man.Version}, ${shipMan.Actions.length} keys${HOLD.length ? ", held back: " + HOLD.join(", ") : ""})`);
