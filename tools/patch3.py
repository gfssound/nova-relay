import re,sys
p=sys.argv[1]; s=open(p).read()
def rep(a,b,count=1):
    global s
    assert s.count(a)==count, ("MISSING",a[:80],s.count(a))
    s=s.replace(a,b)

rep('family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=Chivo+Mono:wght@400;600&display=swap',
    'family=Saira+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=Martian+Mono:wght@400;500&family=Rubik:wght@500;600;700&family=Azeret+Mono:wght@500;600&display=swap')

CSS = r'''
/* ---- Layout: Console strips (desk) ---- */
body[data-layout="console"]{
  --ground:#0a0b0c; --surface:#121416; --raised:#16181b; --raised-2:#20242a; --line:#2a2e33;
  --fg:#e8e8e6; --muted:#9a9fa5; --dim:#6b7178; --accent:#7fb2e5; --accent-ink:#0a0b0c;
  --rec:#ff4d4f; --ok:#2fd27a; --warn:#ffc93c; --meter-bg:#0a0b0c;
  --f-display:"Saira Condensed","Arial Narrow",system-ui,sans-serif;
  --f-mono:"Martian Mono",ui-monospace,Menlo,Consolas,monospace; --r:4px;
}
.strips-wrap{overflow-x:auto;max-width:100%}
.strips{display:grid;gap:6px;min-width:0}
.strip{background:var(--raised);border:1px solid var(--line);border-radius:var(--r);padding:6px;display:flex;flex-direction:column;gap:6px;min-width:0}
.scrib{border-radius:2px;padding:4px 2px;text-align:center;font-family:var(--f-display);font-weight:700;font-size:15px;letter-spacing:.03em;color:#0a0b0c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sinfo{display:flex;justify-content:space-between;gap:4px;font-family:var(--f-mono);font-size:10px;color:var(--muted);white-space:nowrap}
.led{display:block;width:100%;height:clamp(220px,42vh,420px)}
.sflags{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px}
.sflags span{text-align:center;font-family:var(--f-display);font-size:11px;font-weight:600;padding:2px 0;border:1px solid var(--line);border-radius:2px;color:var(--dim)}
.sflags span.p48{color:var(--rec)}
.sflags span.on{color:var(--accent)}
.sarm{height:44px;border-radius:3px;border:1px solid var(--line);background:var(--ground);color:var(--muted);font-family:var(--f-display);font-weight:700;font-size:14px;letter-spacing:.12em}
.sarm[aria-pressed="true"]{background:var(--rec);border-color:var(--rec);color:#0a0b0c}
.sarm:disabled{opacity:.35;cursor:default}

/* ---- Layout: Big touch (tablet) ---- */
body[data-layout="touch"]{
  --ground:#0f1726; --surface:#141e31; --raised:#18233a; --raised-2:#22304d; --line:#2a3a58;
  --fg:#eef2f8; --muted:#9aa8c0; --dim:#6b7a94; --accent:#6cc4ff; --accent-ink:#06121c;
  --rec:#ff5a5f; --ok:#3ccf8e; --warn:#ffcf4a; --meter-bg:#0f1726;
  --f-display:"Rubik",system-ui,sans-serif; --f-body:"Rubik",system-ui,sans-serif;
  --f-mono:"Azeret Mono",ui-monospace,Menlo,Consolas,monospace; --r:14px;
  --t-sm:15px; --t-md:17px;
}
body[data-layout="touch"] .app{grid-template-rows:auto auto 1fr auto}
body[data-layout="touch"][data-view="home"] .app{grid-template-rows:auto 1fr auto}
body[data-layout="touch"][data-view="home"] .transport{display:none}
body[data-layout="touch"] main{order:3}
body[data-layout="touch"] .tabs{order:4;gap:8px;padding-block:10px;border-top:1px solid var(--line);border-bottom:0}
body[data-layout="touch"] .tab{background:var(--raised);border:0;border-radius:12px;padding:14px 20px;text-transform:none;letter-spacing:0;font-size:17px;color:var(--fg)}
body[data-layout="touch"] .tab[aria-selected="true"]{background:var(--fg);color:var(--ground)}
body[data-layout="touch"] .tb{width:84px;height:68px}
body[data-layout="touch"] .chip,body[data-layout="touch"] .seg-b,body[data-layout="touch"] .btn,body[data-layout="touch"] .sel{min-height:44px}
body[data-layout="touch"] .num button{height:44px}
body[data-layout="touch"] .num{grid-template-columns:44px minmax(60px,1fr) 44px minmax(64px,auto)}
body[data-layout="touch"] .num.compact{grid-template-columns:44px minmax(52px,auto) 44px}
body[data-layout="touch"] .lbl{text-transform:none;letter-spacing:.01em;font-size:13px}
.thome{display:grid;grid-template-columns:minmax(0,440px) minmax(0,1fr);gap:20px;align-items:start}
.tleft{display:flex;flex-direction:column;gap:14px;min-width:0}
.tpanel{background:var(--raised);border-radius:var(--r);padding:16px 20px;display:flex;flex-direction:column;gap:6px}
.tline{display:flex;justify-content:space-between;gap:10px;font-size:15px;font-weight:600;color:var(--muted)}
.bigtc{font-family:var(--f-mono);font-weight:600;font-size:clamp(40px,5.4vw,64px);line-height:1.05;font-variant-numeric:tabular-nums}
.bigtc.recording,.tline .recording{color:var(--rec)}
.tslate{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tile{background:var(--raised);border:0;border-radius:var(--r);padding:12px 18px;text-align:left;display:flex;flex-direction:column;gap:2px;min-width:0}
.tile span{font-size:14px;font-weight:600;color:var(--muted)}
.tile b{font-size:40px;font-weight:700;line-height:1.05}
.tile.wide{grid-column:1/-1}
.tile.wide b{font-size:24px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ttrans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.bigbtn{min-height:76px;border-radius:var(--r);border:2px solid var(--line);background:var(--ground);font-weight:700;font-size:20px}
.bigbtn[aria-pressed="true"]{border-color:var(--fg)}
.bigbtn.tone[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.bigbtn.rec{grid-column:1/-1;min-height:96px;background:var(--rec);border-color:var(--rec);color:#1a0607;font-size:26px;letter-spacing:.04em}
.bigbtn.rec[aria-pressed="true"]{animation:blink 1s steps(2,start) infinite}
@media (prefers-reduced-motion:reduce){.bigbtn.rec[aria-pressed="true"]{animation:none}}
.hmeters{background:var(--raised);border-radius:var(--r);padding:16px 20px;display:flex;flex-direction:column;gap:6px;min-width:0}
.hmeters .hhead{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:4px}
.hmeters .hhead b{font-size:22px}
.hrow{display:grid;grid-template-columns:minmax(96px,140px) minmax(0,1fr);gap:12px;align-items:center}
.harm{display:flex;align-items:center;gap:10px;background:none;border:0;font-size:18px;font-weight:600;text-align:left;padding:0;min-height:44px;min-width:0}
.harm span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.harm i{width:14px;height:14px;border-radius:50%;border:2px solid var(--dim);flex:none}
.harm[aria-pressed="true"] i{background:var(--rec);border-color:var(--rec)}
.hbar{position:relative;height:30px;border-radius:8px;overflow:hidden;background:linear-gradient(to right,var(--ok) 0 75.7%,var(--warn) 75.7% 93.8%,var(--rec) 93.8%)}
.hbar .mask{position:absolute;top:0;bottom:0;right:0;width:100%;background:var(--ground)}
.hbar .pk{position:absolute;top:0;bottom:0;left:0;width:3px;background:var(--fg)}
.layout-seg .seg-b{padding:5px 10px;min-height:0}
@media (max-width:860px){.thome{grid-template-columns:minmax(0,1fr)}}
'''
rep('\n@media (max-width:860px){\n  .grid2', CSS+'\n@media (max-width:860px){\n  .grid2')

