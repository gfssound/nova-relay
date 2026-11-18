const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/live22_conv.log'), path.join(DIR, 'fake_fill.txt'), '20', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrfill-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8146', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8146/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(300);
  await p.evaluate(path => { const s = document.getElementById('f-serial-port'); s.append(new Option(path, path)); s.value = path; }, pty);
  await p.locator('button', { hasText: 'Connect' }).first().click(); await sleep(6000);
  console.log(JSON.stringify(await p.evaluate(() => ({
    pill: document.getElementById('linkText').textContent, tc: document.getElementById('tc').textContent,
    names: V['track.name'].join(','), routes: V['trackmix.matrix'].flat(3).filter(Boolean).length,
    history: V['metadata.history'].filter(Boolean).length, scene: V['scene.current'] + '/' + V['take.current'],
    inputs: [14, 15, 16, 0].map(inFull) }))));
  await p.evaluate(() => go('home')); await sleep(500); await p.screenshot({ path: path.join(DIR, 'fill-home.png') });
  await b.close(); srv.kill(); fake.kill(); fs.rmSync(data, { recursive: true }); console.log('errors', errs);
})().catch(e => { console.error(e); process.exit(1); });
