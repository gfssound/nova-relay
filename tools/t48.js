const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
const r={}; const labels=async()=> (await p.locator('.isect').first().locator('.lbl').allTextContents()).filter(x=>/LEVEL|48/i.test(x));
await p.click('.tab[data-v="inputs"]');
for(const [k,n] of [['rx1',0],['analog1',8],['return1',12],['aes1',14]]){ await p.locator('.ch').nth(n).click(); await p.waitForTimeout(80); r[k]=await labels(); }
await p.click('.tab[data-v="home"]'); await p.waitForTimeout(150);
await p.locator('button.scrib',{hasText:'ANNA'}).click(); r.popRX=(await p.locator('.msettings .lbl').allTextContents()).filter(x=>/LEVEL|48/i.test(x)); await p.keyboard.press('Escape');
await p.locator('button.scrib',{hasText:'BOOM'}).click(); r.popAnalog=(await p.locator('.msettings .lbl').allTextContents()).filter(x=>/LEVEL|48/i.test(x));
console.log(JSON.stringify(r),errs);await b.close();})();
