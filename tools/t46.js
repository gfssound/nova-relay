const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage();p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
await p.click('.tab[data-v="meta"]'); await p.waitForTimeout(150);
console.log(await p.locator('#view .panel').first().locator('.lbl').allTextContents(), errs);await b.close();})();
