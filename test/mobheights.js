const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true});
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(500);
console.log(await p.evaluate(()=>VIEWS.map(v=>v[0])));
for (const [v,m] of [["home",null],["arm",null],["inputs",null],["routing","tracks"],["routing","outputs"],["routing","phones"],["names",null],["timecode",null],["meta",null],["setup",null]]) {
 const r=await p.evaluate(([v,m])=>{ if(m) routeMode=m; go(v); return 0;},[v,m]); await p.waitForTimeout(300);
 const info=await p.evaluate(()=>{const m=document.getElementById("view"); return {main:m.clientHeight, content:m.scrollHeight}}); await p.evaluate(()=>{const m=document.getElementById("view"); m.style.overflow="visible"; m.style.height="auto"; document.querySelector(".app")&&(document.querySelector(".app").style.height="auto"); document.body.style.height="auto"; document.documentElement.style.height="auto"; document.body.style.overflow="visible"});
 console.log(v,m,JSON.stringify(info));
 await p.screenshot({path:path.join(__dirname,`mf-${v}${m?'-'+m:''}.png`),fullPage:true});
}
await b.close(); })();
