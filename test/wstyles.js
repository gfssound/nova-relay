const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh,tag] of [[1280,900,'desk'],[390,844,'phone']]) {
const p=await b.newPage({viewport:{width:w,height:hh},deviceScaleFactor:tag==='phone'?2:1}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{for(let i=0;i<16;i++)set("record.tracks",[i],1); go("home")}); await p.waitForTimeout(200);
for (const v of ['a','b','c','d']) {
 await p.evaluate(v=>{localStorage.setItem("cart-remote-wstyle",v); applyWiredStyle(); go("home")},v); await p.waitForTimeout(350);
 const info=await p.evaluate(()=>{const m=document.getElementById("view"); return [m.clientHeight, m.scrollHeight, document.documentElement.scrollWidth, [...new Set([...document.querySelectorAll('.strip .led')].map(c=>Math.round(c.getBoundingClientRect().top)))].length]});
 console.log(tag, v, info.join(' '));
 await p.screenshot({path:path.join(__dirname,`ws-${tag}-${v}.png`), clip: tag==='desk'?{x:0,y:190,width:1280,height:420}:{x:0,y:230,width:390,height:500}});
}
await p.close(); }
console.log(errs); await b.close(); })();
