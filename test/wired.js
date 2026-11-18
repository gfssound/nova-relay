const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh,tag] of [[1280,900,'desk'],[820,1180,'tab'],[390,844,'phone']]) {
const p=await b.newPage({viewport:{width:w,height:hh},deviceScaleFactor:tag==='phone'?2:1,hasTouch:true}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(300);
await p.evaluate(()=>{localStorage.clear()}); await p.reload(); await p.waitForTimeout(400);
await p.evaluate(()=>{for(let i=0;i<16;i++)set("record.tracks",[i],1); go("home")}); await p.waitForTimeout(400);
const info=await p.evaluate(()=>{const m=document.getElementById("view"); return [m.clientHeight, m.scrollHeight, document.documentElement.scrollWidth, document.querySelector('.wchip').textContent, document.querySelectorAll('.strip .wbadge:not(.none)').length]});
console.log(tag, info.join(' | '));
await p.screenshot({path:path.join(__dirname,`wired-${tag}.png`)});
if(tag==='desk'){
 // LED alignment: top of scale canvas vs top of strip canvases
 console.log('led tops', await p.evaluate(()=>[...new Set([...document.querySelectorAll('.strip .led')].map(c=>Math.round(c.getBoundingClientRect().top)))]));
 await p.click('.strip .wbadge:not(.on):not(.none) >> nth=0'); await p.waitForTimeout(150);
 console.log('after tap', await p.evaluate(()=>[document.querySelector('.wchip').textContent, document.querySelector('.toast')?.textContent]));
 await p.click('.wchip'); await p.waitForTimeout(300); await p.screenshot({path:path.join(__dirname,'wired-modal.png')});
 await p.click('.wrow >> nth=4'); await p.waitForTimeout(150); console.log('modal tap', await p.evaluate(()=>JSON.stringify(Object.keys(get("ui.wired")))));
}
if(tag==='phone'){ await p.click('.wchip'); await p.waitForTimeout(300); await p.screenshot({path:path.join(__dirname,'wired-modal-phone.png')}); }
await p.close(); }
console.log(errs); await b.close(); })();
