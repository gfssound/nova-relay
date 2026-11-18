const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const html=require('fs').readFileSync('build/cart-remote.html','utf8');
for(const [w,hh] of [[1280,900],[390,844]]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
await p.click('.tab[data-v="inputs"]'); await p.waitForTimeout(200);
const tops=await p.locator('.ch').evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().top)));const rows={};tops.forEach(t=>rows[t]=(rows[t]||0)+1);
const clipped=await p.locator('.ch .nm span').evaluateAll(els=>els.filter(e=>e.scrollWidth>e.clientWidth+1).length);
console.log(w,'rows',Object.values(rows).join('x'),'clipped names',clipped,'overflow',await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
if(w===1280) await p.screenshot({path:'build/inputs18b.png',clip:{x:0,y:200,width:1280,height:200}});}
for(const v of []){}
console.log(errs);await b.close();})();
