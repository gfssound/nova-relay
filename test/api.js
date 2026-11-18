const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path=require('path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const home=require('fs').mkdtempSync(require('path').join(__dirname, '..', 'apihome-'));
 const srv=spawn('node',[path.join(__dirname,'../nova-remote/server.js'),'--port','8133','--no-open'],{env:{...process.env,HOME:home}}); srv.stderr.on('data',d=>process.stderr.write(d));
 await sleep(800);
 const g=async u=>{const r=await fetch('http://localhost:8133'+u); return r.status+' '+(await r.text()).slice(0,260)};
 console.log('before page:', await g('/api/status'));
 const b=await chromium.launch(); const p=await b.newPage(); await p.goto('http://localhost:8133/'); await sleep(1500);
 for (const u of ['/api','/api/status','/api/tone','/api/hp/next','/api/arm/12','/api/arm/12','/api/arm/99','/api/rec','/api/arm/3','/api/stop','/api/arm/none','/api/arm/all','/api/bogus']) console.log(u,'->',await g(u));
 console.log('page shows tone:', await p.evaluate(()=>[get("tone.enable"), get("hpmix.preset"), sim ? 0 : 0]));
 await b.close(); srv.kill(); })();
