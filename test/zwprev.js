const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}});
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.addStyleTag({content:`:root,body[data-layout="console"],:root[data-theme="day"],:root[data-theme="day"] body[data-layout="console"]{--accent:#acebfc !important;--accent-ink:#0a0b0c !important}`});
await p.evaluate(()=>{ readColors(); routeMode="phones"; go("routing"); }); await p.waitForTimeout(300);
await p.screenshot({path:path.join(__dirname,'zw-dark.png')});
await p.click('#dayBtn'); await p.evaluate(()=>{ readColors(); go("routing"); }); await p.waitForTimeout(300);
await p.screenshot({path:path.join(__dirname,'zw-day.png')}); await p.click('#dayBtn'); await b.close(); })();
