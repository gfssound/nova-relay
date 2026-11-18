const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
const r={};
await p.click('.tab[data-v="routing"]'); await p.locator('.routeseg button',{hasText:'Outputs'}).click(); await p.waitForTimeout(200);
r.initial=await p.locator('.opbtn b').allTextContents(); r.active0=await p.locator('.opbtn').first().getAttribute('aria-pressed');
// change matrix, save as new preset
await p.locator('.mx tbody tr').nth(5).locator('.cell').nth(2).click(); await p.locator('.mx tbody tr').nth(6).locator('.cell').nth(3).click();
r.activeAfterEdit=await p.locator('.opbtn').first().getAttribute('aria-pressed');
await p.fill('#op-name','boom feeds'); await p.press('#op-name','Enter');
r.after=await p.locator('.opbtn b').allTextContents(); r.active2=await p.locator('.opbtn').nth(1).getAttribute('aria-pressed');
// recall first
await p.locator('.opbtn').first().click(); r.recall=await p.evaluate(()=>[V["outputmix.matrix"][0][5][2],V["outputmix.matrix"][0][6][3]]);
r.toast=await p.locator('.toast').textContent();
await p.locator('.toast button',{hasText:'Undo'}).click(); r.undo=await p.evaluate(()=>[V["outputmix.matrix"][0][5][2],V["outputmix.matrix"][0][6][3]]);
// delete + undo
await p.locator('.bxs').nth(1).click(); r.del=await p.locator('.opbtn').count(); await p.locator('.toast button',{hasText:'Undo'}).click(); r.undel=await p.locator('.opbtn').count();
await p.screenshot({path:'build/outpresets.png',fullPage:true});
r.overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
console.log(JSON.stringify(r),errs);await b.close();})();
