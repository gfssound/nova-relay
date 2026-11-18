const {chromium,devices}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
const A=await b.newPage({viewport:{width:1280,height:900}}); A.on('pageerror',e=>errs.push('A '+e.message));
const ctxB=await b.newContext({...devices['iPad Mini'], hasTouch:true}); const B=await ctxB.newPage(); B.on('pageerror',e=>errs.push('B '+e.message));
const r={};
await A.goto('http://localhost:18080/'); await A.waitForTimeout(1200);
r.overlayA=await A.locator('#connecting').isHidden(); r.pillA=await A.textContent('#linkText');
await B.goto('http://127.0.0.2:18080/'.replace('127.0.0.2','localhost')); await B.waitForTimeout(1200);
r.pillA2=await A.textContent('#linkText'); r.overlayB=await B.locator('#connecting').isHidden();
// sync: rename track on A, see on B
await A.click('.tab[data-v="names"]'); const tn=A.locator('#f-track-name-10'); await tn.fill('fx'); await tn.press('Enter'); await B.waitForTimeout(300);
r.bName=await B.evaluate(()=>V["track.name"][10]);
// arm from B, see meter on A
await B.click('.tab[data-v="arm"]'); await B.locator('.armbtn').nth(10).click(); await A.waitForTimeout(300);
await A.click('.tab[data-v="home"]'); await A.waitForTimeout(300); r.aStrips=await A.locator('.scrib').allTextContents();
// transport from B, timecode/state on A
await B.click('#bRec'); await A.waitForTimeout(700); r.aState=await A.textContent('#stState'); r.aTake=[await A.textContent('#slSceneLbl'),await A.textContent('#slTake')];
await A.waitForTimeout(1200); await A.click('#bStop'); await B.waitForTimeout(500);
r.bHist=await B.evaluate(()=>V["metadata.history"][0] && [V["metadata.history"][0].scene,V["metadata.history"][0].take,Math.round(V["metadata.history"][0].dur)]);
r.bNext=await B.textContent('#slTake');
// meters moving on B (live)
const m1=await B.evaluate(()=>[...sim.inDb].slice(0,3)); await B.waitForTimeout(400); const m2=await B.evaluate(()=>[...sim.inDb].slice(0,3)); r.metersMove=JSON.stringify(m1)!==JSON.stringify(m2);
// presets shared
await A.click('.tab[data-v="routing"]'); await A.locator('.routeseg button',{hasText:'Outputs'}).click(); await A.locator('button',{hasText:'Edit Presets'}).click();
await A.fill('#pe-new-name','shared one'); await A.press('#pe-new-name','Enter'); await A.keyboard.press('Escape'); await B.waitForTimeout(300);
r.bPresets=await B.evaluate(()=>V["ui.outpresets"].map(p=>p.name));
// per-device: help text on A only
await A.click('.tab[data-v="setup"]'); await A.locator('#view .panel',{hasText:'Display'}).locator('button.chip').click(); await B.waitForTimeout(300);
r.help=[await A.evaluate(()=>V["ui.helptext"]), await B.evaluate(()=>V["ui.helptext"])];
// setup panel urls/ports
r.urls=await A.locator('.urlrow code').allTextContents(); r.portOpts=await A.locator('#f-serial-port option').allTextContents();
// link log on B shows A's change
await B.click('.tab[data-v="log"]'); r.bLog=(await B.locator('.log > div').allTextContents()).filter(x=>/from|ACK|EVT/.test(x)).slice(-4);
await A.screenshot({path:'build/local-desktop.png'}); await B.click('.tab[data-v="home"]'); await B.waitForTimeout(300); await B.screenshot({path:'build/local-ipad.png'});
console.log(JSON.stringify(r,null,1),errs);await b.close();})();
