const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh,tag] of [[1280,900,'desk'],[390,844,'phone']]) {
const p=await b.newPage({viewport:{width:w,height:hh},deviceScaleFactor:2,hasTouch:true}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
await p.evaluate(()=>{localStorage.removeItem("cart-remote-delayunit"); go("inputs")}); await p.waitForTimeout(300);
if(tag==='phone') await p.click('#view .phsecs .seg-b >> nth=1');
const g=k=>p.evaluate(k=>JSON.stringify(get(k[0],k[1])),k);
await p.click('#view .vtile:has-text("Notch 1 freq")'); await p.click('.editbar .bsin'); await p.keyboard.type('1234'); console.log('typed', await p.locator('.editbar .bsin').inputValue()); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
console.log(tag,'notch1', await g(["input.notch.freq",[0,0]]), await p.locator('#view .vtile:has-text("Notch 1 freq") .tv').textContent());
await p.click('.editbar .bsin'); await p.keyboard.type('99999'); await p.keyboard.press('Enter'); console.log(tag,'notch clamp', await g(["input.notch.freq",[0,0]]));
await p.click('.editbar .bsin'); await p.keyboard.type('abc'); await p.keyboard.press('Enter'); console.log(tag,'notch junk', await g(["input.notch.freq",[0,0]]));
await p.click('#view .vtile:has-text("Delay time")'); await p.click('.editbar .bsin'); await p.keyboard.type('12.34'); await p.keyboard.press('Enter');
console.log(tag,'delay ms', await g(["input.delay.time",[0]]));
await p.click('.editbar .dunits button:has-text("Frames")'); await p.click('.editbar .bsin'); await p.keyboard.type('1'); await p.keyboard.press('Enter');
console.log(tag,'delay 1fr', await g(["input.delay.time",[0]]), await p.locator('.editbar .bsin').inputValue());
await p.click('.editbar .dunits button:has-text("Feet")'); await p.click('.editbar .bsin'); await p.keyboard.type('10'); await p.locator('.editbar .ebdone').click();
console.log(tag,'delay 10ft via blur', await g(["input.delay.time",[0]]));
await p.click('#view .vtile:has-text("Delay time")'); await p.screenshot({path:path.join(__dirname,`typein-${tag}.png`)});
await p.close(); }
console.log(errs); await b.close(); })();
