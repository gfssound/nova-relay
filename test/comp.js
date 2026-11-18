const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{ for(let t=0;t<8;t++) set("record.tracks",[t],1,"remote"); set("input.compress.enable",[0],1); set("input.compress.link",[0],1); set("input.compress.thresh",[0],-20); go("home"); });
await p.waitForTimeout(1500); await p.screenshot({path:path.join(__dirname,'comp.png')});
console.log(errs, await p.evaluate(()=>[sim.inDb[0], routedInputs(2)])); await b.close(); })();
