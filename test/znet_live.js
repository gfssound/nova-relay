/* Nov 10: ZNet trim from the Inputs page and /api/znet, on a replay of Ferris's direct capture (RX 4 = ZaxNet ID 3). */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const got = path.join(DIR, 'fake_zn.txt'); try { fs.unlinkSync(got); } catch (_) { }
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/direct1_conv.log'), got, '100', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrzn-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8162', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8162/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd', listen: false }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 40000 }); await sleep(2500);
  const api = async u => p.evaluate(async u => { const r = await fetch(u); return r.status + ' ' + JSON.stringify((await r.json()).error || 'ok'); }, u);
  console.log('ZaxNet IDs RX1-8:', await p.evaluate(() => JSON.stringify((get('input.zaxnet.id') || []).slice(14, 22))));
  console.log('unknown up:', await api('/api/znet/4/up'));
  // Inputs page: RX 4, type 24, then three quick + taps (one message expected for them)
  await p.evaluate(() => { go('inputs'); set('input.channel', [], 18, 'local'); }); await sleep(300);
  await p.locator('.vtile[data-key="ui.znettrim|3"]').click(); await sleep(150);
  const inp = p.locator('.editbar:not([hidden]) input'); await inp.fill('24'); await inp.press('Enter'); await sleep(400);
  const plus = p.locator('.editbar:not([hidden]) button[aria-label^="Raise"]');
  for (let k = 0; k < 3; k++) { await plus.click(); await sleep(30); }
  await sleep(500);
  console.log('tile now:', (await p.locator('.vtile[data-key="ui.znettrim|3"]').innerText()).replace(/\s+/g, ' '));
  console.log('api set 20:', await api('/api/znet/4/set/20')); await sleep(400);
  console.log('api up:', await api('/api/znet/4/up')); await sleep(400);
  console.log('status RX4:', await p.evaluate(async () => JSON.stringify((await (await fetch('/api/status')).json()).receivers[3])));
  await b.close(); srv.kill(); fake.kill(); await sleep(300);
  const sent = fs.readFileSync(got, 'utf8').split('\n').filter(l => / 00 50 81 /.test(l));
  console.log('CMD 50 81 the Nova got:'); sent.forEach(l => { const by = l.split(' ').slice(1); console.log('   ', by.slice(6, 11).join(' '), '-> trim', parseInt(by[10], 16) / 4); });
  console.log('errors:', errs.length ? errs : 'none'); fs.rmSync(data, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
