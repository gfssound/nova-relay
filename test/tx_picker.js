/* Nov 14 (0.6.1): per-transmitter power (cQRXTX 98 with unit = ZaxNet ID) and the picker in the test panel. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const got = path.join(DIR, 'fake_txp.txt'); try { fs.unlinkSync(got); } catch (_) {}
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/direct1_conv.log'), got, '100', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrtx-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8197', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8197/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(pt => net.send({ t: 'serialOpen', path: pt, baud: 38400, parity: 'odd', listen: false }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 40000 }); await sleep(2500);
  await p.evaluate(() => go('setup')); await sleep(250);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,.seltab,.tab,a')].find(e => /Cart & Recorder Link/.test(e.textContent || '')); if (x) x.click(); }); await sleep(500);
  const opts = await p.evaluate(() => { const s = document.querySelector('select[aria-label="Which transmitter"]'); return s ? [...s.options].map(o => o.value + '=' + o.textContent) : null; });
  console.log('picker:', JSON.stringify(opts));
  // arm, pick Z3, press Wake through the UI
  await p.evaluate(() => { const c = document.getElementById('f-test-arm'); c.checked = true; c.dispatchEvent(new Event('change')); }); await sleep(200);
  const picked = await p.evaluate(() => { const s = document.querySelector('select[aria-label="Which transmitter"]'); if (![...s.options].some(o => o.value === '3')) return false; s.value = '3'; return true; });
  console.log('picked Z3:', picked);
  await p.evaluate(() => { const pn = [...document.querySelectorAll('.panel h3')].find(e => /Protocol test tools/.test(e.textContent)).closest('.panel'); [...pn.querySelectorAll('button')].find(x => x.textContent === 'Wake').click(); }); await sleep(1800);
  const api = async u => p.evaluate(async u => { const r = await fetch(u, { method: 'POST' }); return r.status + ' ' + JSON.stringify((await r.json()).error || 'ok'); }, u);
  console.log('power/low (all):', await api('/api/test/power/low')); await sleep(1700);
  console.log('power/on/31 (want 400):', await api('/api/test/power/on/31')); await sleep(300);
  await b.close(); srv.kill(); fake.kill(); await sleep(300);
  const fr = fs.readFileSync(got, 'utf8').split('\n').filter(l => / 00 50 98 /.test(l)).map(l => l.trim().split(' ').slice(1).slice(6, 11).join(' '));
  console.log('98 frames the Nova got:', JSON.stringify(fr));
  console.log('errors:', errs.length ? errs : 'none'); fs.rmSync(data, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
