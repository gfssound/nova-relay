const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}});
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>go("home")); await p.waitForTimeout(300);
await p.click('.strip .scrib >> nth=2'); await p.waitForTimeout(400); await p.screenshot({path:path.join(__dirname,'pop-track.png')});
await p.evaluate(()=>{ closeModal(); openInputModal(14); }); await p.waitForTimeout(400); await p.screenshot({path:path.join(__dirname,'pop-input.png')}); await p.click('.modal .vtile:has-text("Track trim")'); await p.waitForTimeout(200); await p.evaluate(()=>document.querySelector('.modal-back').scrollTop=9999); await p.waitForTimeout(200); await p.screenshot({path:path.join(__dirname,'pop-input2.png')});
await b.close(); })();
