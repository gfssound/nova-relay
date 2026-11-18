const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
const p=await b.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(300);
await p.evaluate(()=>{localStorage.clear()}); await p.reload(); await p.waitForTimeout(400);
await p.evaluate(()=>{for(let i=0;i<16;i++)set("record.tracks",[i],1); go("home")}); await p.waitForTimeout(200);
console.log('no plan chip', await p.evaluate(()=>document.querySelector('.wchip').textContent));
await p.click('.wchip'); await p.waitForTimeout(200);
await p.click('.wplan button:has-text("Load sample")'); await p.waitForTimeout(250);
console.log('scene', await p.evaluate(()=>[workScene(), document.querySelector('.wscene')?.innerText, [...document.querySelectorAll('.wlist > .ctalent > *')].map(e=>e.querySelector('b').textContent+' | '+e.querySelector('small').textContent), document.querySelector('.wnext')?.innerText, document.querySelector('.wchip').textContent]));
await p.screenshot({path:path.join(__dirname,'plan-modal.png')});
await p.evaluate(()=>{ set("scene.next",[],"43","ui"); }); await p.waitForTimeout(250);
console.log('43', await p.evaluate(()=>[document.querySelector('.wscene')?.innerText, [...document.querySelectorAll('.wlist > .ctalent > *')].map(e=>e.querySelector('b').textContent+' | '+e.querySelector('small').textContent)]));
await p.screenshot({path:path.join(__dirname,'plan-modal-43.png')});
// track naming
await p.evaluate(()=>{ set("ui.lavnames",[],1,"ui"); }); await p.waitForTimeout(200);
console.log('names', await p.evaluate(()=>[4,5,6,7,10].map(t=>get("track.name",[t]))));
await p.evaluate(()=>{ set("scene.next",[],"99","ui"); }); await p.waitForTimeout(200);
console.log('missing', await p.evaluate(()=>[document.querySelector('.wscene')?.innerText, document.querySelector('.wchip').textContent]));
await p.close();
const q=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2}); q.on('pageerror',e=>errs.push(e.message));
await q.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await q.waitForTimeout(300);
await q.evaluate(()=>{localStorage.clear()}); await q.reload(); await q.waitForTimeout(400);
await q.evaluate(()=>{ set("ui.lavplan",[],{...SAMPLE_PLAN, received:Date.now()},"ui"); showCrew("a"); }); await q.waitForTimeout(300);
console.log('crew a', await q.evaluate(()=>{const bd=document.querySelector('.crew .cbody'); return [bd.clientHeight, bd.scrollHeight]}));
await q.screenshot({path:path.join(__dirname,'plan-crew-a.png')});
for (const v of ['b','c']) { await q.evaluate(v=>showCrew(v),v); await q.waitForTimeout(300); console.log('crew',v, await q.evaluate(()=>{const bd=document.querySelector('.crew .cbody'); return [bd.clientHeight, bd.scrollHeight]})); await q.screenshot({path:path.join(__dirname,`plan-crew-${v}.png`)}); }
console.log(errs); await b.close(); })();