rep('<div class="brand">Cart Remote <small>prototype</small></div>',
    '<div class="brand">Cart Remote <small>prototype</small></div>\n    <div class="seg layout-seg" id="layoutSeg" role="group" aria-label="Layout"><button type="button" class="seg-b" data-l="console">Console</button><button type="button" class="seg-b" data-l="touch">Big touch</button></div>')

rep('''    if(i < base) out.push(src === 0 ? {id:"t" + i, name:get("track.name", [i]) || `TRK ${i+1}`, num:i+1, db:() => trackDb(i), arm:i}
                                    : {id:"o" + i, name:`OUT ${i+1}`, num:i+1, db:() => outDb(i), arm:null});
    else { const ch = i - base; out.push({id:"i" + ch, name:get("input.name", [ch]) || `IN ${ch+1}`, num:"ISO " + (ch+1), db:() => sim.inDb[ch], arm:src === 0 ? i : null}); }''',
'''    if(i < base) out.push(src === 0 ? {id:"t" + i, kind:"t", t:i, name:get("track.name", [i]) || `TRK ${i+1}`, num:i+1, db:() => trackDb(i), arm:i}
                                    : {id:"o" + i, kind:"o", name:`OUT ${i+1}`, num:i+1, db:() => outDb(i), arm:null});
    else { const ch = i - base; out.push({id:"i" + ch, kind:"i", ch, name:get("input.name", [ch]) || `IN ${ch+1}`, num:"ISO " + (ch+1), db:() => sim.inDb[ch], arm:src === 0 ? i : null}); }''')

