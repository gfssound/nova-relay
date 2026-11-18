/* Nov 14: the server's side of a Stream Deck plugged into the Pi box (or any Linux computer running Nova Relay).
   Keeps the on/off switch, brightness and a key layout for each size of Stream Deck in <data>/deck.json; runs
   deck/host.js (which talks to the Stream Deck) while it's switched on; passes the key pictures to devices that have
   Setup › Stream Deck open. Mac and Windows: not offered (the Stream Deck app and our plugin do this there). */
"use strict";
const fs = require("fs");
const path = require("path");
const { fork } = require("child_process");
const MD = require("./models.js");
const LY = require("./layouts.js");

function createDeck({ DATA, PORT, FADERS, onByDefault, logAll, broadcast, sendTo, watchers }) {
  const FILE = path.join(DATA, "deck.json");
  const supported = process.platform === "linux" || !!process.env.NOVA_DECK_SYS;
  let cfg = { enabled: !!onByDefault, brightness: 70, layouts: {} };
  try { const j = JSON.parse(fs.readFileSync(FILE, "utf8")); if (j && typeof j === "object") cfg = { enabled: !!j.enabled, brightness: +j.brightness || 70, layouts: j.layouts && typeof j.layouts === "object" ? j.layouts : {} }; } catch (_) { }
  let st = { state: supported ? "off" : "unsupported-os", device: null, error: "", name: "" }, page = 0, pages = 1;
  let imgs = {}, child = null, restartT = null, backoff = 2000, saveT = null;

  const layouts = () => Object.fromEntries(Object.keys(MD.SIZES).map(sz => [sz, LY.normalize(sz, cfg.layouts[sz], FADERS)]));
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { fs.writeFileSync(FILE, JSON.stringify(cfg, null, 1)); } catch (e) { logAll("er", "Stream Deck: couldn't save the key layout (" + e.message + ")"); } }, 300); };
  const pushConfig = () => { if (child && child.connected) child.send({ t: "config", enabled: cfg.enabled, brightness: cfg.brightness, layouts: layouts() }); };
  function info() {
    return { supported, enabled: cfg.enabled, brightness: cfg.brightness, state: st.state, device: st.device, error: st.error, name: st.name,
      page, pages, sizes: MD.SIZES, layouts: layouts(), actions: LY.ACTIONS.filter(a => !a.needs || (a.needs === "faders" && FADERS)) };
  }
  let infoT = null;
  const changed = () => { clearTimeout(infoT); infoT = setTimeout(() => broadcast({ t: "deck", deck: info() }), 30); };

  function start() {
    if (!supported || !cfg.enabled || child) return;
    clearTimeout(restartT); restartT = null;
    const env = { ...process.env, NOVA_DECK_PORT: String(PORT), NOVA_DECK_FADERS: FADERS ? "1" : "0" };
    try { child = fork(path.join(__dirname, "host.js"), [], { env, stdio: ["ignore", "inherit", "inherit", "ipc"] }); }
    catch (e) { st = { state: "error", device: null, error: "Couldn't start the Stream Deck helper (" + e.message + ")", name: "" }; changed(); return; }
    const me = child, born = Date.now();
    me.on("message", m => onChild(m));
    me.on("exit", code => {
      if (child === me) child = null;
      imgs = {};
      if (!cfg.enabled) { st = { state: "off", device: null, error: "", name: "" }; changed(); return; }
      if (Date.now() - born > 60000) backoff = 2000; else backoff = Math.min(30000, backoff * 2);
      st = { state: "error", device: null, error: `The Stream Deck helper stopped${code ? " (code " + code + ")" : ""}; starting it again.`, name: "" }; changed();
      restartT = setTimeout(start, backoff);
    });
    pushConfig();
  }
  function stop() {
    clearTimeout(restartT); restartT = null;
    if (child) { const c = child; pushConfigTo(c, false); setTimeout(() => { try { c.kill("SIGTERM"); } catch (_) { } }, 400); child = null; }
    st = { state: supported ? "off" : "unsupported-os", device: null, error: "", name: "" }; imgs = {}; changed();
  }
  const pushConfigTo = (c, enabled) => { try { if (c.connected) c.send({ t: "config", enabled, brightness: cfg.brightness, layouts: layouts() }); } catch (_) { } };

  function onChild(m) {
    if (!m || typeof m !== "object") return;
    switch (m.t) {
      case "status":
        st = { state: m.state, device: m.device || null, error: m.error || "", name: m.name || "" };
        if (m.state !== "open") { imgs = {}; page = 0; }
        changed(); break;
      case "page": page = m.page | 0; pages = m.pages | 0 || 1; changed(); break;   /* the host sends "clear" before a page's pictures */
      case "clear": imgs = {}; break;
      case "img": {
        const id = m.dial != null ? "d" + m.dial : "k" + m.key; imgs[id] = m.svg;
        for (const c of watchers()) sendTo(c, { t: "deckImg", id, svg: m.svg });
        break;
      }
      case "press": for (const c of watchers()) sendTo(c, { t: "deckPress", key: m.key }); break;
      case "settings": {   /* a key numbered itself (Arm, PFL…), as the plugin does: keep it */
        const lay = layouts()[m.size]; if (!lay || !lay.pages[m.page]) break;
        const list = m.kind === "dial" ? lay.pages[m.page].dials : lay.pages[m.page].keys;
        if (!list || !list[m.index]) break;
        list[m.index].s = m.s || {}; cfg.layouts[m.size] = lay; save(); changed(); break;
      }
      case "log": if (m.text) logAll("ev", String(m.text).slice(0, 300)); break;
    }
  }

  /* From a device's Setup page. */
  function set(m, who) {
    let restart = false;
    if (typeof m.enabled === "boolean" && m.enabled !== cfg.enabled) {
      cfg.enabled = m.enabled; restart = true;
      logAll("ev", `Stream Deck on this ${process.env.NOVA_REMOTE_URLS ? "box" : "computer"} turned ${m.enabled ? "on" : "off"} by ${who}.`);
    }
    if (m.brightness != null && isFinite(+m.brightness)) cfg.brightness = Math.max(10, Math.min(100, Math.round(+m.brightness)));
    if (typeof m.size === "string" && MD.SIZES[m.size]) {
      if (m.reset) { delete cfg.layouts[m.size]; logAll("ev", `Stream Deck: the ${MD.SIZES[m.size].label.split(" (")[0]} layout went back to the starting one (${who}).`); }
      else if (m.layout && typeof m.layout === "object") cfg.layouts[m.size] = LY.normalize(m.size, m.layout, FADERS);
    }
    save();
    if (restart) { if (cfg.enabled) start(); else stop(); } else pushConfig();
    changed();
  }
  function showPage(n) { if (child && child.connected && Number.isInteger(n)) child.send({ t: "showPage", page: n }); }
  function watch(c, on) { c.deckWatch = !!on; if (on) { sendTo(c, { t: "deck", deck: info() }); for (const [id, svg] of Object.entries(imgs)) sendTo(c, { t: "deckImg", id, svg }); } }

  if (cfg.enabled) setTimeout(start, 500);
  return { info, set, watch, showPage, images: () => ({ ...imgs }), stop };
}
module.exports = { createDeck };
