const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
for (const L of ['tiles','sections']) { await p.evaluate(L=>{ setupLayout=L; go("setup"); },L); await p.waitForTimeout(300);
  if(L==='tiles') { await p.click('.vtile:has-text("Pre-roll")'); await p.waitForTimeout(200); }
  if(L==='sections') { await p.click('.secbtn:has-text("Meters")'); await p.waitForTimeout(200); }
  await p.screenshot({path:path.join(__dirname,`setup-${L}.png`)}); }
console.log(errs); await b.close(); })();
