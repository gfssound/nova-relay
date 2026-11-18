const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const html=require('fs').readFileSync('build/cart-remote.html','utf8');
const r={};
for(const [w,hh] of [[1280,820],[390,844]]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
await p.locator('.seg-b',{hasText:/^OUT$/}).click(); await p.waitForTimeout(300);
await p.locator('button.scrib',{hasText:'OUT 3'}).click(); await p.waitForTimeout(400);
if(w===1280){
 r.title=await p.locator('#mtitle').textContent(); r.cells=await p.locator('.ocell').count();
 const c=p.locator('.ocell').nth(6); const seq=[]; for(let k=0;k<3;k++){await c.click(); seq.push(await p.evaluate(()=>V["outputmix.matrix"][0][2][6]));} r.seq=seq;
 await p.locator('.ocell').nth(4).click(); await p.locator('.ocell').nth(4).click();
 await p.locator('.modal button',{hasText:'Slate'}).click(); r.slate=await p.evaluate(()=>V["outputmix.slate"][0][2]);
 r.count=await p.locator('.modal .mono').last().textContent();
 await p.screenshot({path:'build/outmodal.png'});
 await p.locator('.modal button',{hasText:'Clear all'}).click(); r.cleared=await p.evaluate(()=>V["outputmix.matrix"][0][2].slice(0,16).filter(v=>v).length);
 await p.locator('.modal button',{hasText:'Full matrix'}).click(); await p.waitForTimeout(200); r.nav=await p.evaluate(()=>[current,routeMode]);
} else { r.phoneOverflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth); await p.screenshot({path:'build/outmodal-phone.png'}); }
}
console.log(JSON.stringify(r),errs);await b.close();})();
