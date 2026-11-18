const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{ routeMode="phones"; hpLayout="current"; go("routing"); }); await p.waitForTimeout(300);
console.log(await p.evaluate(()=>[...document.querySelectorAll('#f-hp-select option')].map(o=>o.textContent).join(' | ')), errs); await b.close(); })();
