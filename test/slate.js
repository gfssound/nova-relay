const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); for (const [w,hh] of [[1280,800],[1024,768],[820,1180],[390,844]]) { const p=await b.newPage({viewport:{width:w,height:hh}});
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
console.log(w, await p.evaluate(()=>["goScene","goTake","hpBtn"].map(id=>{ const l=document.querySelector('#'+id+' .lbl').getBoundingClientRect(); const v=document.querySelector('#'+id+' b').getBoundingClientRect(); return Math.round(l.top)+'/'+Math.round(v.bottom); }).join('  ')));
if(w===1024) await p.screenshot({path:path.join(__dirname,'slate.png'), clip:{x:300,y:40,width:400,height:90}}); await p.close(); }
await b.close(); })();
