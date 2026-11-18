const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs=require('fs'),os=require('os'),path=require('path');
const DIR=__dirname, ROOT=path.join(DIR,'..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const out=path.join(DIR,'fake_p7.txt');
  const fake=spawn('python3',[path.join(DIR,'fake_nova.py'),path.join(ROOT,'cap/live7_pages.log'),out,'40','1']);
  const pty=await new Promise(r=>fake.stdout.once('data',d=>r(String(d).trim())));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'nr-'));
  const srv=spawn('node',[path.join(ROOT,'nova-remote/server.js'),'--port','8143','--no-open','--no-auto','--data',data]);
  let slog=''; srv.stdout.on('data',d=>slog+=d); srv.stderr.on('data',d=>slog+=d);
  await sleep(800); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1024,height:768}});
  await p.goto('http://localhost:8143/'); await p.waitForFunction(()=>cart.ready);
  await p.exposeFunction('rec', s=>console.log((Date.now()/1000%1000).toFixed(1), s));
  await p.evaluate(()=>{ const o=window.novaScreen; window.novaScreen=m=>{ rec('novaScreen '+JSON.stringify(m)); return o(m); }; });
  await p.evaluate(path=>net.send({t:'serialOpen',path,baud:38400,parity:'odd'}),pty);
  await p.waitForFunction(()=>cart.nova&&cart.nova.connected,null,{timeout:15000});
  for(let i=0;i<34;i++){ await sleep(1000); const st=await p.evaluate(()=>[current, modal&&modal.input, get("input.channel")]); if(i%3==0) console.log('t',i,JSON.stringify(st)); }
  const logs=await p.evaluate(()=>[...document.querySelectorAll('.logline, .log li, .log div')].map(e=>e.textContent).filter(t=>/page|Nova:/.test(t)).slice(-12));
  console.log(logs);
  await b.close(); srv.kill(); fake.kill();
})().catch(e=>{console.error(e);process.exit(1)});
