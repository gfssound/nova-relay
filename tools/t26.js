const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
const r={};
await p.click('.tab[data-v="routing"]'); await p.locator('.routeseg button',{hasText:'Outputs'}).click(); await p.waitForTimeout(200);
r.selVals=await p.evaluate(()=>[...Array(8)].map((_,o)=>{const s=document.getElementById('f-outpreset-'+o);return s.options[s.selectedIndex].text}));
// OUT 6: pick MIX L + R
await p.selectOption('#f-outpreset-5',{label:'MIX L + R'}); r.out6=await p.evaluate(()=>V["outputmix.matrix"][0][5].slice(0,4));
// make OUT 7 custom with post route and save as preset
await p.locator('.mx tbody tr').nth(6).locator('.cell').nth(4).click(); await p.locator('.mx tbody tr').nth(6).locator('.cell').nth(4).click();
r.out7label=await p.evaluate(()=>{const s=document.getElementById('f-outpreset-6');return s.options[s.selectedIndex].text});
await p.selectOption('#op-from','6'); await p.fill('#op-name','anna post'); await p.press('#op-name','Enter');
r.presets=await p.evaluate(()=>V["ui.outpresets"].map(x=>x.name+':'+x.r.join('')));
r.out7after=await p.evaluate(()=>{const s=document.getElementById('f-outpreset-6');return s.options[s.selectedIndex].text});
// apply to OUT 8
await p.selectOption('#f-outpreset-7',{label:'ANNA POST'}); r.out8=await p.evaluate(()=>V["outputmix.matrix"][0][7].slice(0,8));
r.used=await p.locator('.opused').allTextContents();
await p.screenshot({path:'build/presets2.png',fullPage:true});
// pop-up
await p.click('.tab[data-v="home"]'); await p.locator('.routeseg button',{hasText:'Outputs'}).click(); await p.waitForTimeout(200);
await p.locator('button.scrib',{hasText:'OUT 2'}).click(); await p.waitForTimeout(200);
await p.selectOption('#f-outpreset-1',{label:'BOOM'}); r.out2=await p.evaluate(()=>V["outputmix.matrix"][0][1].slice(0,4));
await p.screenshot({path:'build/presets-modal.png'});
console.log(JSON.stringify(r,null,0),errs);await b.close();})();
