const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
const r={};
// rename input RX 1 (ANNA) on Inputs page
await p.click('.tab[data-v="inputs"]'); await p.locator('.ch').nth(0).click();
const inName=p.locator('#f-input-name-0'); await inName.fill('anna k'); await inName.press('Enter');
r.afterInput=await p.evaluate(()=>[V["input.name"][0],V["track.name"][4]]);
// rename track 3 (BOOM) on Track Names
await p.click('.tab[data-v="names"]'); const tn=p.locator('#f-track-name-2'); await tn.fill('boom 1'); await tn.press('Enter');
r.afterTrack=await p.evaluate(()=>[V["track.name"][2],V["input.name"][8]]);
// meter label
await p.click('.tab[data-v="home"]'); await p.waitForTimeout(200); r.meters=(await p.locator('.scrib').allTextContents()).slice(3,6);
// mixed track rename should not touch inputs
await p.evaluate(()=>set("track.name",[0],"MIX LEFT")); r.mix=await p.evaluate(()=>V["input.name"].slice(0,10));
// route unnamed RX 5 alone to track 11 -> input takes track name
await p.evaluate(()=>set("trackmix.matrix",[0,10,4],1)); r.newPair=await p.evaluate(()=>[V["track.name"][10],V["input.name"][4]]);
// route named input to unnamed... route RX 2 (MARCUS) alone to track 12 -> track takes input name
await p.evaluate(()=>set("trackmix.matrix",[0,11,1],1)); r.pair2=await p.evaluate(()=>[V["track.name"][11],V["input.name"][1]]);
// pop-up rename
await p.locator('button.scrib',{hasText:'DEV'}).click(); await p.waitForTimeout(200);
const pin=p.locator('.modal input[aria-label="Input name"]'); await pin.fill('devon'); await pin.press('Enter');
r.popup=await p.evaluate(()=>[V["input.name"][2],V["track.name"][6]]); r.title=await p.locator('#mtitle').textContent();
console.log(JSON.stringify(r),errs);await b.close();})();
