import re, sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:90], s.count(a)); s = s.replace(a, b)

# ---- 1. full document wrapper (the hosted version got this from the artifact host)
head_end = s.index('</style>') + len('</style>')
head, body = s[:head_end], s[head_end:]
# Nov 14: the prototype's title is "Nova Relay prototype", so the old target never matched and the installed app went
# out without its Home Screen tags (an iPad's "Add to Home Screen" opened with Safari's bars). Now it must match.
assert head.count('<title>Nova Relay prototype</title>') == 1, "prototype title changed: update make_local.py"
head = head.replace('<title>Nova Relay prototype</title>', '''<title>Nova Relay</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="Nova Relay">
<meta name="theme-color" content="#0a0b0c">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-180.png">''', 1)
head = head.replace('</style>', '''
/* Local app additions */
html{height:100%}
body{height:100%;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);-webkit-text-size-adjust:100%}
img{max-width:100%}
.log .raw{color:#c9a7ff}
.log .er{color:var(--rec)}
.pill.off i{background:var(--rec);box-shadow:none}
#connecting{position:fixed;inset:0;z-index:60;background:var(--ground);display:flex;align-items:center;justify-content:center;padding:24px;text-align:center}
#connecting div{max-width:420px;display:flex;flex-direction:column;gap:12px;align-items:center}
#connecting b{font-family:var(--f-display);font-size:var(--t-xl);letter-spacing:.04em}
#connecting p{margin:0;color:var(--muted);line-height:1.5}
.spinner{width:28px;height:28px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--accent);animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.spinner{animation:none}}
.urlrow{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.urlrow code{font-family:var(--f-mono);font-size:var(--t-md);color:var(--fg);user-select:all}
</style>''')
s = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">\n' + head + '\n</head>\n<body>' + body.replace('</script>\n', '</script>\n</body>\n</html>\n', 1) if body.count('</script>') == 1 else None
assert s, "expected one script"
rep('<div class="app">', '<div id="connecting" role="status"><div><div class="spinner" aria-hidden="true"></div><b>Nova Relay</b><p id="connText">Connecting to the cart computer…</p></div></div>\n<div class="app">')

# ---- 2. status pill
rep('<span class="pill" id="linkPill"><i></i><span>Simulated recorder</span></span>', '<span class="pill" id="linkPill"><i></i><span id="linkText">Connecting…</span></span>')

