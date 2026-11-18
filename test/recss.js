const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}});
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
console.log(await p.evaluate(()=>{ const r=document.getElementById('bRec'); r.setAttribute('aria-pressed','true'); const c=getComputedStyle(r); return [c.boxShadow,c.animationName,c.borderColor,c.backgroundColor]; }));
await b.close(); })();
