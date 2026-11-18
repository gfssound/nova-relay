const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
const p=await b.newPage({viewport:{width:1024,height:768}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
for (const ch of [1,15]) { await p.evaluate(c=>{ go("inputs"); set("input.channel",[],c,"local"); },ch); await p.waitForTimeout(300);
  console.log(ch, await p.evaluate(()=>[...document.querySelectorAll('.vtile.future')].map(e=>e.textContent)), await p.evaluate(()=>{const m=document.getElementById('view');return [m.scrollHeight,m.clientHeight]}));
  await p.screenshot({path:path.join(__dirname,`znet-${ch}.png`)}); }
await p.click('.vtile.future >> nth=0',{force:true}); await p.waitForTimeout(200); console.log(await p.evaluate(()=>document.querySelector('.toast')?.textContent));
console.log(errs); await b.close(); })();
