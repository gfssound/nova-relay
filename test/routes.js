const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh] of [[1024,768]]) {
  const p=await b.newPage({viewport:{width:w,height:hh}}); p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
  for (const [mode,L] of [['tracks','matrix'],['tracks','track'],['tracks','input'],['outputs','matrix'],['outputs','output']]) {
    await p.evaluate(([mode,L])=>{ routeMode=mode; routeLayout[mode]=L; selTrack=2; selRouteIn=0; selOut=4; go("routing"); },[mode,L]); await p.waitForTimeout(500);
    await p.screenshot({path:path.join(__dirname,`rt-${mode}-${L}-${w}.png`)});
  }
  await p.close();
}
console.log('errors',errs); await b.close(); })();