# ---- 3. link layer -> cart connection
rep('''const link = {
  mode: "sim",
  send(msg){ log("tx", describe(msg)); sim.receive(msg); },
  fromDevice(text){ log("rx", text); }
};''', '''const link = {
  mode: "cart",
  send(msg){
    if(!(cart.nova && cart.nova.connected)) log("tx", describe(msg));
    /* Nov 18 (Ferris: "make sure that if I leave the nova.local page and return to it that nothing gets messed up"):
       back on the page, its controls show what it knew when it was left until the cart computer's current setup
       arrives (a moment after reconnecting). A change made in that moment isn't sent; the fresh setup replaces it. */
    if(msg.op === "SET" && !cart.synced){ toast("Catching up with the cart computer\u2026 Try again in a moment."); return; }
    if(msg.op === "SET"){ const s = S[msg.k]; net.send({t:"set", k:msg.k, idx:msg.idx, val:msg.val, log:describe(msg), ack:`ACK ${String(s.id).padStart(3)} ${s.n}${idxText(msg.idx)}`}); }
    else if(msg.op === "CMD") net.send({t:"cmd", name:msg.name});
  },
  fromDevice(text){ log("rx", text); }
};

/* ---------- Connection to the cart computer ----------
   The cart computer holds the shared settings and runs the recorder link. Every device
   (this one, phones, iPads) sends its changes there and receives everyone else's. */
const PER_DEVICE = new Set(["ui.helptext", "ui.osk", "ui.refline.enable", "ui.refline.level", "ui.meters.znet", "ui.meters.znettrim", "ui.meters.tx", "ui.meters.nameleft", "ui.meters.faders"]);
const cart = {urls:[], serial:null, ports:[], devices:1, ready:false, synced:false, nova:null};
const cartSubs = new Set();
const cartChanged = () => cartSubs.forEach(f => { try{ f(); }catch(e){} });
function deviceName(){
  const ua = navigator.userAgent;
  if(/^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname)) return "cart computer";
  if(/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iPad";
  if(/iPhone/.test(ua)) return "iPhone";
  if(/Android/.test(ua)) return "Android";
  if(/Mac/.test(ua)) return "Mac"; if(/Win/.test(ua)) return "Windows PC"; if(/Linux/.test(ua)) return "Linux PC";
  return "device";
}
function sharedSnapshot(){ const o = {}; for(const k in V) if(!PER_DEVICE.has(k) && !DEVICE_KEYS.has(k)) o[k] = V[k]; return o; }
function setCartStatus(on){
  const pill = $("linkPill"); if(!pill) return;
  pill.classList.toggle("off", !on);
  pill.classList.toggle("warn", on && !(cart.nova && cart.nova.connected && !cart.nova.loading));
  /* Nov 18: while the Nova's settings are being read nothing is sent, and the pill says so */
  const ld = cart.nova && cart.nova.loading;
  pill.classList.toggle("loading", !!ld);
  const nv = ld ? `Reading Nova${cart.nova.loadPct != null ? " " + cart.nova.loadPct + "%" : "\u2026"}` : cart.nova && cart.nova.connected ? "Nova" : cart.nova && cart.nova.active ? "Nova?" : "No Nova";
  $("linkText").textContent = on ? `${nv} \\u00b7 ${cart.devices} device${cart.devices === 1 ? "" : "s"}` : "Reconnecting to cart\\u2026";
  pill.title = ld ? "Reading the Nova's settings. Changes are held back until they're in, so nothing on the Nova is changed by what this page showed before." : cart.nova && cart.nova.connected ? `Connected to ${cart.nova.model || "the Nova"}` : cart.nova && cart.nova.active ? "Port open, waiting for the Nova to answer" : "No Nova connected: nothing is simulated; the remote fills in from the Nova when it connects";
}
let connectTimer = null;
/* Nov 18: a page brought back from the browser's back/forward cache (Back to nova.local, an iPhone reopening the tab)
   may hold a socket the box has already dropped: start over, so the current setup is fetched before anything is sent. */
window.addEventListener("pageshow", e => { if(e.persisted){ cart.synced = false; try{ net.ws && net.ws.close(); }catch(_){ } } });
const net = {
  ws:null, open:false,
  connect(){
    let ws;
    try{ ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws"); }catch(e){ setTimeout(() => this.connect(), 2000); return; }
    this.ws = ws;
    clearTimeout(connectTimer);
    connectTimer = setTimeout(() => { if(!cart.ready) $("connText").textContent = "Can't reach the cart computer. Check that Nova Relay is running there and that this device is on the same Wi-Fi."; }, 4000);
    ws.onopen = () => { this.open = true; ws.send(JSON.stringify({t:"hello", name:deviceName()})); };
    ws.onmessage = e => { let m; try{ m = JSON.parse(e.data); }catch(_){ return; } onCart(m); };
    ws.onclose = () => { const was = this.open; this.open = false; cart.synced = false; setCartStatus(false); if(was) log("er", "Lost the connection to the cart computer. Reconnecting\\u2026"); setTimeout(() => this.connect(), 1500); };
    ws.onerror = () => {};
  },
  send(obj){ if(this.open && this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj)); }
};
function applyCartState(sv){ hpBase = null;
  for(const k in sv) if(S[k] && !PER_DEVICE.has(k)) V[k] = sv[k];
  if(migrateInputOrder()){ log("ev", "Inputs reordered to the Nova's order: Analog 1\\u20134, Return 1\\u20132, AES 1\\u20138, RX 1\\u20138."); net.send({t:"replace", V:sharedSnapshot()}); }
  const mig = migrateOutSources(), norm = normalizeOutRoutes();
  if(mig) log("ev", "Output routes now use the Nova's sources: OUT 1\\u20134 from inputs, OUT 5\\u20138 from tracks and OUT 1\\u20134.");
  if(mig || norm) net.send({t:"replace", V:sharedSnapshot()});
  for(const k in S) notify(k, []);
  go(current); renderTransport();
}
function onCart(m){
  switch(m.t){
    case "state":
      if(m.V) applyCartState(m.V); else net.send({t:"init", V:sharedSnapshot()});
      cart.synced = true;
      if(m.live) sim.live(m.live);
      cart.urls = m.urls || []; cart.local = !!m.local; cart.desktop = !!m.desktop; cart.network = !!m.network; cart.here = !!m.here; cart.serial = m.serial || null; cart.devices = m.devices || 1; cart.nova = m.nova || null; if(cart.nova && cart.nova.model) novaModel = cart.nova.model;
      cart.deck = m.deck || null; if(document.getElementById("deck-box")) net.send({t:"deckWatch", on:true}); cart.version = m.version || ""; if(m.update) updOnMessage({update:m.update});
      if(!cart.ready){ cart.ready = true; $("connecting").hidden = true; net.send({t:"clock", now:Date.now()}); log("ev", `Connected to the cart computer (Nova Relay ${m.version || ""}). Recorder: ${cart.nova && cart.nova.connected ? cart.nova.model || "Nova" : "simulated"}.`); }
      setCartStatus(true); cartChanged();
      break;
    case "set": set(m.k, m.idx, m.val, "remote"); break;
    case "setk": /* a whole setting from the Nova */
      if(!S[m.k]) break;
      V[m.k] = m.val; notify(m.k, []);
      if(m.k === "trackmix.matrix" || m.k === "trackmix.preset") syncAllColors("remote");
      if(/^(scene|take|note)\\./.test(m.k)) renderTransport();
      break;
    case "nova": { cart.nova = m.nova; setCartStatus(true); cartChanged(); set("ui.soloins", [], (m.nova && m.nova.solo) || [], "remote"); set("ui.pflmap", [], (m.nova && m.nova.pfl) || [], "remote");
      const md = (m.nova && m.nova.model) || ""; if(md && md !== novaModel){ novaModel = md; go(current); } break; }
    case "live": sim.live(m); break;
    case "log": log(m.dir, m.text); break;
    case "trimScan": cart.scan = m; cartChanged(); break;
      case "novaScreen": novaScreen(m); break;
    case "serial": cart.serial = m.serial; cartChanged(); break;
    case "net": cart.urls = m.urls || []; cart.local = !!m.local; cart.desktop = !!m.desktop; cart.network = !!m.network; cartChanged(); break;
    case "ports": cart.ports = m.list || []; cartChanged(); break;
    case "devices": cart.devices = m.count || 1; setCartStatus(true); break;
    /* Nov 14: Stream Deck plugged into the box: its state, and live key pictures while Setup \u203a Stream Deck is open */
    case "deck": cart.deck = m.deck || null; if(deckBoxDraw && document.getElementById("deck-box")) try{ deckBoxDraw(); }catch(e){} break;
    case "deckImg": if(!document.getElementById("deck-box")){ net.send({t:"deckWatch", on:false}); break; } deckImgs[m.id] = m.svg; deckOnImg(m.id); break;
    case "deckPress": deckOnPress("k" + m.key); break;
  }
}
/* Connected to a real Nova: meters, timecode and takes come from it, and REC/STOP send the Aria's buttons. */
function novaMode(on){
  document.body.dataset.nova = on ? "1" : "0";
  for(const id of ["bRec", "bStop"]){ const b = $(id); if(!b) continue; b.title = on ? `Sends the Aria's ${id === "bRec" ? "REC" : "STOP"} button to the Nova` : ""; }
  renderTransport();
}
/* Nov 2: inputs have no names (only tracks do), so nothing is copied from tracks to inputs; colors follow routing. */
function novaNamesWin(){ syncAllColors("remote"); }
/* Keep phone and iPad screens awake while the remote is open. */
let wakeLock = null;
async function keepAwake(){ try{ if("wakeLock" in navigator && !wakeLock && document.visibilityState === "visible"){ wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => wakeLock = null); } }catch(e){} }
document.addEventListener("pointerdown", keepAwake, {once:true});
document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") keepAwake(); });''')

