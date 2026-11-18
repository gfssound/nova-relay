const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const html=require('fs').readFileSync('build/cart-remote.html','utf8');const r={};
for(const [w,hh,f] of [[1280,900,'tr2'],[390,844,'tr2p']]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
r[w]=await p.locator('.slate button .lbl').allTextContents();
if(w===1280){ await p.click('#goTake'); r.noteField=await p.locator('.modal input[aria-label="Next note"]').count(); await p.keyboard.press('Escape'); }
r['o'+w]=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
await p.screenshot({path:`build/${f}.png`,clip:{x:0,y:0,width:w,height:w===1280?160:330}});}
console.log(JSON.stringify(r),errs);await b.close();})();
