const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs=require('fs'),os=require('os'),path=require('path');
const DIR=__dirname, ROOT=path.join(DIR,'..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const fake=spawn('python3',[path.join(DIR,'fake_nova.py'),path.join(ROOT,'cap/tap5.log'),path.join(DIR,'fake_rx13.txt'),'40']);
  const pty=await new Promise(r=>fake.stdout.once('data',d=>r(String(d).trim())));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'nr-'));
  const srv=spawn('node',[path.join(ROOT,'nova-remote/server.js'),'--port','8149','--no-open','--no-auto','--data',data]);
  await sleep(800); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8149/'); await p.waitForFunction(()=>cart.ready);
  console.log('sim presets', await p.evaluate(()=>JSON.stringify(presetsList().map(p=>[p.name,p.s]))), await p.evaluate(()=>JSON.stringify(rowOf(4))));
  await p.evaluate(path=>net.send({t:'serialOpen',path,baud:38400,parity:'odd'}),pty);
  await p.waitForFunction(()=>cart.nova&&cart.nova.connected,null,{timeout:15000}); await sleep(3000);
  await p.evaluate(()=>{ set('outputmix.matrix',[0,4,22],nextOutRoute("tr",0)); set('outputmix.matrix',[0,4,31],1); set('outputmix.matrix',[0,4,31],nextOutRoute("tr",1)); set('trackmix.matrix',[0,0,6],1); set('trackmix.matrix',[0,2,14],2); set('outputmix.matrix',[0,1,9],2); });
  await sleep(800);
  await p.evaluate(()=>openOutputModal(4)); await sleep(300); await p.screenshot({path:path.join(DIR,'out5-modal.png')});
  console.log('errors',errs); await b.close(); srv.kill(); fake.kill();
  console.log(fs.readFileSync(path.join(DIR,'fake_rx13.txt'),'utf8').split('\n').filter(l=>/ 55 (0D|18|17|21|0C|13) 00/.test(l)).slice(-12).join('\n'));
})().catch(e=>{console.error(e);process.exit(1)});