# ---- 4. simulator moves to the cart computer; the page follows its live updates
i = s.index('const sim = {'); j = s.index('/* Input layout', i)
s = s[:i] + '''/* The simulated recorder runs on the cart computer. This mirror follows its live updates
   (about 15 a second) and keeps the timecode moving smoothly in between. */
const sim = {
  state: "STOPPED", genFrames: 0, elapsed: 0, playStart: 0, playClip: null,
  inDb: new Float32Array(22).fill(-90), lastT: performance.now(),
  init(){ const now = new Date(); this.genFrames = (now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds()) * this.fr().r; },
  fr(){ return FPS[get("timecode.framerate")] || FPS[0]; },
  nova: null,
  live(m){
    const was = this.state, wasNova = !!this.nova;
    this.state = m.state; this.genFrames = m.genFrames; this.elapsed = m.elapsed;
    this.nova = m.nova || null;
    for(let i = 0; i < 22; i++) this.inDb[i] = m.inDb && m.inDb[i] != null ? m.inDb[i] : (this.nova ? -120 : -90);
    if(wasNova !== !!this.nova) novaMode(!!this.nova);
    V["drive.time.remaining"] = m.drive; V["battery.status"] = {volts:m.volts};
    if(was !== this.state) renderTransport();
  },
  tick(t){
    const dt = Math.min(0.1, (t - this.lastT) / 1000); this.lastT = t;
    this.genFrames += dt * this.fr().r;
    if(this.state !== "STOPPED") this.elapsed += dt;
  }
};
''' + s[j:]

# ---- 5. shared remote-only settings (presets, color bank, per-track Com 1) sync through the cart; view prefs stay per device
rep('  if(origin === "ui" && !s.local) link.send({op:"SET", id:s.id, k, idx, val});',
    '  if(origin === "ui" && !s.local) link.send({op:"SET", id:s.id, k, idx, val});\n  else if(s.local && !PER_DEVICE.has(k) && origin !== "remote") net.send({t:"set", k, idx, val});')
rep('try{ const o = {}; for(const k in V) if(!DEVICE_KEYS.has(k)) o[k] = V[k]; localStorage.setItem(STORE_KEY, JSON.stringify(o)); }catch(e){}',
    'try{ const o = {}; for(const k in V) if(PER_DEVICE.has(k)) o[k] = V[k]; localStorage.setItem(STORE_KEY, JSON.stringify(o)); }catch(e){}')
rep('V["metadata.history"] = hh; notify("metadata.history", []); saveSoon();', 'set("metadata.history", [], hh, "ui");')

# ---- 6. Setup: cart addresses + serial port
k = s.index('    const conn = h("div", {class:"conn"},'); l = s.index('\n    const reset =', k)
s = s[:k] + '    const conn = cartPanel();' + s[l:]
rep('const connTitle = "Connection";', 'const connTitle = "Cart & Recorder Link";')
rep('seed(); seedDevice(); saveSoon(); go("setup"); renderTransport(); log("ev", "Reset to example setup"); }}, "Reset"),',
    'seedBlank(); seedDevice(); saveSoon(); net.send({t:"replace", V:sharedSnapshot()}); go("setup"); renderTransport(); log("ev", "Remote setup cleared; reloading from the Nova"); }}, "Clear"),')
# Nov 6 (Ferris): Help opens the manual that ships with the app. On the computer running Nova Relay it opens in the
# system's default PDF app; phones and iPads open /manual.pdf in their own viewer.
rep('function openHelp(){ window.open(MANUAL_URL, "_blank", "noopener"); }',
    'function openHelp(){\n  const inBrowser = () => window.open("/manual.pdf", "_blank", "noopener");\n  if(!cart.here){ inBrowser(); return; }\n  toast("Opening the manual\u2026");\n  fetch("/manual/open", {method:"POST"}).then(r => r.json()).then(j => { if(!j.ok){ toast("No PDF app opened the manual, so it\u2019s opening in a browser window."); inBrowser(); } }).catch(inBrowser);\n}')
# Nov 7: Setup › Stream Deck uses this cart's real address (the first network address, else the one in the browser) and
# offers the plugin file that ships in public/streamdeck/.
# Nov 11: hand over the serial capture from the Link log (a Pi box has no Finder). Installed app only: the prototype has no file.
rep('}}, "Copy"), copied),', '}}, "Copy"), h("a", {class:"btn", href:"api/capture", download:"", title:"The newest serial capture file, for Zaxcom or for working out a problem"}, "Download capture"), copied),')
rep('const deckBase = () => "http://192.168.1.20:8080";', 'const deckBase = () => ((cart.urls && cart.urls[0] && cart.urls[0].url) || location.origin).replace(/\\/+$/, "");')
rep('const deckLocal = () => "";', 'const deckLocal = () => !(cart.urls && cart.urls.length) ? "Only this computer can reach Nova Relay right now, so these addresses work only here. To use buttons on another computer, turn on Phones and iPads (Setup \u203a Cart & Recorder Link) or join the cart Wi-Fi." : "";')
rep('const deckPluginUrl = () => "";', 'const deckPluginUrl = () => "streamdeck/Nova-Relay.streamDeckPlugin";')

