const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
const r={};
await p.click('.tab[data-v="meta"]'); await p.waitForTimeout(150);
// current note: type
await p.locator('.notebtn.wide').nth(0).click(); r.title1=await p.locator('#mtitle').textContent();
await p.fill('#note-pop','boom in shot'); await p.press('#note-pop','Enter'); r.cur=await p.evaluate(()=>V["note.current"]);
// next note: preset
await p.locator('.notebtn.wide').nth(1).click(); await p.locator('.modal .chip',{hasText:'PICKUP'}).click(); r.next=await p.evaluate(()=>V["note.next"]);
r.btnText=await p.locator('.notebtn.wide').nth(1).textContent();
// history note
await p.locator('table.list .notebtn').nth(1).click(); r.title3=await p.locator('#mtitle').textContent();
await p.locator('.modal .chip',{hasText:'NG'}).click(); r.hist=await p.evaluate(()=>V["metadata.history"][1].note); r.cell=await p.locator('table.list .notebtn').nth(1).textContent();
// clear
await p.locator('table.list .notebtn').nth(1).click(); await p.locator('.modal button',{hasText:'Clear note'}).click(); r.cleared=await p.evaluate(()=>V["metadata.history"][1].note);
await p.screenshot({path:'build/notes.png'});
await p.locator('.notebtn.wide').nth(0).click(); await p.screenshot({path:'build/notepop.png'}); await p.keyboard.press('Escape');
console.log(JSON.stringify(r),errs);await b.close();})();
