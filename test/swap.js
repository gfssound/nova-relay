const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs=require('fs'),os=require('os'),path=require('path');
const DIR=__dirname, ROOT=path.join(DIR,'..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const fake=spawn('python3',[path.join(DIR,'fake_nova.py'),path.join(ROOT,'cap/live5_conv.log'),path.join(DIR,'fake_rx12.txt'),'40','10']);
  const pty=await new Promise(r=>fake.stdout.once('data',d=>r(String(d).trim())));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'nr-'));
  const srv=spawn('node',[path.join(ROOT,'nova-remote/server.js'),'--port','8147','--no-open','--no-auto','--data',data]);
  await sleep(800); const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8147/'); await p.waitForFunction(()=>cart.ready);
  await p.evaluate(path=>net.send({t:'serialOpen',path,baud:38400,parity:'odd'}),pty);
  await p.waitForFunction(()=>cart.nova&&cart.nova.connected,null,{timeout:15000});
  const t0=Date.now(); const seen=[];
  while(Date.now()-t0<16000){ const r=await p.evaluate(()=>V["trackmix.matrix"][0][2].map((v,i)=>v?inLabel(i)+':'+v:'').filter(Boolean).join(' ')); if(seen[seen.length-1]!==r) seen.push(r); await sleep(50); }
  console.log(seen);
  await p.evaluate(()=>{ set('trackmix.matrix',[0,0,9],2); set('trackmix.matrix',[0,0,4],1); set('trackmix.matrix',[0,13,6],1); set('outputmix.matrix',[0,0,6],1); });
  await sleep(700); console.log('errors',errs);
  await b.close(); srv.kill(); fake.kill();
  console.log(fs.readFileSync(path.join(DIR,'fake_rx12.txt'),'utf8').split('\n').filter(l=>/ 55 (0D|18) 00/.test(l)).join('\n'));
})().catch(e=>{console.error(e);process.exit(1)});
