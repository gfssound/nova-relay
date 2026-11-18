const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs=require('fs'),os=require('os'),path=require('path');
const DIR=__dirname, ROOT=path.join(DIR,'..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const fake=spawn('python3',[path.join(DIR,'fake_nova.py'),path.join(ROOT,'cap/live7_znet.log'),path.join(DIR,'fake_z.txt'),'40','8']);
  const pty=await new Promise(r=>fake.stdout.once('data',d=>r(String(d).trim())));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'nr-'));
  const srv=spawn('node',[path.join(ROOT,'nova-remote/server.js'),'--port','8145','--no-open','--no-auto','--data',data]);
  await sleep(800); const b=await chromium.launch(); const p=await b.newPage();
  await p.goto('http://localhost:8145/'); await p.waitForFunction(()=>cart.ready);
  await p.evaluate(path=>net.send({t:'serialOpen',path,baud:38400,parity:'odd'}),pty);
  await p.waitForFunction(()=>cart.nova&&cart.nova.connected,null,{timeout:15000});
  const snap=async tag=>console.log(tag, await p.evaluate(()=>JSON.stringify({z:V["input.zaxnet.id"], tr:[V["input.trim.level"][5],V["input.trim.level"][19]]})));
  await sleep(1500); await snap('dump'); await sleep(16000); await snap('end');
  await b.close(); srv.kill(); fake.kill();
})().catch(e=>{console.error(e);process.exit(1)});
