const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh,tag] of [[1280,800,'desk'],[390,844,'phone'],[820,1180,'tabp']]) {
const p=await b.newPage({viewport:{width:w,height:hh}}); p.on('pageerror',e=>errs.push(tag+': '+e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(500);
await p.evaluate(()=>{ go("home"); }); await p.waitForTimeout(300);
const info = await p.evaluate(()=>[...document.querySelectorAll('.strip:not(.scale)')].map(st=>st.querySelector('.scrib').textContent.trim()+':'+(st.querySelector('.pflb.nofader')?'-':'P')).join(' '));
console.log(tag, info);
// click first enabled PFL
await p.evaluate(()=>{ const b=document.querySelector('.strip .pflb:not(.nofader)'); b && b.click(); }); await p.waitForTimeout(200);
console.log(tag, 'soloins', JSON.stringify(await p.evaluate(()=>get("ui.soloins"))), 'on:', await p.evaluate(()=>document.querySelectorAll('.pflb.on').length));
await p.screenshot({path:path.join(__dirname,`pfl-${tag}.png`)});
if (tag==='desk'){ await p.evaluate(()=>{ go("inputs"); set("input.channel",[],15,"local"); }); await p.waitForTimeout(400); await p.screenshot({path:path.join(__dirname,'pfl-inputs.png')});
  await p.evaluate(()=>{ go("home"); openInputModal(15, null); }); await p.waitForTimeout(300); await p.screenshot({path:path.join(__dirname,'pfl-modal.png')});
  await p.evaluate(()=>document.querySelector('.modal .pflb').click()); await p.waitForTimeout(200);
  console.log('after modal click', JSON.stringify(await p.evaluate(()=>get("ui.soloins")))); }
await p.close(); }
console.log(errs); await b.close(); })();
