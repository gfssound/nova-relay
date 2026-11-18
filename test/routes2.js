const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
for (const m of ['tracks','outputs','phones']) { await p.evaluate(m=>{ routeMode=m; go("routing"); },m); await p.waitForTimeout(300); }
await p.evaluate(()=>openOutputModal(5)); await p.click('text=Open in Routing'); await p.waitForTimeout(300);
console.log(await p.evaluate(()=>[routeMode, selOut, !!document.querySelector('.pick[aria-pressed="true"]')]));
await p.evaluate(()=>{ go("routing"); routeMode="tracks"; go("routing"); }); await p.click('.pick >> nth=4'); await p.waitForTimeout(200);
await p.click('.rgrid .ocell >> nth=0'); console.log(await p.evaluate(()=>[selTrack, get("trackmix.matrix",[P0(),4,0])]));
console.log(errs); await b.close(); })();
