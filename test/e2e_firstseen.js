const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, process.argv[2]), path.join(DIR, 'fake_fs.txt'), '25', '4']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8136', '--no-open', '--data', data]);
  await sleep(800);
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8136/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd' }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 15000 });
  await sleep(15000);
  console.log((await p.evaluate(() => LOG.filter(e => /first time/.test(e.line)).map(e => e.line))).join('\n') || '(none)');
  await b.close(); srv.kill(); fake.kill();
})().catch(e => { console.error(e); process.exit(1); });
