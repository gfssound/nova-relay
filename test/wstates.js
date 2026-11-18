const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh,tag] of [[1280,900,'desk'],[390,844,'phone']]) {
const p=await b.newPage({viewport:{width:w,height:hh},deviceScaleFactor:2,hasTouch:true}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(300);
await p.evaluate(()=>{localStorage.clear()}); await p.reload(); await p.waitForTimeout(400);
await p.evaluate(()=>{for(let i=0;i<16;i++)set("record.tracks",[i],1); go("home")}); await p.waitForTimeout(300);
console.log(tag, await p.evaluate(()=>[...document.querySelectorAll('.strip .wbadge:not(.none)')].map(b=>b.dataset.ws).join(',')), await p.evaluate(()=>document.querySelector('.wchip').textContent), await p.evaluate(()=>{const m=document.getElementById("view"); return [m.clientHeight,m.scrollHeight]}));
await p.screenshot({path:path.join(__dirname,`ws4-${tag}.png`)});
await p.click('.strip .wbadge[data-ws="none"] >> nth=0', {force:true}); await p.waitForTimeout(150);
await p.screenshot({path:path.join(__dirname,`ws4-pick-${tag}.png`)});
await p.click('.wpick .wpb[data-ws="standby"]'); await p.waitForTimeout(150);
console.log(tag,'after pick', await p.evaluate(()=>[JSON.stringify(Object.fromEntries(Object.entries(get("ui.wired")).map(([k,v])=>[k,v.state]))), document.querySelector('.toast')?.textContent, !!document.querySelector('.wpick')]));
if(tag==='phone'){ await p.evaluate(()=>showCrew('a')); await p.waitForTimeout(300); await p.screenshot({path:path.join(__dirname,'ws4-crew-a.png')});
 await p.evaluate(()=>showCrew('c')); await p.waitForTimeout(300); await p.click('.cmw >> nth=0'); await p.waitForTimeout(150); await p.screenshot({path:path.join(__dirname,'ws4-crew-c-pick.png')}); }
await p.close(); }
console.log(errs); await b.close(); })();
