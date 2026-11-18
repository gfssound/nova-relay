const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(500);
const r = await p.evaluate(() => {
  const sent = []; const orig = link.send.bind(link); link.send = m => { if(m.op === "SET" && /name/.test(m.k)) sent.push(`${m.k}[${m.idx}]=${m.val}`); orig(m); };
  const pr = get("trackmix.preset") - 1, out = {};
  const names0 = Array.from({length:16}, (_, t) => get("track.name", [t]));
  // 1. routing changes on track 1 (add Analog 1, then RX 1, then remove) must not rename anything
  set("trackmix.matrix", [pr, 0, 0], 1); set("trackmix.matrix", [pr, 0, 14], 1); set("trackmix.matrix", [pr, 0, 0], 0); set("trackmix.matrix", [pr, 0, 14], 0);
  out.routing = { sent: sent.splice(0), changed: names0.map((n, t) => n !== get("track.name", [t]) ? `${t+1}:${n}->${get("track.name",[t])}` : null).filter(Boolean) };
  // 2. two tracks fed only by RX 1: tracks 5 and 9
  for(let i=0;i<22;i++){ set("trackmix.matrix",[pr,4,i], i===14?1:0); set("trackmix.matrix",[pr,8,i], i===14?1:0); }
  sent.splice(0);
  const t5 = get("track.name",[4]), t9 = get("track.name",[8]);
  set("track.name", [8], "ANNA ISO");
  out.renameTrack = { sent: sent.splice(0), t5before: t5, t5after: get("track.name",[4]), t9: get("track.name",[8]), rx1: get("input.name",[14]) };
  // 3. renaming the input names its tracks (explicit)
  set("input.name", [14], "ANNA");
  out.renameInput = { sent: sent.splice(0), t5: get("track.name",[4]), t9: get("track.name",[8]) };
  // 4. a name arriving from the Nova changes only that track
  set("track.name", [4], "BOOM X", "remote");
  out.fromNova = { sent: sent.splice(0), t5: get("track.name",[4]), t9: get("track.name",[8]) };
  return out;
});
console.log(JSON.stringify(r, null, 1)); console.log(errs); await b.close(); })();
