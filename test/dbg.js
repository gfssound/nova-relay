const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>errs.push(m.text()));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{ inLayout='strip'; go("inputs"); set("input.channel",[],1,"local"); }); await p.waitForTimeout(800);
console.log(await p.evaluate(()=>{ const f=document.querySelector('.vfill'); return [f.style.height, f.style.background, frameHooks.filter(x=>x.idetail).length, frameHooks.length, sim.inDb[0]]; }));
console.log(errs); await b.close(); })();
