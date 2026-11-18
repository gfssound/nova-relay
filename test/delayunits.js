const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh,tag] of [[1280,900,'desk'],[390,844,'phone']]) {
const p=await b.newPage({viewport:{width:w,height:hh},deviceScaleFactor:2,hasTouch:true}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{localStorage.removeItem("cart-remote-delayunit"); go("inputs")}); await p.waitForTimeout(300);
if(tag==='phone') await p.click('#view .phsecs .seg-b >> nth=1');
await p.click('#view .vtile:has-text("Delay time")'); await p.waitForTimeout(200);
const plus=p.locator('.editbar .bsb >> nth=1');
const rd=()=>p.evaluate(()=>[document.querySelector('.editbar .bsv').textContent, document.querySelector('.editbar .bssub').textContent, get("input.delay.time",[0]), document.querySelector('#view .vtile[data-key^="input.delay.time"] .tv').textContent]);
await plus.click(); console.log(tag,'ms +', await rd());
await p.click('.editbar .dunits button:has-text("Frames")'); console.log(tag,'fr', await rd());
await plus.click(); console.log(tag,'fr +', await rd());
await p.click('.editbar .dunits button:has-text("Feet")'); await plus.click(); await plus.click(); console.log(tag,'ft ++', await rd());
await p.click('.editbar .dunits button:has-text("Meters")'); await plus.click(); console.log(tag,'m +', await rd());
await p.screenshot({path:path.join(__dirname,`delay-${tag}.png`)});
await p.close(); }
console.log(errs); await b.close(); })();
