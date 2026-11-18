const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs=require('fs'),os=require('os'),path=require('path');
const DIR=__dirname, ROOT=path.join(DIR,'..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const fake=spawn('python3',[path.join(DIR,'fake_nova.py'),path.join(ROOT,'cap/live5_conv.log'),path.join(DIR,'fake_rx14.txt'),'40','10']);
  const pty=await new Promise(r=>fake.stdout.once('data',d=>r(String(d).trim())));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'nr-'));
  const srv=spawn('node',[path.join(ROOT,'nova-remote/server.js'),'--port','8151','--no-open','--no-auto','--data',data]);
  await sleep(800); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8151/'); await p.waitForFunction(()=>cart.ready);
  await p.evaluate(path=>net.send({t:'serialOpen',path,baud:38400,parity:'odd'}),pty);
  await p.waitForFunction(()=>cart.nova&&cart.nova.connected,null,{timeout:15000});
  await p.evaluate(()=>{ go("inputs"); set("input.channel",[],1,"local"); }); await sleep(1500);
  await p.evaluate(()=>set('input.trim.level',[0],3)); 
  const vals=[]; for(let k=0;k<12;k++){ vals.push(await p.evaluate(()=>[sim.inDb[0].toFixed(0), sim.inDb[15].toFixed(0)].join('/'))); await sleep(500); }
  console.log('A1/RX2 levels', vals.join(' '));
  await p.screenshot({path:path.join(DIR,'bigmeter.png')});
  console.log('errors',errs); await b.close(); srv.kill(); fake.kill();
})().catch(e=>{console.error(e);process.exit(1)});
