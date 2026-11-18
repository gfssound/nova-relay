const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
const r={};
r.unit=await p.evaluate(()=>[sceneNextNumber("42A"),sceneNextLetter("42A"),sceneNextLetter("42"),sceneNextLetter("42Z"),sceneNextNumber("S12B"),sceneNextNumber("WILD")]);
await p.click('#goScene'); await p.waitForTimeout(100);
await p.locator('.modal button',{hasText:'Next Scene Letter'}).click(); r.l1=await p.evaluate(()=>V["scene.next"]);
await p.locator('.modal button',{hasText:'Next Scene Letter'}).click(); r.l2=await p.evaluate(()=>V["scene.next"]);
await p.locator('.modal button',{hasText:'Next Scene #'}).click(); r.n1=await p.evaluate(()=>V["scene.next"]);
r.takePh=await p.locator('.modal input[aria-label="Next take"]').getAttribute('placeholder');
await p.locator('.modal button',{hasText:'Done'}).click();
await p.click('#bRec'); await p.waitForTimeout(300); await p.click('#bStop'); await p.waitForTimeout(150);
r.after=await p.evaluate(()=>[V["scene.current"],V["take.current"]]);
// same scene count-up still works
await p.click('#bRec'); await p.waitForTimeout(300); await p.click('#bStop'); await p.waitForTimeout(150);
r.after2=await p.evaluate(()=>[V["scene.current"],V["take.current"]]);
// typed take with new scene wins
await p.evaluate(()=>{ set("scene.next",[],"50"); set("take.next",[],"3"); }); await p.click('#bRec'); await p.waitForTimeout(300); await p.click('#bStop'); await p.waitForTimeout(150);
r.typed=await p.evaluate(()=>[V["scene.current"],V["take.current"]]);
await p.click('.tab[data-v="meta"]'); r.metaBtns=await p.locator('#view button',{hasText:'Next Scene'}).count();
await p.click('#goScene'); await p.waitForTimeout(100); await p.screenshot({path:'build/scenebtns.png',clip:{x:340,y:20,width:600,height:320}});
console.log(JSON.stringify(r),errs);await b.close();})();
