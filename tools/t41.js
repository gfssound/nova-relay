const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const html=require('fs').readFileSync('build/cart-remote.html','utf8');const r={};
for(const [w,hh] of [[1280,1400],[390,844]]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
await p.click('.tab[data-v="inputs"]'); await p.locator('.ch').nth(8).click(); await p.waitForTimeout(200);
r[w]={panels:await p.locator('#view > .stack > .stack > .panel, #view .panel').count(), sects:await p.locator('.isect h4').allTextContents(), overflow:await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)};
if(w===1280){ await p.locator('.isect').nth(1).locator("button.chip").nth(1).click(); r.delay=await p.evaluate(()=>V["input.delay.enable"][8]);
 await p.locator('.ch').nth(0).click(); await p.waitForTimeout(100); r.switched=await p.locator('#view .panel h3').first().textContent();
 await p.screenshot({path:'build/inputbox.png',fullPage:true}); }}
console.log(JSON.stringify(r),errs);await b.close();})();