# Nov 15: Setup › Transmitters sends to the Nova (the prototype plays the transmitters)
rep("""function txPowerSend(unit, v){   /* the prototype plays the transmitters; the installed app sends it to the Nova */
  const st = ["On", "Wake", "Low power"][v], a = (get("ui.txstate") || Array(8).fill(null)).slice();
  for(let r = 0; r < 8; r++) if(!unit || rxZid(r) === unit) a[r] = st;
  set("ui.txstate", [], a); return true;
}""", """function txPowerSend(unit, v){   /* to the Nova (cQRXTX 98); the state shown comes from the transmitters' own reports */
  if(!(cart.nova && cart.nova.connected)){ toast("Not connected to the Nova, so the transmitters weren't changed."); return false; }
  net.send({t:"txPower", unit, v}); return true;
}""")

# Nov 14: Setup › Stream Deck › plugged into this box: the box's real state (none on Mac/Windows: the panel hides)
rep("""const deckBox = () => protoDeck || (protoDeck = {supported:true, enabled:true, brightness:70, state:"open", name:"", error:"",
  device:{name:"Stream Deck MK.2", size:"15", cols:5, rows:3, dials:0, touch:0}, page:0, pages:1,
  sizes:DECK_DATA.sizes, actions:DECK_DATA.actions, layouts:JSON.parse(JSON.stringify(DECK_DATA.layouts))});""",
    """const deckBox = () => cart.deck || null;""")
rep("""function deckSend(m){
  const d = deckBox();
  if(typeof m.enabled === "boolean"){ d.enabled = m.enabled; d.state = m.enabled ? "open" : "off"; }""",
    """function deckSend(m){
  net.send(Object.assign({t:"deck"}, m));
  const d = deckBox(); if(!d) return;
  if(typeof m.enabled === "boolean"){ d.enabled = m.enabled; d.state = m.enabled ? "none" : "off"; }""")
rep("""  if(m.size && m.reset) d.layouts[m.size] = JSON.parse(JSON.stringify(DECK_DATA.layouts[m.size]));""",
    """  if(m.size && m.reset) {}   /* the box answers with the starting layout */""")
rep("""const deckShowPage = n => { const d = deckBox(); d.page = n; };""", """const deckShowPage = n => net.send({t:"deckPage", page:n});""")
rep("""const deckWatch = on => {};""", """const deckWatch = on => net.send({t:"deckWatch", on});""")
# Nov 7: the sound report comes from the cart (every take the Nova has listed, not only the last 10).
rep('const soundReportUrl = () => "";', 'const soundReportUrl = () => "api/report.csv";')
rep('const ariaState = () => ({com:protoCom, learning:protoLearning, nova:true});', 'const ariaState = () => { const nv = cart.nova || {}; return {com:!!(nv.buttons && nv.buttons.com), learning:nv.learning === "com", nova:!!nv.connected}; };')
rep('function learnAriaButton(){ protoLearning = true; deckDraw && deckDraw(); setTimeout(() => { protoLearning = false; protoCom = true; deckDraw && deckDraw(); toast("Learned the Aria\'s Com button"); }, 2500); }',
    'function learnAriaButton(){ net.send({t:"learnButton", what:"com"}); }')
rep('function forgetAriaButton(){ protoCom = false; deckDraw && deckDraw(); }', 'function forgetAriaButton(){ net.send({t:"forgetButton", what:"com"}); }')
rep('const cartChanged = () => cartSubs.forEach(f => { try{ f(); }catch(e){} });', 'const cartChanged = () => { cartSubs.forEach(f => { try{ f(); }catch(e){} }); if(current === "setup" && setupSec === "deck" && deckDraw) try{ deckDraw(); }catch(e){} };')
# Nov 2 (Ferris): shipped versions carry no example data; they start blank and fill from the Nova.
rep('const EXAMPLE = true;', 'const EXAMPLE = false;')
# Nov 14 (0.6.1, Ferris: "wait on faders for printed version"): faders on the meters stay in the prototype but are off in
# shipped builds until SHIP_FADERS is True: no Setup switch, no note, no caps. (The server holds /api/fader the same way.)
SHIP_FADERS = False
if not SHIP_FADERS:
    rep(', ["ui.meters.faders", "Faders on meters"]]},', ']},')
    rep('    : g.id === "meters" ? h("div", {class:"stack"}, setupTiles(g.id), h("p"', '    : false ? h("div", {class:"stack"}, setupTiles(g.id), h("p"')
    rep('const ch = getCh(), on = !!get("ui.meters.faders") &&', 'const ch = getCh(), on = false &&')
