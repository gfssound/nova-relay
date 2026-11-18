const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const html=require('fs').readFileSync('build/cart-remote.html','utf8');const r={};
for(const [w,hh] of [[1280,900],[390,844]]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
if(w===1280){
 r.start=await p.locator('#hpCur').textContent(); r.enabled=await p.evaluate(()=>V["hpmix.enable"].map((v,i)=>v?i+1:0).filter(Boolean));
 const seq=[]; for(let k=0;k<8;k++){ await p.click('#hpBtn'); seq.push(await p.evaluate(()=>V["hpmix.preset"])); } r.seq=seq;
 // view follows
 await p.click('.tab[data-v="routing"]'); await p.locator('.routeseg button',{hasText:'Headphones'}).click(); await p.waitForTimeout(150);
 await p.click('#hpBtn'); r.viewSel=await p.inputValue('#f-hp-select'); r.top=await p.locator('#hpCur').textContent();
 // turn a preset off and confirm it is skipped
 await p.evaluate(()=>set("hpmix.enable",[2],0)); await p.evaluate(()=>set("hpmix.preset",[],2)); await p.click('#hpBtn'); r.skip=await p.evaluate(()=>V["hpmix.preset"]);
 await p.screenshot({path:'build/hptop.png',clip:{x:0,y:0,width:1280,height:60}});
} else { r.phone=await p.locator('#hpBtn').isVisible(); r.overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth); await p.screenshot({path:'build/hptop-phone.png',clip:{x:0,y:0,width:390,height:160}}); }}
console.log(JSON.stringify(r),errs);await b.close();})();
