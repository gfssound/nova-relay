const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.click('#phoneBtn'); await p.waitForTimeout(1500); await p.screenshot({path:path.join(__dirname,'phoneview.png')});
const f=p.frames().find(fr=>fr!==p.mainFrame()); console.log('frame', !!f, f && await f.evaluate(()=>[innerWidth, !!document.getElementById('phoneBtn'), document.documentElement.scrollWidth]));
console.log(errs); await b.close(); })();
