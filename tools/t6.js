const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:820}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(900);
await p.screenshot({path:'build/scale-console.png',clip:{x:0,y:200,width:700,height:460}});
await p.click('#layoutSeg [data-l="touch"]');await p.waitForTimeout(900);
await p.screenshot({path:'build/scale-touch.png',clip:{x:470,y:70,width:810,height:300}});
console.log(errs);await b.close();})();
