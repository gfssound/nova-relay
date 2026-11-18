const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs=require('fs'),os=require('os'),path=require('path');
const DIR=__dirname, ROOT=path.join(DIR,'..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const out=path.join(DIR,'fake_trim.txt'); try{fs.unlinkSync(out)}catch(e){}
  const fake=spawn('python3',[path.join(DIR,'fake_nova.py'),path.join(ROOT,'cap/live4_conv.log'),out,'60','12']);
  const pty=await new Promise(r=>fake.stdout.once('data',d=>r(String(d).trim())));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'nr-'));
  const srv=spawn('node',[path.join(ROOT,'nova-remote/server.js'),'--port','8142','--no-open','--no-auto','--data',data]);
  await sleep(800); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}});
  await p.goto('http://localhost:8142/'); await p.waitForFunction(()=>cart.ready);
  await p.evaluate(path=>net.send({t:'serialOpen',path,baud:38400,parity:'odd'}),pty);
  await p.waitForFunction(()=>cart.nova&&cart.nova.connected,null,{timeout:15000}); await sleep(2500);
  // UI path: Inputs page, Analog 1, Trim tile, + button
  await p.evaluate(()=>{ go("inputs"); set("input.channel",[],1,"local"); }); await sleep(300);
  await p.click('.vtile:has-text("Trim")'); await sleep(150);
  const plus=p.locator('.editbar .bsb').last(); await plus.click(); await sleep(200); await plus.click(); await sleep(600);
  console.log('V trim A1', await p.evaluate(()=>V["input.trim.level"][0]));
  const log=await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>!e.childElementCount).map(e=>e.textContent).filter(t=>/TRIM|trim/.test(t)).slice(-6));
  console.log(log);
  await b.close(); srv.kill(); fake.kill(); await sleep(300);
  console.log(fs.readFileSync(out,'utf8').split('\n').filter(l=>/ 55 4C 00/.test(l)).join('\n')||'NO TRIM TX');
})().catch(e=>{console.error(e);process.exit(1)});
