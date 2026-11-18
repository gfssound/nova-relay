const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:820}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
const r={};
await p.click('.tab[data-v="arm"]');await p.waitForTimeout(200);
r.btns=await p.locator('.armbtn').count(); r.quick=await p.locator('.armall').allTextContents();
await p.click('.armall >> text=Arm all'); await p.waitForTimeout(100); r.count=await p.locator('.panel .mono').first().textContent();
await p.screenshot({path:'build/arm16.png'});
await p.click('.tab[data-v="home"]');await p.waitForTimeout(300); r.strips=await p.locator('.strip:not(.scale)').count();
await p.click('#bRec');await p.waitForTimeout(200);await p.click('.tab[data-v="arm"]');await p.locator('.armbtn').nth(3).click(); r.locked=await p.evaluate(()=>V["record.tracks"][3]);
await p.click('#bStop');
for(const v of ['inputs','routing','names','phones','timecode','meta','setup','all','log']){await p.click(`.tab[data-v="${v}"]`);await p.waitForTimeout(80);}
await p.click('.tab[data-v="phones"]'); r.hpTrackCols=await p.locator('.mx').first().locator('thead th').count()-1;
console.log(JSON.stringify(r),errs);await b.close();})();
