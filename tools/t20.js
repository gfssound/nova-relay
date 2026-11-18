const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:820}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(500);
const r={};
await p.locator('button.scrib',{hasText:'ANNA'}).click(); await p.waitForTimeout(500);
r.open=await p.locator('.modal').count(); r.title=await p.locator('#mtitle').textContent(); r.inputs=await p.locator('.minput').count();
await p.screenshot({path:'build/modal1.png'});
// adjust trim via + button
const trimBefore=await p.evaluate(()=>V["input.trim.level"][2]);
await p.locator('.modal button[aria-label="Increase Input Trim Level"]').click(); r.trim=[trimBefore, await p.evaluate(()=>V["input.trim.level"][2])];
// rename track
const nm=p.locator('.modal input[aria-label="Track name"]'); await nm.fill('anna b'); await nm.press('Enter'); r.name=await p.evaluate(()=>V["track.name"][4]);
// color via bank inside modal
await p.locator('.modal .mrow .swbtn').click(); await p.locator('.picker .bsw').nth(2).click(); r.colors=await p.evaluate(()=>[V["track.color"][4].toString(16),V["input.color"][2].toString(16)]);
r.stillOpen=await p.locator('.modal').count();
await p.keyboard.press('Escape'); r.closed=await p.locator('.modal').count();
// mix track
await p.locator('button.scrib',{hasText:'MIX L'}).click(); await p.waitForTimeout(400);
r.mixInputs=await p.locator('.minput').count(); await p.locator('.minput').nth(3).click(); r.mixSel=await p.locator('.modal .lbl').nth(3).textContent().catch(()=>null);
await p.screenshot({path:'build/modal2.png'});
await p.mouse.click(10,400); r.backdropClose=await p.locator('.modal').count();
// phone
const q=await b.newPage({viewport:{width:390,height:844}}); q.on('pageerror',e=>errs.push('phone '+e.message));
await q.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await q.waitForTimeout(400);
await q.locator('button.scrib').nth(2).click(); await q.waitForTimeout(300);
r.phoneOverflow=await q.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
await q.screenshot({path:'build/modal-phone.png'});
console.log(JSON.stringify(r,null,1),errs);await b.close();})();
