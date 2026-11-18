const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch();
for (const [w,hh] of [[1024,768],[390,844]]) { const p=await b.newPage({viewport:{width:w,height:hh}});
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.locator('#status').screenshot({path:path.join(__dirname,`hdr-${w}.png`)}); await p.close(); }
await b.close(); })();
