const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh] of [[1280,900],[1024,768]]) {
  const p=await b.newPage({viewport:{width:w,height:hh}}); p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
  for (const L of ['tiles','strip','tabs']) {
    await p.evaluate(L=>{ inLayout=L; go("inputs"); set("input.channel",[],1,"local"); },L); await p.waitForTimeout(500); await p.evaluate(()=>{ const d=document.querySelector('.panel'); if(d) d.scrollIntoView(); });
    if(L==='tiles'){ await p.click('.vtile:has-text("Trim")'); await p.waitForTimeout(200); }
    if(L==='tabs'){ await p.click('.itab[data-tab="filters"]'); await p.waitForTimeout(200); }
    await p.screenshot({path:path.join(__dirname,`lay-${L}-${w}.png`), fullPage:false});
  }
  // switch input in tabs to RX2
  await p.evaluate(()=>set("input.channel",[],16,"local")); await p.waitForTimeout(300);
  await p.close();
}
console.log('errors',errs); await b.close(); })();
