const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh,tag] of [[820,1180,'port'],[1180,820,'land']]) {
const p=await b.newPage({viewport:{width:w,height:hh},deviceScaleFactor:1,hasTouch:true}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{for(let i=0;i<16;i++)set("record.tracks",[i],1)});
for (const [v,m] of [["home",null],["arm",null],["inputs",null],["routing","tracks"],["routing","phones"],["names",null],["timecode",null],["meta",null],["setup",null]]) {
 await p.evaluate(([v,m])=>{ if(m) routeMode=m; go(v);},[v,m]); await p.waitForTimeout(300);
 const info=await p.evaluate(()=>{const m=document.getElementById("view"); return [m.clientHeight, m.scrollHeight, document.documentElement.scrollWidth]});
 console.log(tag, v, m||'', info.join(' '));
 await p.screenshot({path:path.join(__dirname,`tab-${tag}-${v}${m?'-'+m:''}.png`)});
}
await p.close(); }
const p=await b.newPage({viewport:{width:1440,height:1000}}); await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.click('#tabletBtn'); await p.waitForTimeout(1200); await p.screenshot({path:path.join(__dirname,'tabview.png')});
await p.click('.phonebar button:has-text("Landscape")'); await p.waitForTimeout(800); await p.screenshot({path:path.join(__dirname,'tabview-land.png')});
const f=p.frames().find(fr=>fr!==p.mainFrame()); console.log('in frame', await f.evaluate(()=>[innerWidth, innerHeight, !!document.getElementById('tabletBtn')]));
console.log(errs); await b.close(); })();
