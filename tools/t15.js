const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:820}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
await p.click('.tab[data-v="routing"]');await p.click('.routeseg >> text=Outputs');await p.waitForTimeout(200);
const r={panels:await p.locator('#view .panel').count()};
const c=p.locator('.mx tbody tr').nth(6).locator('.cell').nth(4); const st=[];
for(let k=0;k<3;k++){await c.click(); st.push([await c.textContent(), await p.evaluate(()=>V["outputmix.matrix"][0][6][4])]);}
r.cycle=st;
await p.locator('.mx tbody tr').nth(0).locator('.cell').nth(2).click(); // add 2nd track to OUT1
r.out1=await p.evaluate(()=>V["outputmix.matrix"][0][0].slice(0,4));
await p.click('.tab[data-v="home"]'); await p.click('text=OUT'); await p.waitForTimeout(500); r.outStrips=await p.locator('.strip:not(.scale)').count();
await p.click('.tab[data-v="routing"]'); await p.waitForTimeout(200);
await p.locator('.mx tbody tr').nth(1).locator('.cell').nth(1).click();
await p.screenshot({path:'build/outmx2.png'});
console.log(JSON.stringify(r),errs);await b.close();})();