# replace home render
m=re.search(r'\n  home\(\)\{.*?\n  inputs\(\)\{', s, re.S); assert m
s=s[:m.start()]+'\n  home(){ return layout === "touch" ? homeTouch() : homeConsole(); },\n\n  inputs(){'+s[m.end():]

FUNCS = r'''
/* ---------- Meters home: shared pieces ---------- */
function homePanels(){
  return h("div", {class:"sub"},
    h("div", {class:"panel"}, h("h3", null, "Bridge"),
      row("Meters", ctl("home.meters.count", [], {compact:true, fmt:v => String(v)})),
      row("Source", ctl("home.meters.source")),
      h("p", {class:"hint"}, "Arm or disarm a track from its meter. Slots past the mix tracks show iso inputs.")),
    h("div", {class:"panel"}, h("h3", null, "Mix"),
      row("Track preset", presetPicker("trackmix.preset", "trackmix.names")),
      row("NeverClip", ctl("neverclip.attenuation", [], {select:true})),
      row("Tone level", ctl("tone.level", [], {compact:true}))),
    h("div", {class:"panel"}, h("h3", null, "Recent takes"), historyTable(4)));
}
function slotColor(s){
  if(s.kind === "t") return hex(get("track.color", [s.t]) || 0x5a6066);
  if(s.kind === "i") return hex(get("input.color", [s.ch]) || 0x5a6066);
  return "#a9b4bb";
}
/* A track strip shows input details when exactly one input feeds it at unity. */
function stripInput(s){
  if(s.kind === "i") return s.ch;
  if(s.kind !== "t") return null;
  const p = get("trackmix.preset") - 1; let found = null, n = 0;
  for(let i = 0; i < 22; i++){ const v = get("trackmix.matrix", [p, s.t, i]); if(v > 0){ n++; if(v === 7) found = i; } }
  return n === 1 ? found : null;
}
function drawLED(cv, b){
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if(!W || !H) return;
  if(cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)){ cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const seg = 8, gap = 2, lit = H - yOf(b.d, H);
  for(let y0 = 0; y0 < H; y0 += seg){
    const f = (y0 + seg) / H;
    c.fillStyle = f > 0.938 ? COLORS["--rec"] : f > 0.757 ? COLORS["--warn"] : COLORS["--ok"];
    c.globalAlpha = y0 + seg / 2 <= lit ? 1 : 0.13;
    c.fillRect(0, H - y0 - seg + gap, W, seg - gap);
  }
  c.globalAlpha = 1;
  if(b.p > FLOOR){ c.fillStyle = "#ffffff"; c.fillRect(0, yOf(b.p, H) - 2, W, 4); }
}

function homeConsole(){
  const strips = h("div", {class:"strips"});
  let hooks = [];
  const rebuild = () => {
    viewBinds = viewBinds.filter(b => !b.strip); const before = viewBinds.length;
    const slots = meterSlots(); hooks = [];
    strips.style.gridTemplateColumns = `repeat(${slots.length}, minmax(64px, 1fr))`;
    strips.replaceChildren(...slots.map(s => {
      const ch = stripInput(s);
      const scrib = h("div", {class:"scrib", title:s.name}, s.name); scrib.style.background = slotColor(s);
      const trim = h("span");
      if(ch == null) trim.textContent = s.kind === "o" ? "OUT" : "MIX";
      else bind("input.trim.level", [ch], v => trim.textContent = (v > 0 ? "+" : "") + v + " dB");
      const flag = (k, cls, txt) => { const sp = h("span", null, txt); if(ch != null) bind(k, [ch], v => sp.className = v ? cls : ""); return sp; };
      const cv = h("canvas", {class:"led", "aria-hidden":"true"});
      hooks.push(dt => drawLED(cv, ballistic(s.id, s.db(), dt)));
      const arm = h("button", {type:"button", class:"sarm", disabled:s.arm == null, "aria-label":"Record enable " + s.name,
        onclick:() => set("record.tracks", [s.arm], get("record.tracks", [s.arm]) ? 0 : 1)}, "ARM");
      if(s.arm != null) bind("record.tracks", [s.arm], v => arm.setAttribute("aria-pressed", v ? "true" : "false"));
      return h("div", {class:"strip"}, scrib,
        h("div", {class:"sinfo"}, h("span", null, typeof s.num === "number" ? String(s.num).padStart(2, "0") : s.num), trim),
        cv,
        h("div", {class:"sflags"}, flag("input.power48V", "p48", "48V"), flag("input.hpf.enable", "on", "HPF"), flag("input.phase", "on", "Ø")),
        arm);
    }));
    viewBinds.slice(before).forEach(b => b.strip = true);
  };
  bind("home.meters.count", [], rebuild); bind("home.meters.source", [], rebuild);
  bind("track.name", [], rebuild); bind("track.color", [], rebuild); bind("trackmix.preset", [], rebuild);
  frameHooks.push(dt => hooks.forEach(f => f(dt)));
  return h("div", {class:"stack"}, h("div", {class:"strips-wrap"}, strips), homePanels());
}

function homeTouch(){
  const tc = h("div", {class:"bigtc"}), state = h("span");
  frameHooks.push(() => {
    tc.textContent = $("tc").textContent;
    const rec = sim.state === "RECORDING";
    tc.classList.toggle("recording", rec);
    state.textContent = rec ? `● Recording ${fmtDur(sim.elapsed)}` : sim.state === "PLAYING" ? `Playing ${fmtDur(sim.elapsed)}` : "Stopped";
    state.className = rec ? "recording" : "";
  });
  const tcLbl = h("span"); bind("timecode.framerate", [], () => tcLbl.textContent = `${$("tcLabel").textContent.replace(" TC", "")} · ${sim.fr().l}`);
  const tile = (k, lbl, wide) => { const b = h("b"); bind(k, [], v => b.textContent = v || "—");
    return h("button", {type:"button", class:"tile" + (wide ? " wide" : ""), onclick:() => go("meta")}, h("span", null, lbl), b); };
  const big = (cmd, txt, cls) => h("button", {type:"button", class:"bigbtn " + (cls || ""), "data-cmd":cmd, onclick:() => link.send({op:"CMD", name:cmd})}, txt);
  const tone = h("button", {type:"button", class:"bigbtn tone", onclick:() => set("tone.enable", [], get("tone.enable") ? 0 : 1)}, "Tone");
  bind("tone.enable", [], v => tone.setAttribute("aria-pressed", v ? "true" : "false"));
  const left = h("div", {class:"tleft"},
    h("div", {class:"tpanel"}, h("div", {class:"tline"}, tcLbl, state), tc),
    h("div", {class:"tslate"}, tile("scene.current", "Scene"), tile("take.current", "Take"), tile("note.current", "Note", true)),
    h("div", {class:"ttrans"}, tone, big("STOP", "Stop"), big("PLAY", "Play"), big("RECORD", "● REC", "rec")));

  const list = h("div", {class:"stack", style:"gap:6px"});
  let hooks = [];
  const rebuild = () => {
    viewBinds = viewBinds.filter(b => !b.hrow); const before = viewBinds.length;
    hooks = [];
    list.replaceChildren(...meterSlots().map(s => {
      const mask = h("div", {class:"mask"}), pk = h("div", {class:"pk"});
      hooks.push(dt => { const b = ballistic(s.id, s.db(), dt);
        const f = d => Math.pow(Math.max(0, Math.min(1, (d - FLOOR) / -FLOOR)), 1.25);
        mask.style.width = ((1 - f(b.d)) * 100).toFixed(2) + "%";
        pk.style.left = `calc(${(f(b.p) * 100).toFixed(2)}% - 3px)`; pk.style.opacity = b.p > FLOOR ? 1 : 0; });
      let name;
      if(s.arm == null) name = h("div", {class:"harm"}, h("i", {style:"visibility:hidden"}), h("span", null, s.name));
      else { name = h("button", {type:"button", class:"harm", "aria-label":"Record enable " + s.name, onclick:() => set("record.tracks", [s.arm], get("record.tracks", [s.arm]) ? 0 : 1)}, h("i"), h("span", null, s.name));
        bind("record.tracks", [s.arm], v => name.setAttribute("aria-pressed", v ? "true" : "false")); }
      return h("div", {class:"hrow"}, name, h("div", {class:"hbar", "aria-hidden":"true"}, mask, pk));
    }));
    viewBinds.slice(before).forEach(b => b.hrow = true);
  };
  bind("home.meters.count", [], rebuild); bind("home.meters.source", [], rebuild); bind("track.name", [], rebuild);
  frameHooks.push(dt => hooks.forEach(f => f(dt)));
  const info = h("span", {class:"mono", style:"font-size:13px;color:var(--muted)"});
  frameHooks.push(() => { info.textContent = `${$("stRate").textContent} · Drive ${$("stDrive").textContent} · ${$("stBatt").textContent}`; });
  const right = h("div", {class:"hmeters"}, h("div", {class:"hhead"}, h("b", null, "Tracks"), info), list);
  setTimeout(renderTransport, 0);
  return h("div", {class:"stack"}, h("div", {class:"thome"}, left, right), homePanels());
}

function presetPicker('''
rep('\nfunction presetPicker(', FUNCS, 1)

