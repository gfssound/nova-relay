const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const html=require('fs').readFileSync('build/cart-remote.html','utf8');const r={};
for(const [w,hh] of [[1280,900],[390,844]]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
await p.click('.tab[data-v="routing"]'); await p.locator('.routeseg button',{hasText:'Headphones'}).click(); await p.waitForTimeout(300);
if(w===1280){
 r.opts=await p.locator('#f-hp-select option').count(); r.cur=await p.inputValue('#f-hp-select'); r.tracks=await p.locator('.hppanel .orgrid').first().locator('.ocell').count(); r.extras=await p.locator('.hppanel .orgrid').nth(1).locator('.ocell').count();
 await p.selectOption('#f-hp-select','2'); await p.waitForTimeout(150); r.preset=await p.evaluate(()=>V["hpmix.preset"]); r.name=await p.inputValue('.hppanel input.txt');
 const c=p.locator('.hppanel .orgrid').first().locator('.ocell').nth(4); const seq=[]; for(let k=0;k<4;k++){await c.click(); seq.push(await p.evaluate(()=>V["hpmix.tracks"][1][4]));} r.cycle=seq;
 await c.click(); await c.click({button:'right'}); r.flip=await p.evaluate(()=>V["hpmix.tracks"][1][4]);
 await p.selectOption('#f-hp-select','bus2'); await p.waitForTimeout(150); r.busHead=await p.locator('.hpbig').textContent();
 await p.locator('.hppanel .orgrid').nth(1).locator('.ocell').nth(3).click(); r.busOut=await p.evaluate(()=>V["hpmix2.outputs"][1]);
 await p.selectOption('#f-hp-select','1'); await p.waitForTimeout(800); r.back=await p.inputValue('.hppanel input.txt');
 r.meter=await p.locator('.hppanel .mono').first().textContent();
 await p.screenshot({path:'build/hp2.png'});
} else { r.phoneOverflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth); }}
console.log(JSON.stringify(r),errs);await b.close();})();
