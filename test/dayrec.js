const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
if(!process.env.DARK){ await p.click('#dayBtn'); await p.waitForTimeout(200);}
await p.locator('.transport').screenshot({path:path.join(__dirname,'dayrec-idle.png')});
await p.evaluate(()=>{ const r=document.getElementById('bRec'); r.setAttribute('aria-pressed','true'); r.style.animation='none'; });
await p.locator('.transport').screenshot({path:path.join(__dirname,'dayrec-on.png')});
if(!process.env.DARK) await p.click('#dayBtn'); console.log(errs); await b.close(); })();
