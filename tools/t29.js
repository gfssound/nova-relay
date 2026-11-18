const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
await p.click('.tab[data-v="routing"]'); await p.locator('.routeseg button',{hasText:'Presets'}).click();
await p.locator('button',{hasText:'New blank preset'}).click();
const t1=await p.locator('.toast').textContent(); await p.waitForTimeout(2600); const vis=await p.locator('.toast').isVisible();
for(const v of ['home','arm','inputs','names','phones','timecode','meta','setup','all','log']){await p.click(`.tab[data-v="${v}"]`);await p.waitForTimeout(60);}
console.log(JSON.stringify({t1,visibleAfter:vis}),errs);await b.close();})();
