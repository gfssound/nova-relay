const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const opt of [["top","1"],["bottom","1"],["top","0"]]) {
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true});
const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html'));
await p.evaluate(o=>{localStorage.setItem("cart-remote-phtabs",o[0]);localStorage.setItem("cart-remote-phsec",o[1]);for(let i=0;i<16;i++)set("record.tracks",[i],1);applyPhoneOpts(true)},opt);
await p.waitForTimeout(400);
const tag=opt.join('');
for (const [v,m] of [["home",null],["arm",null],["inputs",null],["routing","tracks"],["routing","outputs"],["routing","phones"],["names",null],["timecode",null],["meta",null],["setup",null]]) {
 await p.evaluate(([v,m])=>{ if(m) routeMode=m; go(v);},[v,m]); await p.waitForTimeout(350);
 const info=await p.evaluate(()=>{const m=document.getElementById("view"); return [m.clientHeight, m.scrollHeight, document.documentElement.scrollWidth]});
 console.log(tag, v, m||'', info.join(' '));
 if(tag!=="top0") await p.screenshot({path:path.join(__dirname,`m2-${tag}-${v}${m?'-'+m:''}.png`)});
}
await ctx.close(); }
console.log(errs); await b.close(); })();
