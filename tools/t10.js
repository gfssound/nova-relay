const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:820}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(500);
await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});
await p.click('.tab[data-v="routing"]');await p.click('.routeseg >> text=Tracks');await p.waitForTimeout(300);
const r={rows:await p.locator('.mx tbody tr').count(), cells:await p.locator('.mx .cell').count()};
// row 5 (ANNA track), column input 9 => cell index (5-1)*22 + 8
const c=p.locator('.mx tbody tr').nth(4).locator('.cell').nth(8); await c.click(); r.val=await p.evaluate(()=>V["trackmix.matrix"][0][4][8]);
await p.screenshot({path:'build/rt-tracks2.png'});
console.log(r,errs);await b.close();})();
