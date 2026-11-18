const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
const r={tabs:await p.locator('.tab').allTextContents()};
await p.click('.tab[data-v="routing"]'); r.sub=await p.locator('.routeseg button').allTextContents();
await p.locator('.routeseg button',{hasText:'Headphones'}).click(); await p.waitForTimeout(200);
r.hpPresets=await p.locator('.presets .chip').count(); r.mx=await p.locator('.mx').count();
await p.locator('.presets .chip').nth(2).click(); await p.waitForTimeout(100); r.hp=await p.evaluate(()=>V["hpmix.preset"]);
await p.locator('.mx').first().locator('.cell').nth(5).click(); r.cell=await p.evaluate(()=>V["hpmix.tracks"][2][5]);
await p.screenshot({path:'build/hp-routing.png'});
for(const m of ['Tracks','Outputs','Presets','Headphones']){await p.locator('.routeseg button',{hasText:m}).click();await p.waitForTimeout(80);}
console.log(JSON.stringify(r),errs);await b.close();})();
