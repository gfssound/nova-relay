const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(300);
await p.evaluate(()=>{for(let i=0;i<16;i++)set("record.tracks",[i],1); go("home")}); await p.waitForTimeout(200);
const rd=()=>p.evaluate(()=>[document.querySelector('.wchip').textContent, talentInputs().map(x=>get("input.name",[x.i])).join(',')]);
console.log('before', await rd());
await p.evaluate(()=>{ set("track.name",[4],"BOOM 2"); set("input.name",[15],"BOOM2"); }); await p.waitForTimeout(200);
console.log('RX2 track named BOOM 2', await rd(), await p.evaluate(()=>document.querySelectorAll('.strip .wbadge:not(.none)').length));
console.log(errs); await b.close(); })();
