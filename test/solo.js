const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:1024,height:768}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{ go("home"); set("ui.soloins",[],[15],"remote"); }); await p.waitForTimeout(300);
console.log(await p.evaluate(()=>[...document.querySelectorAll('.hpbadge.solo:not([hidden])')].map(e=>e.closest('.strip').querySelector('.scrib').textContent)));
await p.screenshot({path:path.join(__dirname,'solo.png')}); console.log(errs); await b.close(); })();
