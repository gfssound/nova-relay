const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const html=require('fs').readFileSync('build/cart-remote.html','utf8');
for(const [w,hh] of [[1280,820],[390,844]]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
await p.locator('button.scrib',{hasText:'BOOM'}).click(); await p.waitForTimeout(300);
const spill=await p.evaluate(()=>{const m=document.querySelector('.modal').getBoundingClientRect();return [...document.querySelectorAll('.modal output, .modal input, .modal button')].filter(e=>{const r=e.getBoundingClientRect();return r.right>m.right+1||r.left<m.left-1}).length});
console.log(w,'spilling controls',spill);
if(w===1280) await p.screenshot({path:'build/modal3.png'});
// other pages using sliders
await p.keyboard.press('Escape'); await p.click('.tab[data-v="inputs"]'); await p.waitForTimeout(200);
console.log(w,'inputs overflow',await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth));}
console.log(errs);await b.close();})();
