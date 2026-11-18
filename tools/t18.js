const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:820}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
const r={};
const hex=n=>'#'+n.toString(16).padStart(6,'0');
r.start=await p.evaluate(()=>[V["track.color"][4],V["input.color"][2]]);  // ANNA track5 <- input3
// change input 3 color on Inputs page
await p.click('.tab[data-v="inputs"]'); await p.locator('.ch').nth(2).click(); await p.waitForTimeout(100);
await p.locator('#f-input-color-2').evaluate(e=>{e.value='#ff00aa'; e.dispatchEvent(new Event('input',{bubbles:true}));});
r.afterInput=await p.evaluate(()=>[V["track.color"][4].toString(16),V["input.color"][2].toString(16)]);
// change track 5 color on Track names page
await p.click('.tab[data-v="names"]'); await p.locator('#f-track-color-4').evaluate(e=>{e.value='#00ccff'; e.dispatchEvent(new Event('input',{bubbles:true}));});
r.afterTrack=await p.evaluate(()=>[V["track.color"][4].toString(16),V["input.color"][2].toString(16)]);
r.meterLabel=await (async()=>{await p.click('.tab[data-v="home"]');await p.waitForTimeout(200);return p.locator('.scrib',{hasText:'ANNA'}).evaluate(e=>getComputedStyle(e).backgroundColor);})();
// mixed track (MIX L) unaffected
r.mixL=await p.evaluate(()=>V["track.color"][0].toString(16));
// re-route: send input 9 alone to track 11 -> track 11 takes input 9 color
await p.evaluate(()=>{ set("input.color",[8],0x123456); set("trackmix.matrix",[0,10,8],7); });
r.trk11=await p.evaluate(()=>V["track.color"][10].toString(16));
r.log=await p.evaluate(()=>LOG.filter(e=>e.dir==='tx').slice(-4).map(e=>e.line.slice(14)));
console.log(JSON.stringify(r,null,1),errs);await b.close();})();
