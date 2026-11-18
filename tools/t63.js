const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const html=require('fs').readFileSync('build/cart-remote.html','utf8');
for(const [w,hh] of [[1280,900],[390,844]]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(250);
await p.click('.tab[data-v="names"]'); await p.waitForTimeout(150);
await p.evaluate(()=>{ const b=V["ui.colorbank"].slice(); b.push(0x123abc,0xabc123,0x998877,0x334455); set("ui.colorbank",[],b,"local"); });
const tops=await p.locator('.bitem').evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().top)));const rows={};tops.forEach(t=>rows[t]=(rows[t]||0)+1);
await p.locator('#f-track-color-0').click(); const pt=await p.locator('.picker .bsw').evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().top)));const pr={};pt.forEach(t=>pr[t]=(pr[t]||0)+1);
console.log(w,'bank',Object.values(rows).join('x'),'picker',Object.values(pr).join('x'),'overflow',await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
if(w===1280){ await p.screenshot({path:'build/bank8.png',fullPage:true}); }}
console.log(errs);await b.close();})();
