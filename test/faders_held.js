/* Nov 14 (0.6.1): faders are held back from the shipped build: no Setup switch or note, no caps, /api/fader refused. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const got = path.join(DIR, 'fake_fh.txt'); try { fs.unlinkSync(got); } catch (_) {}
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/direct1_conv.log'), got, '100', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrfh-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8201', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8201/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(pt => net.send({ t: 'serialOpen', path: pt, baud: 38400, parity: 'odd', listen: false }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 40000 }); await sleep(2000);
  await p.evaluate(() => { setupSec = 'meters'; go('setup'); }); await sleep(300);
  console.log('Setup › Meters mentions faders:', await p.evaluate(() => /Fader/i.test(document.querySelector('.secsplit').innerText)));
  await p.evaluate(() => { set('ui.meters.faders', [], 1); set('record.tracks', [3], 1, 'local'); go('home'); }); await sleep(800);
  console.log('caps visible even when forced on:', await p.evaluate(() => document.querySelectorAll('.fcap:not([hidden])').length));
  console.log('/api/fader:', await p.evaluate(async () => { const r = await fetch('/api/fader/15/set/100'); return r.status + ' ' + (await r.json()).error; }));
  console.log('/api/help lists fader:', await p.evaluate(async () => Object.keys((await (await fetch('/api/help')).json()).endpoints).some(k => k.startsWith('/api/fader'))));
  await p.evaluate(() => set('ui.faderpos', [14], 99)); await sleep(500);
  console.log('a stray fader set comes back as:', await p.evaluate(() => (get('ui.faderpos') || [])[14]));
  await b.close(); srv.kill(); fake.kill(); await sleep(300);
  console.log('fader frames sent:', fs.readFileSync(got, 'utf8').split('\n').filter(l => / 00 22 /.test(l)).length);
  console.log('errors:', errs.length ? errs : 'none'); fs.rmSync(data, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
