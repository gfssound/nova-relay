const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch();
for (const vp of [[1024,768],[1180,820],[1366,1024],[820,1180]]) { const p=await b.newPage({viewport:{width:vp[0],height:vp[1]}});
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{ routeMode="phones"; go("routing"); }); await p.waitForTimeout(300);
console.log(vp.join('x'), await p.evaluate(()=>{ const m=document.getElementById('view'); const out=[m.scrollHeight,m.clientHeight];
 const vb=m.getBoundingClientRect(); const big=[...m.querySelectorAll('*')].map(e=>[e,e.getBoundingClientRect()]).filter(([e,r])=>r.bottom>vb.bottom-1).slice(0,6).map(([e,r])=>(e.tagName+'.'+e.className).slice(0,40)+' '+Math.round(r.bottom));
 return [out, big, getComputedStyle(m).paddingBottom]; }));
if(vp[0]==1024) await p.screenshot({path:path.join(__dirname,'hp.png')}); await p.close(); }
await b.close(); })();