rep('const reset = h("button", {type:"button", class:"btn"}, "Reset to example setup");', 'const reset = h("button", {type:"button", class:"btn"}, "Clear remote setup");')
rep('"This replaces every setting with the example cart setup."', '"This clears what the remote keeps itself (colors, output names and presets) on every device. Names, routing and everything else reload from the Nova."')
rep('let novaModel = "NOVA1"; /* the simulated recorder is a Nova 1 (Ferris\'s) */', 'let novaModel = ""; /* set from the Nova\'s greeting (saved in nova-link.json) */')
rep('<div class="brand">Nova Relay <small>prototype</small></div>', '<div class="brand">Nova Relay</div>')  # Nov 2: shipped versions aren't labelled "prototype"
s = s.replace('<title>Nova Relay prototype</title>', '<title>Nova Relay</title>')
rep('    <button type="button" class="daybtn" id="phoneBtn" title="Preview the phone layout">iPhone</button>\n', '')  # iPhone preview: prototype only
rep('    <button type="button" class="daybtn" id="tabletBtn" title="Preview the tablet layout">iPad</button>\n', '')  # iPad preview: prototype only
rep('function tellNova(m){}', 'function tellNova(m){ if(cart.nova && cart.nova.connected) net.send(m); }')
rep('function novaConnected(){ return false; }', 'function novaConnected(){ return !!(cart.nova && cart.nova.connected); }')
rep('function presetPicker(', '''function cartPanel(){
  const urls = h("div", {class:"stack", style:"gap:6px"});
  /* Linux desktop app and AppImage (Nov 2): phones and iPads are a switch, off until turned on here. Only this
     computer's own window can change it. */
  const netCk = h("input", {type:"checkbox", id:"f-network", onchange:e => net.send({t:"network", on:e.target.checked})});
  const netNote = h("span", {class:"hint keep"});
  const netRow = h("label", {class:"row", for:"f-network"}, h("span", {class:"lbl"}, "Phones and iPads"), h("span", {class:"flex"}, netCk, netNote));
  const portOf = () => { const u = cart.urls[0] && cart.urls[0].url.match(/:(\\d+)$/); return u ? u[1] : location.port || "8080"; };
  const drawUrls = () => {
    netRow.hidden = !cart.desktop; netCk.checked = !!cart.network; netCk.disabled = !cart.here;
    netNote.textContent = !cart.here ? "Switched on from the computer running Nova Relay; it can be turned off only there."
      : "Let phones and iPads on the same Wi-Fi use this remote. Off: only this window. Nova Relay remembers the choice.";
    urls.replaceChildren(...(cart.urls.length
    ? [...cart.urls.map(u => h("div", {class:"urlrow"}, h("code", null, u.url), h("span", {class:"hint"}, u.name))),
       cart.desktop ? h("p", {class:"hint keep"}, `If a phone can't open it, this computer's firewall may be blocking port ${portOf()} (for example: sudo ufw allow ${portOf()}/tcp).`) : null].filter(Boolean)
    : cart.local ? [h("p", {class:"hint keep"}, "Off: only this computer can use Nova Relay. Tick Phones and iPads above to get an address for them.")]
    : [h("p", {class:"hint keep"}, "The cart computer isn't on a network. Join the cart Wi-Fi to use phones and iPads.")]));
  };
  const portSel = h("select", {class:"sel", id:"f-serial-port", "aria-label":"Serial port"});
  const baudSel = h("select", {class:"sel", id:"f-serial-baud", "aria-label":"Baud rate"}, [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map(b => h("option", {value:b}, String(b))));
  baudSel.value = "38400";
  const parSel = h("select", {class:"sel", id:"f-serial-parity", "aria-label":"Parity"}, [["odd","Odd (Nova)"],["even","Even"],["none","None"]].map(([v, t]) => h("option", {value:v}, t)));
  parSel.value = "odd";
  const listenCk = h("input", {type:"checkbox", id:"f-listen"});
  const openB = h("button", {type:"button", class:"btn primary", onclick:() => { if(portSel.value) net.send({t:"serialOpen", path:portSel.value, baud:+baudSel.value, parity:parSel.value, listen:listenCk.checked}); }}, "Connect");
  /* Notes for a tap (Nov 1): typed here, saved into the capture file at that moment. */
  const noteIn = h("input", {type:"text", class:"txt", id:"f-cap-note", placeholder:"e.g. pressed MENU, opened Input 3", maxlength:200, autocomplete:"off"});
  const addNote = () => { const v = noteIn.value.trim(); if(!v) return; net.send({t:"captureNote", text:v}); noteIn.value = ""; toast("Note added to the capture"); };
  noteIn.addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); addNote(); } });
  const closeB = h("button", {type:"button", class:"btn", onclick:() => net.send({t:"serialClose"})}, "Close port");
  const st = h("p", {class:"hint keep", role:"status"});
  const novaSt = h("p", {class:"hint keep", role:"status"});
  const reloadB = h("button", {type:"button", class:"btn", onclick:() => net.send({t:"novaReload"})}, "Reload from Nova");
  const drawNova = () => {
    const nv = cart.nova || {};
    novaSt.textContent = nv.listen && nv.active ? `Listen only: nothing is sent to the Nova. ${nv.connected ? "Data is arriving" : "Waiting for data"}; it's all in the Link log and the capture file.` : nv.connected ? `Connected to ${nv.model || "the Nova"}${nv.aria ? " through the " + nv.aria.replace("ARIA", "Aria") : ""}. Settings, names, arming, meters, timecode and takes come from the Nova; changes you make are sent to it (see the Link log in Setup › Connection).`
      : nv.active ? "Port open. Waiting for the Nova to answer\\u2026 Check that NovaTouch is closed and the Nova's RS-422 mode is Aria/Oasis."
      : cart.serial && cart.serial.auto ? "Looking for the Nova automatically (the Aria's USB port, 38400 baud, odd parity). Meanwhile the remote runs on the simulated recorder. If NovaTouch is open, close it."
      : "Not connected to a Nova; auto-connect is paused. Pick the port and press Connect. The remote is running on the simulated recorder.";
    reloadB.disabled = !nv.connected;
  };
  const drawSerial = () => {
    const sp = cart.serial || {};
    st.textContent = sp.status === "open" ? `Open: ${sp.path} at ${sp.baud} baud ${sp.parity ? "8" + sp.parity[0].toUpperCase() + "1" : ""} \\u00b7 ${(sp.bytes || 0).toLocaleString()} bytes received. Raw bytes show in the Link log and are saved on the cart computer: ${sp.capture}`
      : sp.status === "error" ? `Couldn't use the port: ${sp.error}` : sp.status === "opening" ? "Opening\\u2026" : "Closed.";
    openB.disabled = sp.status === "open"; closeB.disabled = sp.status !== "open";
    if(sp.baud) baudSel.value = String(sp.baud);
    if(sp.parity) parSel.value = sp.parity;
  };
  const drawPorts = () => {
    const cur = portSel.value || (cart.serial && cart.serial.path) || "";
    portSel.replaceChildren(...(cart.ports.length ? cart.ports.map(p => h("option", {value:p.path}, p.label)) : [h("option", {value:""}, "No serial ports found")]));
    if(cur && cart.ports.some(p => p.path === cur)) portSel.value = cur;
  };
  [drawUrls, drawSerial, drawPorts, drawNova].forEach(f => { cartSubs.add(f); f(); });
  net.send({t:"ports"});
  return h("div", {class:"stack"},
    netRow,
    h("span", {class:"lbl"}, "Open on a phone or iPad (same Wi-Fi)"), urls,
    h("span", {class:"lbl"}, "Recorder link"),
    h("p", {class:"hint keep"}, "Pick the Aria's port, or the Nova's own port on a direct cable, and connect (38400 baud, odd parity). Close NovaTouch first: only one program can use the port. Every session's raw traffic is also saved to a capture file on the cart computer."),
    row("Port", portSel), row("Baud", baudSel), row("Parity", parSel),
    helloRow(),
    h("label", {class:"row", for:"f-listen"}, h("span", {class:"lbl"}, "Listen only"), h("span", {class:"flex"}, listenCk, h("span", {class:"hint keep"}, "Send nothing to the Nova (no hello, no changes); just record what it sends. For tapping a Nova plugged straight into the computer."))),
    h("div", {class:"flex"}, h("button", {type:"button", class:"btn", onclick:() => net.send({t:"ports"})}, "Refresh ports"), openB, closeB, reloadB),
    st, novaSt,
    h("span", {class:"lbl"}, "Note in the capture"),
    h("div", {class:"flex"}, h("div", {style:"flex:1;min-width:0"}, noteIn), h("button", {type:"button", class:"btn", onclick:addNote}, "Add note")),
    h("p", {class:"hint keep"}, "Type what you're about to do on the Nova and press Enter; the note is saved in the capture file at that moment."),
    pageFinder(),
    testPanel());
}



/* Nov 15: which hello Nova Relay starts with (default NovaTouch; the afternoon's freezes were the Pi's power, not the
   hello). Used from the next Connect. Also the box's power warning. */
function helloRow(){
  const sel = h("select", {class:"sel", id:"f-hello", onchange:e => net.send({t:"helloMode", mode:e.target.value})},
    h("option", {value:"touch"}, "NovaTouch (shows as 0.92.03 on the Nova)"), h("option", {value:"own"}, "Nova Relay (shows as 0.6.x)"));
  /* Nov 15: the Nova Relay box's power (vcgencmd); a weak supply made the Nova's cable echo and the Nova freeze. */
  const pw = h("p", {class:"hint keep", role:"status", style:"color:var(--rec)"});
  const draw = () => {
    if(document.activeElement !== sel) sel.value = (cart.nova && cart.nova.helloMode) || "touch";
    const p = cart.nova && cart.nova.power;
    pw.textContent = !p ? "" : p.under ? "Power: the box's supply is too weak right now. The Nova's cable, the Aria and a Stream Deck can misbehave, and the Nova can freeze. Use the Pi's own supply (Pi 5: 5 V 5 A) or a stronger power bank."
      : p.since ? "Power: the box's supply ran short since it started. If the Nova froze or the link showed noise, use a stronger supply." : "";
    pw.hidden = !pw.textContent;
  };
  cartSubs.add(draw); draw();
  return h("div", {class:"stack", style:"gap:4px"}, pw,
    h("label", {class:"row", for:"f-hello"}, h("span", {class:"lbl"}, "Say hello as"), sel),
    h("p", {class:"hint keep"}, "How Nova Relay introduces itself to the Nova; the Nova shows it as the computer's version. NovaTouch is the default: the Nova's NovaTouch licence covers it. As Nova Relay, the Nova gives the direct cable only its demo time. Changes take effect at the next Connect (Close port, then Connect)."));
}

/* Trim finder (Oct 28): RX trim written to the Nova lands on a different input than its number says. The cart sends
   +1 dB then 0 dB to each trim number and records which input the Nova reports; RX trim then uses those numbers. */
function pageFinder(){
  let armed = false;
  const status = h("p", {class:"hint keep", role:"status"});
  const list = h("div", {class:"hint keep"});
  const runB = h("button", {type:"button", class:"btn primary", onclick:() => {
    if(!(cart.nova && cart.nova.connected)){ toast("Not connected to the Nova, so nothing was sent."); return; }
    if(!armed){ armed = true; draw(); return; }
    armed = false; net.send({t:"trimScan"}); }});
  const draw = () => {
    const conf = (cart.nova && cart.nova.conf) || {}, sc = cart.scan;
    const rows = Object.keys(conf).map(Number).sort((a, b) => a - b).map(k => `${k} \u2192 ${inLabel(conf[k])}`);
    list.textContent = rows.length ? "Found: " + rows.join(" \u00b7 ") : "Not run yet.";
    const running = sc && !sc.done;
    runB.disabled = !!running;
    runB.textContent = running ? `Scanning\u2026 number ${sc.n} of 31` : armed ? "Tap again to start" : "Find RX trim numbers";
    const rx = [14, 15, 16, 17, 18, 19, 20, 21].filter(i => Object.values(conf).includes(i)).length;
    status.textContent = armed ? "This sets the trim on AES and RX inputs to 0 dB as it goes. Tap again to start, or leave the page to cancel."
      : rows.length ? `${rx} of 8 RX inputs found. RX trim from the remote works for those.` : "";
  };
  cartSubs.add(draw); draw();
  return h("div", {class:"panel", style:"margin-top:8px"},
    h("h3", null, "RX trim finder"),
    h("p", {class:"hint keep"}, "The Nova puts RX trim sent from a computer on a different input than it should. This sends +1 dB and then 0 dB to each trim number, about 30 seconds in all, and notes which input the Nova changes. Set any AES and RX trims you want to keep afterwards: they end at 0 dB."),
    h("div", {class:"flex"}, runB), status, list);
}

/* Protocol test tools (Nov 14, 0.6.0): experiments from Zaxcom's protocol notes, not yet confirmed on a PC link.
   Installed app only, gated behind an enable box, blocked while recording by the server. Everything is logged as
   TEST SEND. ZaxNet power-all (cQRXTX sub 98); surface controls fader/trim/output/encoder (0x21-0x24). */
function testPanel(){
  function draw(){ if(typeof fillTx === "function" && document.activeElement !== txSel) try{ fillTx(); }catch(e){} const nv = cart.nova || {}; const ok = arm.checked && nv.connected && !nv.listen; panel.querySelectorAll("button,select,input[type=range]").forEach(el => el.disabled = !ok); }
  const arm = h("input", {type:"checkbox", id:"f-test-arm", onchange:draw});
  const testSend = (path, label) => {
    if(!(cart.nova && cart.nova.connected)){ toast("Not connected to the Nova."); return; }
    fetch(path, {method:"POST"}).then(r => r.json()).then(o => toast(o.ok ? (label + " sent") : (o.error || "Not sent"))).catch(() => toast("Send failed."));
  };
  /* Nov 19: every transmitter only. One transmitter by ZaxNet ID (cQRXTX 98 with a unit) changed every transmitter on
     the cart (Ferris), so the picker is gone. */
  const txSel = h("span", {class:"lbl"}, "All transmitters"), fillTx = null;
  const powBtn = (word, label) => h("button", {type:"button", class:"btn", onclick:() => { testSend("api/test/power/" + word, "Power all " + label); }}, label);
  const chSel = (n) => { const s = h("select", {class:"sel"}); for(let i = 0; i < n; i++) s.appendChild(h("option", {value:i}, String(i + 1))); return s; };
  const slider = () => { const r = h("input", {type:"range", min:0, max:255, value:128, style:"flex:1;min-width:80px"}); const o = h("span", {class:"mono", style:"min-width:3ch;text-align:right"}, "128"); r.addEventListener("input", () => o.textContent = r.value); return [r, o]; };
  const faderCh = chSel(16), faderSl = slider();
  const trimCh = chSel(16), trimSl = slider();
  const outCh = chSel(8), outSl = slider();
  const surfaceRow = (name, sel, sl, send) => h("div", {class:"flex", style:"gap:6px;align-items:center;flex-wrap:nowrap"}, h("span", {class:"lbl", style:"min-width:4.5em"}, name), sel, sl[0], sl[1], h("button", {type:"button", class:"btn", onclick:send}, "Send"));
  const panel = h("div", {class:"panel", style:"margin-top:8px"},
    h("h3", null, "Protocol test tools (experimental)"),
    h("p", {class:"hint keep"}, "These send straight to the Nova and can move the live mix or the transmitters. Tick the box to turn them on. They are blocked while recording. Every send is in the Link log and the capture as TEST SEND."),
    h("label", {class:"row", for:"f-test-arm"}, h("span", {class:"lbl"}, "Enable test sends"), h("span", {class:"flex"}, arm)),
    h("span", {class:"lbl"}, "Transmitter power"),
    h("div", {class:"flex", style:"align-items:center;gap:6px"}, txSel, powBtn("on", "On"), powBtn("wake", "Wake"), powBtn("low", "Low")),
    h("p", {class:"hint keep"}, "Every transmitter at once (works, Nov 14). One transmitter by its ZaxNet ID can't be done this way: the transmitters take this command as for all of them (Nov 19)."),
    h("span", {class:"lbl"}, "Surface controls (may move the live mix)"),
    surfaceRow("Fader", faderCh, faderSl, () => testSend("api/test/fader/" + faderCh.value + "/" + faderSl[0].value, "Fader " + (+faderCh.value + 1))),
    surfaceRow("Trim", trimCh, trimSl, () => testSend("api/test/trim/" + trimCh.value + "/" + trimSl[0].value, "Trim " + (+trimCh.value + 1))),
    surfaceRow("Output", outCh, outSl, () => testSend("api/test/out/" + outCh.value + "/" + outSl[0].value, "Output " + (+outCh.value + 1))),
    h("div", {class:"flex", style:"align-items:center;gap:6px"}, h("span", {class:"lbl", style:"min-width:4.5em"}, "Encoder"),
      h("button", {type:"button", class:"btn", onclick:() => testSend("api/test/enc/-3", "Encoder left")}, "Menu left"),
      h("button", {type:"button", class:"btn", onclick:() => testSend("api/test/enc/3", "Encoder right")}, "Menu right")),
    h("p", {class:"hint keep"}, "For front-panel PFL: toggle PFL on the Nova and look for the PFL/solo masks lines in the Link log."));
  cartSubs.add(draw); draw();
  return panel;
}

function presetPicker(''')

