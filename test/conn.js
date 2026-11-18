const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>go("setup")); await p.click('.secbtn:has-text("Connection")'); await p.waitForTimeout(300);
await p.screenshot({path:path.join(__dirname,'conn.png')}); console.log(errs, await p.evaluate(()=>[...document.querySelectorAll('nav a, .tabs button, [role=tab]')].map(e=>e.textContent).join('|'))); await b.close(); })();
