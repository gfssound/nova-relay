const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs=require('fs'),os=require('os'),path=require('path');
(async()=>{const data=fs.mkdtempSync(path.join(os.tmpdir(),'nr-'));
const srv=spawn('node',[path.join(__dirname,'../nova-remote/server.js'),'--port','8139','--no-open','--no-auto','--data',data]);
await new Promise(r=>setTimeout(r,800));const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8139/');await p.waitForFunction(()=>cart.ready);
console.log(await p.evaluate(()=>{set('input.trim.mode',[16],1);return [trimLbl(2),trimLbl(15).textContent,trimLbl(16).textContent]}),errs);
await b.close();srv.kill();})();
