const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{ routeMode="phones"; hpLayout="preset"; go("routing"); }); await p.waitForTimeout(400);
await p.click('.pick >> nth=2'); await p.waitForTimeout(300);
await p.screenshot({path:path.join(__dirname,'hp-preset.png')});
console.log(await p.evaluate(()=>[selHp, get("hpmix.preset")])); await p.click('text=Listen to this preset'); await p.waitForTimeout(300);
console.log(await p.evaluate(()=>[selHp, get("hpmix.preset")]), errs); await b.close(); })();
