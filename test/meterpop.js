const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:1024,height:768}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>go("home")); await p.waitForTimeout(300);
for (const n of [0,2,5,8]) { await p.click(`.strip button.scrib >> nth=${n}`); await p.waitForTimeout(300); console.log(n, await p.evaluate(()=>document.querySelector('#mtitle')?.textContent||'no pop-up')); await p.evaluate(()=>closeModal()); }
console.log(errs); await b.close(); })();
