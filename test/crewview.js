const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:1440,height:1000}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.click('#crewBtn'); await p.waitForTimeout(1500); await p.screenshot({path:path.join(__dirname,'crewview.png')});
await p.click('.phonebar .seg-b >> nth=1'); await p.waitForTimeout(400);
const f=p.frames().find(fr=>fr!==p.mainFrame()); console.log(await f.evaluate(()=>[crewVariant, document.querySelector('.cnext').textContent, !!document.getElementById('crewBtn')]));
console.log(errs); await b.close(); })();
