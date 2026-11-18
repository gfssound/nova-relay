const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:1024,height:768}}); p.on('pageerror',e=>errs.push(e.message));
for (const f of ['../build/cart-remote.html']) {
await p.goto('file://'+path.join(__dirname,f)); await p.waitForTimeout(400);
await p.evaluate(()=>{ set("home.meters.source",[],1,"local"); go("home"); }); await p.waitForTimeout(300);
await p.evaluate(()=>openOutputModal(0)); await p.fill('#mo-name-0','cam a'); await p.press('#mo-name-0','Enter'); await p.waitForTimeout(100);
console.log('meters', await p.evaluate(()=>document.querySelector('.strips').textContent.includes('CAM A')));
await p.evaluate(()=>{ closeModal(); routeMode="outputs"; selOut=0; go("routing"); openOutputModal(0); }); await p.fill('#mo-name-0','cam b'); await p.press('#mo-name-0','Enter'); await p.waitForTimeout(100);
await p.evaluate(()=>closeModal());
console.log('routing', await p.evaluate(()=>[document.querySelector('#view h3').textContent, document.querySelector('#view').textContent.includes('CAM B')]));
await p.evaluate(()=>{ set("ui.outnames",[],["","","","","","","",""],"ui"); set("home.meters.source",[],0,"local"); }); }
console.log(errs); await b.close(); })();
