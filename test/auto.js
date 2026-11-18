const { spawn } = require('child_process'); const fs = require('fs'); const os = require('os'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dead = spawn('python3', ['-c', 'import os,pty,time\nm,s=pty.openpty()\nprint(os.ttyname(s),flush=True)\ntime.sleep(90)']);
  const deadPty = await new Promise(r => dead.stdout.once('data', d => r(String(d).trim())));
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/tap1.log'), path.join(DIR, 'fake_rx7.txt'), '90']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
  const run = async (label, ms) => {
    const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8137', '--no-open', '--data', data], { env: { ...process.env, NOVA_REMOTE_TRY: deadPty + ',' + pty } });
    let out=''; srv.stdout.on('data',d=>out+=d); srv.stderr.on('data',d=>out+=d);
    // watch the log via websocket
    await sleep(700);
    const ws = new WebSocket('ws://127.0.0.1:8137/ws'); const lines = [];
    ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', name: 'test' }));
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.t === 'log' && m.dir !== 'raw') lines.push(m.text); if (m.t === 'state') lines.push('state serial=' + JSON.stringify(m.serial) + ' nova=' + JSON.stringify(m.nova)); if (m.t === 'nova' && m.nova.connected) lines.push('** CONNECTED ' + m.nova.model); };
    await sleep(ms); ws.close(); srv.kill(); await sleep(1500); if(!lines.length) console.log('SERVER OUTPUT', out.slice(-800));
    console.log('--- ' + label, lines.length); console.log(lines.filter(l => !/^→/.test(l)).slice(0, 14).join('\n'));
  };
  await run('first start (dead port, then the Nova)', 28000);   // 15 s on the dead port since Nov 14
  console.log('saved:', fs.readFileSync(path.join(data, 'nova-link.json'), 'utf8'));
  console.log('capture files:', fs.readdirSync(data).filter(f => f.startsWith('serial-capture')).length);
  await run('second start (saved port first)', 9000);
  dead.kill(); fake.kill();
})();
