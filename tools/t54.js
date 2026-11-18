const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
const meters=await p.locator('#view h3').allTextContents();
await p.locator('.routeseg button',{hasText:'Outputs'}).click(); await p.waitForTimeout(100); const outs=await p.locator('#view h3').allTextContents();
await p.click('.tab[data-v="meta"]'); await p.waitForTimeout(100); const meta=await p.locator('#view h3').allTextContents();
console.log(JSON.stringify({meters,outs,meta}),errs);await b.close();})();
