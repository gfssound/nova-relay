const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{ setupSec="meters"; go("setup"); }); await p.waitForTimeout(300);
await p.click('.vtile:has-text("Peak hold")'); await p.waitForTimeout(200);
await p.screenshot({path:path.join(__dirname,'setup-combo.png')});
await p.click('.secbtn:has-text("Recording")'); await p.waitForTimeout(200); await p.click('.vtile:has-text("Tone") >> nth=0'); 
console.log(await p.evaluate(()=>[get("tone.enable"), setupEdit])); await p.screenshot({path:path.join(__dirname,'setup-combo2.png')});
console.log(errs); await b.close(); })();