rep('''  current = v; viewBinds = []; frameHooks = [];''','''  current = v; viewBinds = []; frameHooks = []; document.body.dataset.view = v;''')
rep('''  $("stState").textContent = st;\n''','''  $("stState").textContent = st;
  document.querySelectorAll("[data-cmd]").forEach(b => b.setAttribute("aria-pressed", ({RECORD:"RECORDING", STOP:"STOPPED", PLAY:"PLAYING"})[b.dataset.cmd] === st ? "true" : "false"));
''')
rep('function readColors(){ const cs = getComputedStyle(document.documentElement);','function readColors(){ COLORS = {}; const cs = getComputedStyle(document.body);')
rep('''function wireChrome(){''','''let layout = "console";
try{ layout = localStorage.getItem("cart-remote-layout") || (matchMedia("(pointer: coarse)").matches ? "touch" : "console"); }catch(e){}
if(layout !== "touch") layout = "console";
function applyLayout(l, rerender){
  layout = l; document.body.dataset.layout = l; readColors();
  [...$("layoutSeg").children].forEach(b => b.setAttribute("aria-pressed", b.dataset.l === l ? "true" : "false"));
  try{ localStorage.setItem("cart-remote-layout", l); }catch(e){}
  if(rerender){ ballistics.clear(); go(current); renderTransport(); }
}
function wireChrome(){
  [...$("layoutSeg").children].forEach(b => b.addEventListener("click", () => applyLayout(b.dataset.l, true)));''')
rep('''readColors();
wireChrome();''','''wireChrome();
applyLayout(layout, false);''')
# drawBridge font reference to mono var still fine
open(p,'w').write(s)
print("patched")
