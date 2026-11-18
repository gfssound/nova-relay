/* Nov 14: what can go on a Stream Deck plugged into the Pi box, and the starting layouts.
   The keys are the Stream Deck plugin's own (same names, options and pictures); "Next page" and "Previous page" are
   extra, because there is no Stream Deck app here to make folders. A layout is kept for each size of Stream Deck.
   Slot: { a: "<plugin key>", s: { …the key's options, as the plugin's settings panel saves them } } or null. */
"use strict";
const { SIZES } = require("./models.js");

const ACTIONS = [
  /* id, name, group, kind of control */
  ["rec", "REC", "Recorder", "key"], ["stop", "STOP", "Recorder", "key"], ["tone", "Tone", "Recorder", "key"],
  ["slate", "Slate mic", "Recorder", "key"], ["com", "Com mic", "Recorder", "key"], ["scream", "Scream trim", "Recorder", "key"], ["jam", "Jam", "Recorder", "key"],
  ["scene", "Next scene", "Logging", "key"], ["take", "Take +1 / −1", "Logging", "key"], ["note", "Note", "Logging", "key"], ["lasttake", "Last take", "Logging", "key"],
  ["arm", "Arm track", "Arming", "key"], ["armset", "Arm set", "Arming", "key"],
  ["pfl", "PFL", "Monitoring", "key"], ["hp", "Headphones", "Monitoring", "key"], ["meter", "Meter", "Monitoring", "key"],
  ["route", "Route", "Monitoring", "key"], ["page", "Input page", "Monitoring", "key"], ["faderstep", "Fader step", "Monitoring", "key", "faders"],
  ["status", "Timecode & take", "Glance", "key"], ["drive", "Drive time left", "Glance", "key"], ["battery", "Battery", "Glance", "key"],
  ["primary", "Primary free", "Glance", "key"], ["mirror", "Mirror", "Glance", "key"], ["rx", "Receiver", "Glance", "key"],
  ["deck.next", "Next page", "Pages", "key"], ["deck.prev", "Previous page", "Pages", "key"],
  ["trimdial", "Trim (dial)", "Dials", "dial"], ["hpdial", "Headphones (dial)", "Dials", "dial"], ["faderdial", "Fader (dial)", "Dials", "dial", "faders"],
].map(([id, name, group, kind, needs]) => ({ id, name, group, kind, needs: needs || null }));
const ACTION = Object.fromEntries(ACTIONS.map(a => [a.id, a]));

const k = (a, s = {}) => ({ a, s });
const arm = n => k("arm", { track: String(n) }), pfl = n => k("pfl", { fader: String(n) });
const DEFAULTS = {
  "15": { pages: [{ keys: [k("rec"), k("stop"), k("status"), k("tone"), k("slate"),
    arm(1), arm(2), arm(3), arm(4), k("com"),
    k("hp", { mode: "next" }), k("scene", { mode: "number" }), k("take", { mode: "up" }), k("drive"), k("battery")] }] },
  "32": { pages: [{ keys: [k("rec"), k("stop"), k("status"), k("tone"), k("slate"), k("com"), k("scream"), k("hp", { mode: "next" }),
    arm(1), arm(2), arm(3), arm(4), arm(5), arm(6), arm(7), arm(8),
    pfl(1), pfl(2), pfl(3), pfl(4), pfl(5), pfl(6), pfl(7), pfl(8),
    k("scene", { mode: "number" }), k("scene", { mode: "letter" }), k("take", { mode: "up" }), k("take", { mode: "down" }), k("lasttake"), k("drive"), k("battery"), k("primary")] }] },
  "6": { pages: [{ keys: [k("rec"), k("stop"), k("status"), k("tone"), k("slate"), k("hp", { mode: "next" })] }] },
  "8": { pages: [{ keys: [k("rec"), k("stop"), k("status"), k("tone"), k("slate"), k("com"), k("hp", { mode: "next" }), k("battery"), k("deck.prev"), k("deck.next")] }] },
  "8+4": { pages: [{ keys: [k("rec"), k("stop"), k("status"), k("tone"), k("slate"), k("com"), k("hp", { mode: "next" }), k("battery")],
    dials: [k("trimdial", { mode: "track", input: "15" }), k("trimdial", { mode: "track", input: "16" }), k("trimdial", { mode: "znet", input: "15" }), k("hpdial")] }] },
};
const MAX_PAGES = 10;

const slotsOf = size => { const z = SIZES[size]; return z.cols * z.rows + (z.touch || 0); };
/* Clean up a layout from disk or from a device: right number of keys and dials, known keys only, at most 10 pages. */
function normalize(size, layout, faders = false) {
  const z = SIZES[size]; if (!z) return null;
  const ok = (slot, kind) => {
    if (!slot || typeof slot !== "object") return null;
    const a = ACTION[slot.a]; if (!a || a.kind !== kind || (a.needs === "faders" && !faders)) return null;
    const s = {}; if (slot.s && typeof slot.s === "object") for (const [key, v] of Object.entries(slot.s)) if (/^[a-zA-Z]{1,20}$/.test(key) && (typeof v === "string" || typeof v === "boolean" || typeof v === "number")) s[key] = typeof v === "string" ? v.slice(0, 80) : v;
    return { a: a.id, s };
  };
  let pages = layout && Array.isArray(layout.pages) ? layout.pages.slice(0, MAX_PAGES) : JSON.parse(JSON.stringify(DEFAULTS[size].pages));
  if (!pages.length) pages = [{ keys: [] }];
  return { pages: pages.map(p => ({
    keys: Array.from({ length: slotsOf(size) }, (_, i) => ok(p && p.keys && p.keys[i], "key")),
    ...(z.dials ? { dials: Array.from({ length: z.dials }, (_, i) => ok(p && p.dials && p.dials[i], "dial")) } : {}),
  })) };
}
const defaultLayout = (size, faders) => normalize(size, null, faders);

module.exports = { ACTIONS, ACTION, DEFAULTS, MAX_PAGES, normalize, defaultLayout, slotsOf };
