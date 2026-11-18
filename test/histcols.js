const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh,tag] of [[1280,900,'desk'],[390,844,'phone']]) {
const p=await b.newPage({viewport:{width:w,height:hh},deviceScaleFactor:2}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>go("meta")); await p.waitForTimeout(200);
if(tag==='phone') await p.click('.phsecs .seg-b:has-text("History")');
console.log(tag, await p.evaluate(()=>[...document.querySelectorAll('table.hist tr')].slice(0,3).map(r=>[...r.children].filter(c=>c.offsetParent).map(c=>c.textContent).join(' | '))), await p.evaluate(()=>document.documentElement.scrollWidth));
await p.close(); }
console.log(errs); await b.close(); })();