# ---- 6c. Setup › Updates (Nov 18): the cart computer checks GitHub, downloads, checks the signature, installs and
#      restarts; this page shows it and sends an update file. If the cart computer has no internet but this device
#      does (a phone on cellular), this device checks GitHub itself and sends the update over.
_i = s.index('let protoUpd = {'); _j = s.index('const updAgo = t =>')
s = s[:_i] + r"""let updDraw = null, updDev = null, updLocal = null;
const updCmp = (a, b) => { const pa = String(a).split(".").map(n => parseInt(n, 10) || 0), pb = String(b).split(".").map(n => parseInt(n, 10) || 0);
  for(let i = 0; i < Math.max(pa.length, pb.length); i++){ const d = (pa[i] || 0) - (pb[i] || 0); if(d) return d < 0 ? -1 : 1; } return 0; };
function updState(){
  const u = {...(cart.update || {running:cart.version || "", appVersion:"", auto:true})};
  u.recording = !!u.recording || sim.state === "RECORDING";
  if(updLocal) u.busy = updLocal;
  if(!u.available && updDev && updCmp(updDev.version, u.running) > 0){ u.available = true; u.latest = updDev; u.viaDevice = true; u.error = null; }
  return u;
}
function updChanged(){ updDraw && updDraw(); const b = document.querySelector('.secbtn .secdot'); if(current === "setup" && !!b !== !!updState().available) go("setup"); }
async function updDeviceCheck(){
  const url = cart.update && cart.update.latestUrl; if(!url) return;
  try{ const r = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), {cache:"no-store"}); if(!r.ok) return;
    const j = await r.json(); if(!j || !j.version || !j.file) return;
    updDev = {version:String(j.version), file:String(j.file), url:new URL(j.file, url).href, sha256:j.sha256 || null, size:+j.size || null, notes:Array.isArray(j.notes) ? j.notes.map(String) : [], date:j.date || null};
    updChanged();
  }catch(_){ }
}
function updCheckNow(){ net.send({t:"updateCheck"}); }
function updSetAuto(on){ net.send({t:"updateAuto", on}); }
function updSend(blob, name){
  updLocal = "sending"; updChanged();
  const x = new XMLHttpRequest(); x.open("POST", "/update/file"); x.setRequestHeader("Content-Type", "application/zip"); x.setRequestHeader("X-Nova-Device", deviceName());
  x.upload.onprogress = e => { if(e.lengthComputable){ updLocal = "sending " + Math.round(e.loaded * 100 / e.total) + "%"; updDraw && updDraw(); } };
  x.onload = () => { updLocal = null; let j = {}; try{ j = JSON.parse(x.responseText); }catch(_){ }
    if(!j.ok) toast(j.error || "The update wasn't installed."); updChanged(); };
  x.onerror = () => { updLocal = null; toast("Couldn't send the update to the cart computer."); updChanged(); };
  x.send(blob);
}
async function updInstallLatest(){
  const u = updState();
  if(!u.viaDevice){ net.send({t:"updateInstall"}); return; }
  updLocal = "downloading"; updChanged();
  try{ const r = await fetch(u.latest.url, {cache:"no-store"}); if(!r.ok) throw new Error("HTTP " + r.status);
    const blob = await r.blob(); updSend(blob, u.latest.file); }
  catch(e){ updLocal = null; toast("Couldn't download the update on this device (" + e.message + ")."); updChanged(); }
}
function updInstallFile(file){
  if(!/\.zip$/i.test(file.name)){ toast("That isn't a Nova Relay update (a .zip)"); return; }
  updSend(file, file.name);
}
function updGoBack(){ net.send({t:"updateBack"}); }
function updOnMessage(m){
  cart.update = m.update || cart.update;
  if(m.fail) toast("Update not installed: " + m.fail);
  if(m.done) toast(m.done.back ? `Going back to Nova Relay ${m.done.version}… this page reconnects by itself.` : `Installing Nova Relay ${m.done.version}… this page reconnects by itself.`);
  if(cart.update && cart.update.offline && !updDev) updDeviceCheck();
  const u = updState();
  if(u.available){ let seen = null; try{ seen = localStorage.getItem("novaUpdateSeen"); }catch(_){ }
    if(seen !== u.latest.version){ try{ localStorage.setItem("novaUpdateSeen", u.latest.version); }catch(_){ } toast(`Nova Relay ${u.latest.version} is available: Setup › Updates`); } }
  updChanged();
}
""" + s[_j:]
rep('    case "deckPress": deckOnPress("k" + m.key); break;', '    case "deckPress": deckOnPress("k" + m.key); break;\n    case "update": updOnMessage(m); break;')


