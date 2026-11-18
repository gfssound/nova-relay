const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs=require('fs'),os=require('os'),path=require('path');
const DIR=__dirname, ROOT=path.join(DIR,'..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const fake=spawn('python3',[path.join(DIR,'fake_nova.py'),path.join(ROOT,'cap/live5_conv.log'),path.join(DIR,'fake_rx11.txt'),'40','10']);
  const pty=await new Promise(r=>fake.stdout.once('data',d=>r(String(d).trim())));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'nr-'));
  const srv=spawn('node',[path.join(ROOT,'nova-remote/server.js'),'--port','8145','--no-open','--no-auto','--data',data]);
  await sleep(800); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8145/'); await p.waitForFunction(()=>cart.ready); await p.evaluate(()=>go("home"));
  await p.evaluate(path=>net.send({t:'serialOpen',path,baud:38400,parity:'odd'}),pty);
  await p.waitForFunction(()=>cart.nova&&cart.nova.connected,null,{timeout:15000});
  const t0=Date.now(); const states=[];
  while(Date.now()-t0<20000){ const st=await p.evaluate(()=>modal?(modal.input ?? 'other'):null); if(!states.length||states[states.length-1][1]!==st) states.push([((Date.now()-t0)/1000).toFixed(1),st]); await sleep(100); }
  console.log('modal states', JSON.stringify(states));
  await p.screenshot({path:path.join(DIR,'pages.png')});
  // remote opens RX2 then closes
  await p.evaluate(()=>{ closeModal(); openInputModal(15); }); await sleep(800); await p.evaluate(()=>closeModal()); await sleep(800);
  await p.evaluate(()=>openInputModal(16)); await sleep(500);
  const logs=await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>!e.childElementCount).map(e=>e.textContent).filter(t=>/(opened|closed) the|page button/.test(t)&&t.length<200).slice(-8));
  console.log(logs.join('\n')); console.log('link', fs.readFileSync(path.join(data,'nova-link.json'),'utf8')); console.log('errors',errs);
  await b.close(); srv.kill(); fake.kill();
  console.log(fs.readFileSync(path.join(DIR,'fake_rx11.txt'),'utf8').split('\n').filter(l=>/ 00 25 /.test(l)).join('\n'));
})().catch(e=>{console.error(e);process.exit(1)});
