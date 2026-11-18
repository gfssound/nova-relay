const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh,tag] of [[1280,900,'desk'],[390,844,'phone']]) {
const p=await b.newPage({viewport:{width:w,height:hh},deviceScaleFactor:2}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../sidespro/sides-pro.html')); await p.waitForTimeout(500);
await p.evaluate(()=>localStorage.clear());
await p.click('#v-crew'); await p.waitForTimeout(150);
await p.selectOption('#c-scene','1'); await p.waitForTimeout(100);
await p.click('.crow >> nth=0 >> .sb[data-s="wired"]'); await p.click('.crow >> nth=1 >> .sb[data-s="standby"]'); await p.waitForTimeout(100);
console.log(tag, await p.evaluate(()=>[document.querySelector('#c-count').textContent, [...document.querySelectorAll('.crow')].map(r=>r.querySelector('b').textContent+':'+(r.dataset.s||'nolav')).join(' '), document.querySelector('#c-upnext').textContent, document.documentElement.scrollWidth]));
await p.click('#c-next'); await p.waitForTimeout(100);
console.log(tag,'43', await p.evaluate(()=>[...document.querySelectorAll('.crow')].map(r=>r.querySelector('b').textContent+':'+(r.dataset.s||'nolav')).join(' ')));
await p.click('#c-prev');
await p.screenshot({path:path.join(__dirname,`sp-crew-${tag}.png`)});
await p.close(); }
console.log(errs); await b.close(); })();
