const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs=require('fs'),os=require('os'),path=require('path');
const DIR=__dirname, ROOT=path.join(DIR,'..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const fake=spawn('python3',[path.join(DIR,'fake_nova.py'),path.join(ROOT,'cap/live11_solo.log'),path.join(DIR,'fake_s.txt'),'45','1']);
  const pty=await new Promise(r=>fake.stdout.once('data',d=>r(String(d).trim())));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'nr-'));
  const srv=spawn('node',[path.join(ROOT,'nova-remote/server.js'),'--port','8147','--no-open','--no-auto','--data',data]);
  await sleep(800); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}});
  await p.goto('http://localhost:8147/'); await p.waitForFunction(()=>cart.ready);
  await p.evaluate(path=>net.send({t:'serialOpen',path,baud:38400,parity:'odd'}),pty);
  await p.waitForFunction(()=>cart.nova&&cart.nova.connected,null,{timeout:15000});
  await p.evaluate(()=>go("home"));
  for(let i=0;i<38;i+=2){ await sleep(2000); console.log(i, JSON.stringify(await p.evaluate(()=>[cart.nova.solo, get("ui.soloins"), [...document.querySelectorAll('.strip.soloed')].map(e=>e.querySelector('.scrib').textContent)]))); }
  await b.close(); srv.kill(); fake.kill();
})().catch(e=>{console.error(e);process.exit(1)});
