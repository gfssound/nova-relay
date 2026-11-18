const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const html=require('fs').readFileSync('build/cart-remote.html','utf8');
for(const [w,hh] of [[1280,820],[768,1000],[390,844]]){const p=await b.newPage({viewport:{width:w,height:hh}});
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
await p.click('.tab[data-v="arm"]');await p.waitForTimeout(200);
const tops=await p.locator('.armbtn').evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().top)));
const rows={};tops.forEach(t=>rows[t]=(rows[t]||0)+1);
console.log(w,Object.values(rows).join('x'),'overflow',await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
if(w===1280) await p.screenshot({path:'build/arm8.png'});}
await b.close();})();
