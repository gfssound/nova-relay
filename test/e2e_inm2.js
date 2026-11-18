/* Nov 1: replay of the mic test (live16): every input's level as the Inputs page computes it (inputDb). */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/live16_conv.log'), path.join(DIR, 'fake_inm2.txt'), '140', '6']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8137', '--no-open', '--data', data]);
  await sleep(800);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  await p.goto('http://localhost:8137/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd' }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 15000 });
  await p.evaluate(() => go('inputs'));
  const t0 = Date.now(); const log = [];
  while (Date.now() - t0 < 125000) {
    const r = await p.evaluate(() => ({ tc: document.getElementById('tc').textContent, v: [0, 1, 2, 3, 4, 5, 15].map(i => Math.round(inputDb(i))), via: [0, 1, 2, 3, 4, 5].map(i => inputVia(i)) }));
    log.push(r); await sleep(1000);
  }
  const hot = log.filter(r => r.v.slice(0, 6).some(x => x > -40));
  console.log('samples', log.length, 'with an analog/return above -40 dB:', hot.length);
  console.log(hot.filter((_, i) => i % 3 === 0).map(r => `A1 ${r.v[0]} A2 ${r.v[1]} A3 ${r.v[2]} A4 ${r.v[3]} R1 ${r.v[4]} R2 ${r.v[5]} | RX2 ${r.v[6]} | ${r.via.join(',')}`).join('\n'));
  await p.evaluate(() => set('input.channel', [], 2, 'local')); await sleep(500);
  await p.screenshot({ path: path.join(DIR, 'inm2.png') });
  await b.close(); srv.kill(); fake.kill();
})().catch(e => { console.error(e); process.exit(1); });
