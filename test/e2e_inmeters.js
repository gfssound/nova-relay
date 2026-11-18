/* Nov 1: which input meters move on the Inputs page with a real capture replayed. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const cap = process.argv[2] || 'cap/live7_conv.log';
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, cap), path.join(DIR, 'fake_inm.txt'), process.argv[4] || '40', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8135', '--no-open', '--data', data]);
  await sleep(800);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  await p.goto('http://localhost:8135/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd' }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 15000 });
  await sleep(4000);
  /* Sample every input's level from the live data for 15 s, then check what the Inputs page meter shows. */
  const maxDb = new Array(22).fill(-200);
  for (let k = 0; k < 30; k++) { const v = await p.evaluate(() => Array.from(sim.inDb)); (v || []).forEach((x, i) => maxDb[i] = Math.max(maxDb[i], x)); await sleep(500); }
  const names = await p.evaluate(() => Array.from({ length: 22 }, (_, i) => inFull(i, get("input.name", [i]))));
  console.log(names.map((n, i) => `${String(i).padStart(2)} ${n.padEnd(22)} ${maxDb[i] <= -119 ? 'no level' : maxDb[i].toFixed(0) + ' dB peak'}`).join('\n'));
  await p.evaluate(() => go('inputs')); await sleep(500);
  const shown = [];
  for (const i of (process.argv[3] || '14,15,0,1,2,3,4,5').split(',').map(Number)) {
    await p.evaluate(i => set('input.channel', [], i + 1, 'local'), i);
    await sleep(1200);
    shown.push(`${i}: ${await p.locator('.bigmeter .mono').first().textContent().catch(() => '?')}`);
  }
  console.log('Inputs page meter:', shown.join(' | '));
  await p.screenshot({ path: path.join(DIR, 'inmeters.png') });
  await b.close(); srv.kill(); fake.kill();
})().catch(e => { console.error(e); process.exit(1); });
