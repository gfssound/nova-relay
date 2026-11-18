const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{ go("inputs"); set("input.channel",[],1,"local"); set("input.power48V",[0],1,"remote"); set("input.level",[0],0,"remote"); }); await p.waitForTimeout(300);
await p.click('.vtile:has-text("Level")'); await p.waitForTimeout(200);
console.log(await p.evaluate(()=>[get("input.level",[0]), get("input.power48V",[0]), document.querySelector('.p48warn')?.textContent]), errs); await b.close(); })();
