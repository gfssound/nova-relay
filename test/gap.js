const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch();
for (const [w,hh,tag] of [[1280,900,'desk'],[820,1180,'tab'],[390,844,'phone']]) {
const p=await b.newPage({viewport:{width:w,height:hh}});
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(300);
const gap=async v=>{ await p.evaluate(v=>{routeMode="tracks"; go(v)},v); await p.waitForTimeout(150); return p.evaluate(v=>{
 const seg=document.querySelector(v==="names"?".phsecs.secs-all":".routeseg"); const top=seg.getBoundingClientRect().top - document.getElementById("view").getBoundingClientRect().top;
 const next=v==="names"?[...document.querySelectorAll('#view .panel')].find(e=>e.offsetParent):seg.closest('.flex').nextElementSibling;
 return [Math.round(top), Math.round(next.getBoundingClientRect().top-seg.getBoundingClientRect().bottom)]},v); };
console.log(tag,'routing [top,gap]', await gap("routing"),'names', await gap("names"));
await p.close(); }
await b.close(); })();
