const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const html=require('fs').readFileSync('build/cart-remote.html','utf8');const r={};
for(const [w,hh] of [[1440,900],[1280,900],[1024,768],[820,1180],[390,844],[360,740]]){const p=await b.newPage({viewport:{width:w,height:hh}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(250);
const boxes=await p.locator('#goScene,#goTake,#hpBtn,#bTone,#bStop,#bRec').evaluateAll(els=>els.map(e=>{const b=e.getBoundingClientRect();return [Math.round(b.top),Math.round(b.width),Math.round(b.height)]}));
r[w]={rows:new Set(boxes.map(x=>x[0])).size, w:[...new Set(boxes.map(x=>x[1]))].join('/'), h:[...new Set(boxes.map(x=>x[2]))].join('/'), overflow:await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)};
if([1280,820,390].includes(w)) await p.screenshot({path:`build/row-${w}.png`,clip:{x:0,y:0,width:w,height:w<=820?300:170}});
await p.click('#bRec'); await p.waitForTimeout(100); await p.click('#bStop');}
console.log(JSON.stringify(r),errs);await b.close();})();
