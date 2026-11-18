const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:1024,height:768}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
console.log(await p.textContent('#stBits')); await p.evaluate(()=>go("setup")); await p.waitForTimeout(200);
await p.click('.vtile:has-text("Bit depth")'); console.log(await p.textContent('#stBits'));
await p.locator('#status').screenshot({path:path.join(__dirname,'bits-hdr.png')}); await p.screenshot({path:path.join(__dirname,'bits-setup.png')});
await p.click('.vtile:has-text("Bit depth")'); console.log(await p.textContent('#stBits'), errs); await b.close(); })();
