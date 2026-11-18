const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh,tag] of [[1280,900,'desk'],[820,1180,'tab'],[390,844,'phone']]) {
const p=await b.newPage({viewport:{width:w,height:hh}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(300);
const m=async v=>{ await p.evaluate(v=>{routeMode="tracks"; go(v)},v); await p.waitForTimeout(150); return p.evaluate(v=>{const seg=document.querySelector(v==="names"?".phsecs.secs-all":".routeseg"); return [...seg.children].map(b=>{const r=b.getBoundingClientRect(); return Math.round(r.width)+'x'+Math.round(r.height)+' '+getComputedStyle(b).fontSize}).join(', ')},v); };
console.log(tag,'routing', await m("routing")); console.log(tag,'names  ', await m("names"));
if(tag==='phone') await p.screenshot({path:path.join(__dirname,'names-phone.png')});
await p.close(); }
console.log(errs); await b.close(); })();
