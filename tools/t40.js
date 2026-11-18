const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const html=require('fs').readFileSync('build/cart-remote.html','utf8');const r={};
for(const [w,hh] of [[1280,900],[390,844]]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
await p.click('.tab[data-v="inputs"]'); await p.waitForTimeout(200);
const tops=await p.locator('.ch').evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().top)));const rows={};tops.forEach(t=>rows[t]=(rows[t]||0)+1);
r[w]={n:tops.length, rows:Object.values(rows).join('x'), overflow:await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)};
if(w===1280){ r.last=(await p.locator('.ch .n').allTextContents()).slice(-4);
  await p.locator('.ch').nth(21).click(); r.detail=await p.locator('#view .panel h3').first().textContent();
  await p.screenshot({path:'build/inputs22.png',clip:{x:0,y:200,width:1280,height:230}});
  await p.click('.tab[data-v="routing"]'); await p.locator('.routeseg button',{hasText:'Tracks'}).click(); await p.waitForTimeout(150);
  r.cols=(await p.locator('.mx thead th').allTextContents()).slice(-4);
  await p.locator('.mx tbody tr').nth(12).locator('.cell').nth(21).click(); r.route=await p.evaluate(()=>V["trackmix.matrix"][0][12][21]);
  r.pair=await p.evaluate(()=>[V["track.name"][12],V["input.name"][21]]);
}}
console.log(JSON.stringify(r),errs);await b.close();})();
