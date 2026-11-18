const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const rx = path.join(DIR, 'fake_pfl.txt');
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/tap1101.log'), rx, '20', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8139', '--no-open', '--data', data]);
  await sleep(800);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8139/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(400);
  await p.evaluate(path => { const s = document.getElementById('f-serial-port'); s.append(new Option(path, path)); s.value = path; }, pty);
  await p.locator('button', { hasText: 'Connect' }).first().click(); await sleep(3500);
  console.log('pflmap', JSON.stringify(await p.evaluate(() => get('ui.pflmap'))));
  await p.evaluate(() => togglePfl(15)); await sleep(500);   // RX 2 -> fader 2 -> 51
  console.log('soloins after on', JSON.stringify(await p.evaluate(() => get('ui.soloins'))));
  const api = await (await fetch('http://localhost:8139/api/pfl/3')).json(); console.log('api pfl', JSON.stringify(api.pfl));
  await sleep(400);
  await fetch('http://localhost:8139/api/pfl/off'); await sleep(600);
  console.log('soloins after all off', JSON.stringify(await p.evaluate(() => get('ui.soloins'))));
  const sent = fs.readFileSync(rx, 'utf8').trim().split('\n').filter(l => / 25 /.test(l) || /AA .. 03 00 00 25/.test(l));
  console.log('button frames the Nova got:\n' + sent.join('\n'));
  await p.evaluate(() => go('home')); await sleep(400);
  await p.screenshot({ path: path.join(DIR, 'pfl-cart.png') });
  console.log('errors', errs);
  await b.close(); srv.kill(); fake.kill();
})().catch(e => { console.error(e); process.exit(1); });
