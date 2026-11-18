const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:820}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
const r={};
await p.click('.tab[data-v="routing"]');await p.click('.routeseg >> text=Tracks');await p.waitForTimeout(200);
r.trackRows=await p.locator('.mx tbody tr').count();
await p.locator('.mx tbody tr').nth(15).locator('.cell').nth(0).click(); r.t16=await p.evaluate(()=>V["trackmix.matrix"][0][15][0]);
await p.screenshot({path:'build/rt16.png'});
await p.click('.routeseg >> text=Outputs');await p.waitForTimeout(200);
r.outRows=await p.locator('.mx tbody tr th[scope=row]').count();
await p.click('.tab[data-v="arm"]'); r.arms=await p.locator('.armbtn').count();
await p.locator('.armbtn').nth(15).click(); await p.locator('.armbtn').nth(16).click();
await p.click('.tab[data-v="home"]'); await p.waitForTimeout(300);
r.strips=await p.locator('.strip:not(.scale)').count(); r.names=await p.locator('.scrib').allTextContents();
for(const v of ['inputs','phones','timecode','meta','setup','all','log']){await p.click(`.tab[data-v="${v}"]`);await p.waitForTimeout(80);}
console.log(JSON.stringify(r),errs);await b.close();})();
