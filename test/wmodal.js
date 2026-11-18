const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh,tag] of [[1280,900,'desk'],[390,844,'phone']]) {
const p=await b.newPage({viewport:{width:w,height:hh},deviceScaleFactor:2}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(300);
await p.evaluate(()=>{localStorage.clear()}); await p.reload(); await p.waitForTimeout(400);
await p.evaluate(()=>{for(let i=0;i<16;i++)set("record.tracks",[i],1); go("home")}); await p.waitForTimeout(200);
await p.click('.wchip'); await p.waitForTimeout(250);
await p.click('.wrow4 >> nth=2 >> .wpb[data-ws="wired"]'); await p.waitForTimeout(150);
await p.click('.wrow4 >> nth=5 >> .wpb[data-ws="standby"]'); await p.waitForTimeout(150);
console.log(tag, await p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(get("ui.wired")).map(([k,v])=>[k,v.state])))), await p.evaluate(()=>document.documentElement.scrollWidth), await p.evaluate(()=>{const l=document.querySelector('.wlist'); return [l.clientHeight,l.scrollHeight]}));
await p.screenshot({path:path.join(__dirname,`wmodal-${tag}.png`)});
await p.close(); }
console.log(errs); await b.close(); })();
