const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs=require('fs'),os=require('os'),path=require('path');
const DIR=__dirname, ROOT=path.join(DIR,'..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const out=path.join(DIR,'fake_pf.txt'); try{fs.unlinkSync(out)}catch(e){}
  const fake=spawn('python3',[path.join(DIR,'fake_nova.py'),path.join(ROOT,'cap/live4_conv.log'),out,'60','12']);
  const pty=await new Promise(r=>fake.stdout.once('data',d=>r(String(d).trim())));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'nr-'));
  const srv=spawn('node',[path.join(ROOT,'nova-remote/server.js'),'--port','8144','--no-open','--no-auto','--data',data]);
  await sleep(800); const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:1024,height:768}}); p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8144/'); await p.waitForFunction(()=>cart.ready);
  await p.evaluate(path=>net.send({t:'serialOpen',path,baud:38400,parity:'odd'}),pty);
  await p.waitForFunction(()=>cart.nova&&cart.nova.connected,null,{timeout:15000}); await sleep(2000);
  // RX6 trim before learning: should not send
  await p.evaluate(()=>set("input.trim.level",[19],3)); await sleep(300);
  await p.evaluate(()=>{ go("setup"); }); await sleep(200);
  await p.click('button:has-text("Recorder Link")'); await sleep(300);
  await p.locator('[aria-label="Previous page number"]').click(); await p.locator('[aria-label="Next page number"]').click();
  await p.click('button:has-text("Open on Nova")'); await sleep(300);
  await p.selectOption('[aria-label="Page that opened on the Nova"]', '19'); await sleep(400);
  console.log('conf', JSON.stringify(await p.evaluate(()=>cart.nova.conf)), await p.evaluate(()=>[...document.querySelectorAll('.hint')].map(e=>e.textContent).find(t=>/Learned/.test(t))));
  await p.screenshot({path:path.join(DIR,'pagefind.png')});
  await p.evaluate(()=>{ set("input.trim.level",[19],4); set("input.trim.level",[19],-2); }); await sleep(600);
  await b.close(); srv.kill(); fake.kill(); await sleep(300);
  console.log(fs.readFileSync(out,'utf8').split('\n').filter(l=>/ 55 (4C|99) 00/.test(l)).join('\n')||'none', errs);
  console.log('link', fs.readFileSync(path.join(data,'nova-link.json'),'utf8'));
})().catch(e=>{console.error(e);process.exit(1)});
