const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const html=require('fs').readFileSync('build/cart-remote.html','utf8');const r={};
for(const [w,hh] of [[1280,900],[390,844]]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
if(w===1280){
 r.sizes=await p.locator('.slate button, .tbtns button').evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)));
 r.stopped=[await p.textContent('#slSceneLbl'),await p.textContent('#slScene'),await p.textContent('#slTakeLbl'),await p.textContent('#slTake')];
 await p.screenshot({path:'build/tr3-stopped.png',clip:{x:0,y:46,width:1280,height:112}});
 await p.click('#bRec'); await p.waitForTimeout(400);
 r.rec=[await p.textContent('#slSceneLbl'),await p.textContent('#slScene'),await p.textContent('#slTakeLbl'),await p.textContent('#slTake')];
 await p.screenshot({path:'build/tr3-rec.png',clip:{x:0,y:46,width:1280,height:112}});
 await p.click('#bStop'); await p.waitForTimeout(200);
 r.afterStop=[await p.textContent('#slScene'),await p.textContent('#slTake')]; r.hist=await p.evaluate(()=>V["metadata.history"][0].scene+'/'+V["metadata.history"][0].take);
 // new scene via pop-up, then REC -> 1
 await p.click('#goScene'); await p.locator('.modal button',{hasText:'Next Scene #'}).click(); await p.locator('.modal button',{hasText:'Done'}).click();
 r.preview=[await p.textContent('#slScene'),await p.textContent('#slTake')];
 await p.click('#bRec'); await p.waitForTimeout(200); r.rec2=[await p.textContent('#slScene'),await p.textContent('#slTake')]; await p.click('#bStop'); await p.waitForTimeout(200);
 r.next2=[await p.textContent('#slScene'),await p.textContent('#slTake')];
} else { r.phone=await p.locator('.slate button, .tbtns button').evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().height))); r.overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth); await p.screenshot({path:'build/tr3-phone.png',clip:{x:0,y:0,width:390,height:360}}); }}
console.log(JSON.stringify(r),errs);await b.close();})();
