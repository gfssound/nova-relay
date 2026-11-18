const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh] of [[1024,768],[390,844]]) { const p=await b.newPage({viewport:{width:w,height:hh}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{ go("inputs"); set("input.channel",[],1,"local"); }); await p.waitForTimeout(300);
await p.click('.vtile:has-text("Trim")'); await p.waitForTimeout(200);
const r=await p.evaluate(()=>{const e=document.querySelector('.ebdone').getBoundingClientRect(); return [Math.round(e.width),Math.round(e.height)]});
console.log(w, r); await p.locator('.editbar').screenshot({path:path.join(__dirname,`done-${w}.png`)});
await p.click('.ebdone'); console.log('closed', await p.evaluate(()=>document.querySelector('.editbar').hidden)); await p.close(); }
console.log(errs); await b.close(); })();
