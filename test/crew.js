const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
for (const v of ['a','b','c']) { await p.evaluate(v=>showCrew(v),v); await p.waitForTimeout(400);
  console.log(v, await p.evaluate(()=>{const c=document.querySelector('.crew'); const bd=c.querySelector('.cbody'); return [bd.clientHeight, bd.scrollHeight, document.documentElement.scrollWidth]}));
  await p.screenshot({path:path.join(__dirname,`crew-${v}.png`)}); }
// tone + rec lock
await p.evaluate(()=>showCrew('a')); await p.click('.ctone'); console.log('tone', await p.evaluate(()=>get("tone.enable")));
await p.click('.ctone'); await p.evaluate(()=>sim.command("RECORD")); await p.waitForTimeout(300); await p.click('.ctone'); console.log('tone while rolling', await p.evaluate(()=>[get("tone.enable"), document.querySelector('.toast')?.textContent]));
await p.screenshot({path:path.join(__dirname,'crew-a-rec.png')});
await p.click('.wrow >> nth=2'); console.log('wired', await p.evaluate(()=>JSON.stringify(get("ui.wired"))));
console.log(errs); await b.close(); })();
