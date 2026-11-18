const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
await p.click('.tab[data-v="routing"]'); await p.locator('.routeseg button',{hasText:'Headphones'}).click(); await p.waitForTimeout(200);
const g=p.locator('.hppanel .orgrid').first().locator('.ocell');
await g.nth(2).click();                       // LR
await g.nth(3).click(); await g.nth(3).click(); // L
await g.nth(4).click(); await g.nth(4).click(); await g.nth(4).click(); // R
await g.nth(5).click(); await g.nth(5).click({button:'right'}); // /LR
const cls=await g.evaluateAll(els=>els.slice(0,6).map(e=>e.className+' | '+getComputedStyle(e).backgroundColor));
await p.screenshot({path:'build/hp3.png',clip:{x:0,y:260,width:1280,height:420}});
console.log(cls.join('\n'),errs);await b.close();})();
