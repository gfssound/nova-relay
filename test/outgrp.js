const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh] of [[1024,768],[390,844]]) { const p=await b.newPage({viewport:{width:w,height:hh}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
for (const o of [0,4]) { await p.evaluate(o=>{ routeMode="outputs"; selOut=o; go("routing"); },o); await p.waitForTimeout(250);
  console.log(w, o, await p.evaluate(()=>{const m=document.getElementById('view');return [m.scrollHeight,m.clientHeight, [...m.querySelectorAll('.rgroup h4')].map(e=>e.textContent).join('|')]}));
  if(w==1024) await p.screenshot({path:path.join(__dirname,`og-${o}.png`)}); }
if(w==1024){ await p.evaluate(()=>{ go("home"); openOutputModal(4); }); await p.waitForTimeout(250); await p.screenshot({path:path.join(__dirname,'og-modal.png')});
  await p.click('.modal .ocell >> nth=0'); console.log('tap', await p.evaluate(()=>get("outputmix.matrix",[0,4,SRC_TRACK]))); }
await p.close(); }
console.log(errs); await b.close(); })();
