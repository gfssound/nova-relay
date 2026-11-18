const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch(); const errs=[];
 const html=require('fs').readFileSync('build/cart-remote.html','utf8');
 const doc='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+html+'</body></html>';
 const p=await b.newPage({viewport:{width:1280,height:820}});
 p.on('pageerror',e=>errs.push(e.message));
 await p.setContent(doc,{waitUntil:'load'}); await p.waitForTimeout(800);
 await p.click('#bRec'); await p.waitForTimeout(1200);
 await p.screenshot({path:'build/console.png'});
 await p.click('#layoutSeg [data-l="touch"]'); await p.waitForTimeout(1200);
 await p.screenshot({path:'build/touch.png'});
 await p.click('.tab[data-v="inputs"]'); await p.waitForTimeout(400);
 await p.screenshot({path:'build/touch-inputs.png'});
 const q=await b.newPage({viewport:{width:400,height:860}}); q.on('pageerror',e=>errs.push('phone '+e.message));
 await q.setContent(doc,{waitUntil:'load'}); await q.waitForTimeout(800);
 console.log('phone overflow', await q.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
 console.log('ERRORS',JSON.stringify(errs)); await b.close();
})();
