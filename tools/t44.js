const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const html=require('fs').readFileSync('build/cart-remote.html','utf8');
for(const [w,hh,f] of [[1280,900,'tr'],[390,844,'trp']]){const p=await b.newPage({viewport:{width:w,height:hh}});
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
await p.screenshot({path:`build/${f}.png`,clip:{x:0,y:0,width:w,height:w===1280?160:420}});}
await b.close();})();
