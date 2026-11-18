const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:1024,height:768}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400); await p.evaluate(()=>go("setup")); await p.waitForTimeout(200);
const out=[]; for(let i=0;i<5;i++){ out.push(await p.textContent('#stRate')); await p.click('.vtile:has-text("Sample rate")'); }
console.log(out, await p.evaluate(()=>document.querySelector('.editbar')?.hidden), errs); await b.close(); })();
