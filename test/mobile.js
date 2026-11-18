const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(500);
const shots=[["home",null],["arm",null],["inputs",null],["routing","tracks"],["routing","phones"],["setup",null]];
for (const [v,m] of shots) { await p.evaluate(([v,m])=>{ if(m) routeMode=m; go(v); window.scrollTo(0,0); },[v,m]); await p.waitForTimeout(400); await p.screenshot({path:path.join(__dirname,`mob-${v}${m?'-'+m:''}.png`)}); }
console.log(errs, await p.evaluate(()=>document.documentElement.scrollWidth)); await b.close(); })();
