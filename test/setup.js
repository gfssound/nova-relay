const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}});
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>go("setup")); await p.waitForTimeout(300); await p.screenshot({path:path.join(__dirname,'setup-now.png'), fullPage:true});
console.log(await p.evaluate(()=>document.querySelector('main, #view, .view')?.scrollHeight)); await b.close(); })();
