const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('build/cart-remote.html')); await p.waitForTimeout(500);
const r = await p.evaluate(() => {
  const sent=[]; const o=link.send.bind(link); link.send=m=>{ if(m.op==="SET"&&/name/.test(m.k)) sent.push(`${m.k}[${m.idx}]=${m.val}`); o(m); };
  const pr=get("trackmix.preset")-1, out={};
  ["Mix","Boom1","Boom2","Jesus","Peter","John","Matthew"].forEach((n,t)=>set("track.name",[t],n));
  out.renameSent = sent.splice(0);
  out.labelsAfterRename = [14,15,16,17].map(inFull);
  for(const [t,ch] of [[3,14],[4,15],[5,16],[6,17]]) for(let i=0;i<22;i++) set("trackmix.matrix",[pr,t,i], i===ch?1:0);
  out.rerouteSent = sent.splice(0);
  out.labelsAfterReroute = [14,15,16,17,0,1].map(inFull);
  out.tracks = Array.from({length:8},(_,t)=>get("track.name",[t])).join(",");
  // two tracks fed only by RX 5
  for(const t of [8,9]) for(let i=0;i<22;i++) set("trackmix.matrix",[pr,t,i], i===18?1:0);
  set("track.name",[8],"LUKE"); set("track.name",[9],"LUKE ISO");
  out.dual = inFull(18); out.dualSent = sent.splice(0);
  return out; });
console.log(JSON.stringify(r,null,1));
await p.evaluate(()=>{ go("inputs"); set("input.channel",[],15,"local"); }); await p.waitForTimeout(400);
console.log('chips:', (await p.$$eval('.chlist .ch', els => els.slice(0,22).map(e=>e.innerText.replace(/\s+/g,' ').trim()))).filter(t=>/RX|^A[12]/.test(t)).join(' | '));
await p.screenshot({path:'test/names-v2-inputs.png'});
await p.evaluate(()=>{ go("home"); openInputModal(14,null); }); await p.waitForTimeout(300);
console.log('modal title:', await p.textContent('#mtitle'));
console.log(errs); await b.close(); })();
