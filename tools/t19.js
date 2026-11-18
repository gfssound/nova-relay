const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:820}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
const r={};
await p.click('.tab[data-v="names"]');await p.waitForTimeout(200);
await p.click('#f-track-color-4'); await p.waitForTimeout(100);
r.pickerOpen=await p.locator('.picker').count(); r.bankSize=await p.locator('.picker .bsw').count();
await p.screenshot({path:'build/picker.png'});
await p.locator('.picker .bsw').nth(5).click(); // blue
r.trk5=await p.evaluate(()=>V["track.color"][4].toString(16)); r.in3=await p.evaluate(()=>V["input.color"][2].toString(16)); r.closed=await p.locator('.picker').count();
// custom + save
await p.click('#f-track-color-11'); await p.locator('#picker-custom').evaluate(e=>{e.value='#123abc';e.dispatchEvent(new Event('input',{bubbles:true}))});
await p.click('.picker >> text=Save to bank'); r.bankAfter=await p.evaluate(()=>V["ui.colorbank"].length);
await p.mouse.click(5,5); r.closedOutside=await p.locator('.picker').count();
// remove from bank panel
await p.locator('.bitem .bx').first().click(); r.bankAfterRemove=await p.evaluate(()=>V["ui.colorbank"].length);
// inputs page swatch works too
await p.click('.tab[data-v="inputs"]'); await p.click('#f-input-color-0'); r.inputPicker=await p.locator('.picker').count();
await p.keyboard.press('Escape'); r.esc=await p.locator('.picker').count();
await p.click('.tab[data-v="names"]'); await p.waitForTimeout(150); await p.screenshot({path:'build/bank.png',fullPage:true});
console.log(JSON.stringify(r),errs);await b.close();})();
