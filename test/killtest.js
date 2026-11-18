const { spawn } = require('child_process'); const fs=require('fs'),os=require('os'),path=require('path'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const fake = spawn('python3', [path.join(__dirname,'fake_nova.py'), path.join(__dirname,'../cap/tap1.log'), path.join(__dirname,'k.txt'), '30']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const D=fs.mkdtempSync(path.join(os.tmpdir(),'nr-'));
  const srv=spawn('node',[path.join(__dirname,'../nova-remote/server.js'),'--port','8141','--no-open','--data',D],{env:{...process.env,NOVA_REMOTE_TRY:pty}});
  let out=''; srv.stdout.on('data',d=>out+=d); srv.stderr.on('data',d=>out+=d);
  await sleep(800); const ws=new WebSocket('ws://127.0.0.1:8141/ws'); ws.onopen=()=>ws.send(JSON.stringify({t:'hello',name:'t'}));
  await sleep(5000); ws.close(); srv.kill(); const t0=Date.now();
  srv.on('exit',(c,sig)=>console.log('exit',c,sig,Date.now()-t0,'ms'));
  await sleep(4000); console.log('alive?', srv.exitCode===null && srv.signalCode===null); console.log(out.slice(-500)); srv.kill('SIGKILL'); fake.kill();
})();
