const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>go("inputs")); await p.waitForTimeout(300);
const read=()=>p.evaluate(()=>[...document.querySelectorAll('#view .vtile')].filter(t=>/Link group|Threshold|Ratio|Attack|Decay|Gain/.test(t.querySelector('.tl').textContent)).map(t=>t.querySelector('.tl').textContent+'='+t.querySelector('.tv').textContent).join(' | '));
for (let k=0;k<5;k++){ console.log(await read()); await p.click('#view .vtile:has-text("Link group")'); await p.waitForTimeout(150); }
console.log(errs); await b.close(); })();
