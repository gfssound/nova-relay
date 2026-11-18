const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh,tag] of [[1024,768,'ipad'],[1280,800,'desk'],[390,844,'phone']]) {
  const p=await b.newPage({viewport:{width:w,height:hh}}); p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(500);
  await p.evaluate(()=>{ go("home"); }); await p.waitForTimeout(600);
  await p.screenshot({path:path.join(__dirname,`desk-${tag}.png`)});
  if(tag==='ipad'){ await p.click('#dayBtn'); await p.waitForTimeout(500); await p.screenshot({path:path.join(__dirname,`desk-${tag}-day.png`)});
    await p.evaluate(()=>go("inputs")); await p.waitForTimeout(400); await p.screenshot({path:path.join(__dirname,`desk-${tag}-day-inputs.png`)}); await p.click('#dayBtn'); }
  await p.close(); }
console.log(errs); await b.close(); })();
