const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path=require('path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ const home=require('fs').mkdtempSync('/tmp/claude-0/-home-claude/10fb85d4-efc5-5dbf-a537-af46f5c1d13e/scratchpad/apihome-');
 const srv=spawn('node',[path.join(__dirname,'../nova-remote/server.js'),'--port','8137','--no-open'],{env:{...process.env,HOME:home}});
 await sleep(800); const b=await chromium.launch(); const errs=[];
 const nova=await b.newPage({viewport:{width:390,height:844}}); nova.on('pageerror',e=>errs.push('nova '+e.message)); await nova.goto('http://localhost:8137/'); await sleep(1500);
 await nova.evaluate(()=>showCrew('a')); await sleep(200);
 const sp=await b.newPage({viewport:{width:1400,height:900}}); sp.on('pageerror',e=>errs.push('sp '+e.message)); await sp.goto('http://localhost:8137/sides.html'); await sleep(800);
 console.log('cart field', await sp.inputValue('#f-cart'));
 await sp.click('#b-send'); await sleep(600);
 console.log('status', await sp.textContent('#sendstat'));
 await sleep(400);
 console.log('crew', await nova.evaluate(()=>[document.querySelector('.wscene')?.innerText, [...document.querySelectorAll('.crew .cwrap > .ctalent > *')].map(e=>e.querySelector('b').textContent+' | '+e.querySelector('small').textContent)]));
 await nova.screenshot({path:path.join(__dirname,'e2e-crew.png')});
 // per-scene override in Sides Pro then auto-send
 await sp.check('#f-auto'); await sp.click('.srow >> nth=1'); await sleep(200);
 await sp.click('.ftag >> nth=1'); await sleep(150); await sp.click('.pop button:has-text("No lav this scene")'); await sleep(1200);
 console.log('after no-lav', await nova.evaluate(()=>[...document.querySelectorAll('.crew .cwrap > .ctalent > *')].map(e=>e.querySelector('b').textContent+' | '+e.querySelector('small').textContent)));
 console.log(errs); await b.close(); srv.kill(); })();
