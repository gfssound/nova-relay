const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
for (const v of ["home","inputs","names","meta","timecode","routing"]) { await p.evaluate(v=>go(v),v); await p.waitForTimeout(200);
 console.log(v, await p.evaluate(()=>[[...document.querySelectorAll('.phsecs')].filter(e=>e.offsetParent).length, [...document.querySelectorAll('.panel,.tgroup,.tcol')].filter(e=>!e.offsetParent).length])); }
await p.evaluate(()=>go("home")); await p.screenshot({path:path.join(__dirname,'desk-after.png')});
console.log(errs); await b.close(); })();