# ---- 6d. Setup › Connection › Something went wrong? (Nov 18): saved on the cart computer, downloaded from it
_i = s.index('function diagSave(minutes, note){'); _j = s.index('const diagReportHref = () => "";') + len('const diagReportHref = () => "";')
s = s[:_i] + """function diagSave(minutes, note){ net.send({t:"captureSave", minutes, note}); }
const diagReportHref = () => "/api/problem-report?who=" + encodeURIComponent(deviceName());
function diagOnSaved(m){
  if(Array.isArray(m.saved)) diagSaved = m.saved.map(f => ({name:f.name, url:"/api/capture/saved/" + f.name}));
  if(m.name) toast(`Saved the last ${m.minutes} minutes (${m.name})`);
  diagDraw && diagDraw();
}""" + s[_j:]
rep("""  diagDraw = draw; draw();
  const href = diagReportHref();""", """  diagDraw = draw; draw(); net.send({t:"capturesSaved"});
  const href = diagReportHref();""")
rep('    case "update": updOnMessage(m); break;', """    case "update": updOnMessage(m); break;
    case "captureSaved": diagOnSaved(m); break;
    case "novaDiff": toast(`${m.count} of the Nova's settings ${m.count === 1 ? "is" : "are"} different from the last session: see Setup \\u203a Connection \\u203a Link log`); break;""")

rep('function go(v){\n', 'function go(v){\n  cartSubs.clear();\n')

# ---- 6b. meters come from the Nova while it's connected
rep('function trackDb(t){\n', 'function trackDb(t){\n  if(sim.nova) return sim.nova.trk[t] ?? -120;\n')
rep('function outDb(o, depth = 0){\n', 'function outDb(o, depth = 0){\n  if(sim.nova) return sim.nova.out[o] ?? -120;\n')

# ---- 7. boot: connect to the cart
rep('log("ev", `Connected to simulated recorder · ${SCHEMA.length} settings · protocol 01.01`);',
    'setCartStatus(false); $("linkText").textContent = "Connecting\\u2026";\nnet.connect();')
open(dst, 'w').write(s)
print("ok", len(s))

# ---- 8. the settings table, for the cart server's Nova link
import json, os
m = re.search(r'const SCHEMA = (\[.*?\]);\n', s)
schema = json.loads(m.group(1))
open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(dst))), 'schema.json'), 'w').write(json.dumps(schema, separators=(',', ':')))
print("schema", len(schema))
