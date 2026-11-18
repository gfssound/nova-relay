const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(300);
await p.evaluate(()=>{localStorage.clear()}); await p.reload(); await p.waitForTimeout(400);
for (const v of ['a','b','c']) { await p.evaluate(v=>showCrew(v),v); await p.waitForTimeout(300);
  await p.click('.crew .wbtns >> nth=2 >> .wpb[data-ws="wired"]'); await p.waitForTimeout(100);
  console.log(v, await p.evaluate(()=>{const bd=document.querySelector('.crew .cbody'); return [bd.clientHeight, bd.scrollHeight, wState(16)]}));
  await p.evaluate(()=>setWired(16,"none",true));
  await p.screenshot({path:path.join(__dirname,`crew4-${v}.png`)}); }
console.log(errs); await b.close(); })();
