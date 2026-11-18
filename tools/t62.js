const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const html=require('fs').readFileSync('build/cart-remote.html','utf8');
for(const [w,hh] of [[1280,900],[820,1180],[390,844]]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(250);
await p.click('.tab[data-v="names"]'); await p.waitForTimeout(150);
const tops=await p.locator('.namerow').evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().top)));const rows={};tops.forEach(t=>rows[t]=(rows[t]||0)+1);
console.log(w,Object.values(rows).join('x'),'overflow',await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
if(w===1280) await p.screenshot({path:'build/names4.png',clip:{x:0,y:200,width:1280,height:300}});}
console.log(errs);await b.close();})();
