const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
const r={};
await p.click('.tab[data-v="routing"]'); await p.locator('.routeseg button',{hasText:'Outputs'}).click(); await p.waitForTimeout(200);
const lab=o=>p.evaluate(o=>{const s=document.getElementById('f-outpreset-'+o);return s.options[s.selectedIndex].text},o);
r.start=[await lab(0),await lab(4)];
// OUT 5 = BOOM; add Slate + Com 1 -> custom; save as BOOM SLATE
const row5=p.locator('.mx tbody tr').nth(4);
await row5.locator('button',{hasText:'Slate'}).click(); await row5.locator('button',{hasText:'Com 1'}).click();
r.custom=await lab(4);
await p.selectOption('#op-from','4'); await p.fill('#op-name','boom slate'); await p.press('#op-name','Enter');
r.saved=await p.evaluate(()=>V["ui.outpresets"].find(x=>x.name==='BOOM SLATE'));
r.afterSave=await lab(4);
// load on OUT 8 (empty, tone off)
await p.selectOption('#f-outpreset-7',{label:'BOOM SLATE'});
r.out8=await p.evaluate(()=>({r:V["outputmix.matrix"][0][7].slice(0,4),tone:V["outputmix.tone"][0][7],slate:V["outputmix.slate"][0][7],com1:V["outputmix.com1"][0][7],com2:V["outputmix.com2"][0][7]}));
// load MIX L on OUT 8 -> tone on, slate/com off
await p.selectOption('#f-outpreset-7',{label:'MIX L'});
r.out8b=await p.evaluate(()=>({r:V["outputmix.matrix"][0][7].slice(0,4),tone:V["outputmix.tone"][0][7],slate:V["outputmix.slate"][0][7],com1:V["outputmix.com1"][0][7]}));
await p.locator('.toast button',{hasText:'Undo'}).click();
r.undo=await p.evaluate(()=>({slate:V["outputmix.slate"][0][7],com1:V["outputmix.com1"][0][7],tone:V["outputmix.tone"][0][7]}));
r.panel=await p.locator('.opinfo').nth(0).innerText();
console.log(JSON.stringify(r),errs);await b.close();})();
