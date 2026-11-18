const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
await p.click('.tab[data-v="inputs"]'); await p.waitForTimeout(150);
const vals=await p.locator('.isect').nth(2).locator('output').allTextContents();
for(const v of ['home','arm','routing','names','timecode','meta','setup','all','log']){await p.click(`.tab[data-v="${v}"]`);await p.waitForTimeout(60);}
console.log(vals,errs);await b.close();})();
