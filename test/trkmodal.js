const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(500);
const pick=await p.evaluate(()=>{ const P=get("trackmix.preset")-1; let one=null,many=null; for(let t=0;t<16;t++){ const n=routedInputs(t).length; if(n===1&&one==null) one=t; if(n>1&&many==null) many=t; } return [one,many]; });
console.log('tracks',pick);
await p.evaluate(t=>openTrackModal(t),pick[0]); await p.waitForTimeout(300); await p.screenshot({path:path.join(__dirname,'trk-one.png')});
if(pick[1]!=null){ await p.evaluate(t=>openTrackModal(t),pick[1]); await p.waitForTimeout(300); await p.screenshot({path:path.join(__dirname,'trk-many.png')}); }
console.log('errors',errs); await b.close(); })();
