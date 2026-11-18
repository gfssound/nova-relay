const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
const DIR=__dirname, ROOT=path.join(DIR,'..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const got=path.join(DIR,'fake_sc.txt'); try{fs.unlinkSync(got);}catch(_){}
  const fake=spawn('python3',[path.join(DIR,'fake_nova.py'),path.join(ROOT,'cap/direct1_conv.log'),got,'100','1']);
  const pty=await new Promise(r=>fake.stdout.once('data',d=>r(String(d).trim())));
  const data=fs.mkdtempSync(path.join(DIR,'nrsc-'));
  const srv=spawn('node',[path.join(ROOT,'nova-remote/server.js'),'--port','8183','--no-open','--data',data]); await sleep(900);
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8183/'); await p.waitForFunction(()=>cart.ready);
  const panelBtns = `(() => { const h3=[...document.querySelectorAll('.panel h3')].find(e=>/Protocol test tools/.test(e.textContent)); const pn=h3&&h3.closest('.panel'); return pn?[...pn.querySelectorAll('button')]:[]; })()`;
  // before connect + before arm: expect all disabled
  await p.evaluate(()=>go('setup')); await sleep(250);
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('button,.seltab,.tab,a')].find(e=>/Cart & Recorder Link|Connection/.test(e.textContent||'')); if(b) b.click(); }); await sleep(400);
  const beforeAll = await p.evaluate(`${panelBtns}.map(x=>x.disabled)`);
  // connect a nova, arm, expect enabled
  await p.evaluate(pt=>net.send({t:'serialOpen',path:pt,baud:38400,parity:'odd',listen:false}), pty);
  await p.waitForFunction(()=>cart.nova&&cart.nova.connected,null,{timeout:40000}); await sleep(1500);
  await p.evaluate(()=>{ const c=document.getElementById('f-test-arm'); c.checked=true; c.dispatchEvent(new Event('change')); }); await sleep(200);
  const afterArm = await p.evaluate(`${panelBtns}.map(x=>x.disabled)`);
  console.log('test-panel buttons:', beforeAll.length);
  console.log('all disabled before connect+arm:', beforeAll.every(x=>x===true));
  console.log('all enabled after connect+arm :', afterArm.every(x=>x===false));
  console.log('errors:', errs.length?errs:'none');
  await b.close(); srv.kill(); fake.kill(); fs.rmSync(data,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1);});
