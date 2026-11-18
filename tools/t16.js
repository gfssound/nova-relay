const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:820}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
await p.locator('.seg-b', {hasText:/^OUT$/}).click(); await p.waitForTimeout(600);
const r={src:await p.evaluate(()=>V["home.meters.source"]), strips:await p.locator('.strip:not(.scale)').count(), names:await p.locator('.scrib').allTextContents()};
await p.screenshot({path:'build/outmeters.png'});
console.log(JSON.stringify(r),errs);await b.close();})();
