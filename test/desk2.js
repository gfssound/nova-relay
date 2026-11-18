const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:1024,height:768}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(500);
await p.click('#dayBtn'); await p.evaluate(()=>go("home")); await p.waitForTimeout(500); await p.screenshot({path:path.join(__dirname,'desk-day-meters.png')});
for (const v of [['inputs',null],['routing','tracks'],['routing','outputs'],['setup',null]]) { await p.evaluate(([v,m])=>{ if(m) routeMode=m; go(v); },v); await p.waitForTimeout(300);
  console.log(v.join('/'), await p.evaluate(()=>{ const m=document.getElementById('view'); return [m.scrollHeight, m.clientHeight]; })); }
await p.evaluate(()=>{ routeMode="tracks"; go("routing"); }); await p.waitForTimeout(300); await p.screenshot({path:path.join(__dirname,'desk-day-routing.png')});
await p.click('#dayBtn'); console.log(errs); await b.close(); })();
