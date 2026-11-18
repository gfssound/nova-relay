const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
for(const [w,hh] of [[1280,820],[400,860]]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(700);
for(const v of ['arm','inputs','tracks','outputs','phones','timecode','meta','setup','all','log','home']){await p.click(`.tab[data-v="${v}"]`);await p.waitForTimeout(120);}
console.log(w,'strips',await p.locator('.strip').count(),'overflow',await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
if(w===1280) await p.screenshot({path:'build/final.png'});}
console.log(errs);await b.close();})();
