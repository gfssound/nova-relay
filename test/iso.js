const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:1024,height:768}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400); await p.evaluate(()=>go("setup")); await p.waitForTimeout(200);
const t=p.locator('.vtile:has-text("ISO Attenuation")'); const out=[]; for(let i=0;i<6;i++){ out.push(await t.locator('.tv').textContent()); await t.click(); }
console.log(out, await p.evaluate(()=>document.querySelector('.editbar')?.hidden)); await p.screenshot({path:path.join(__dirname,'iso.png')});
await p.click('button:has-text("METERS")'); await p.waitForTimeout(150); console.log(await p.evaluate(()=>document.querySelector('#view').textContent.includes('NeverClip')), errs); await b.close(); })();
