/* Nov 14 (0.6.1): faders on the meters and /api/fader, on a replay of Ferris's direct capture (RX 1-8 on Aria faders 1-8). */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const got = path.join(DIR, 'fake_fd.txt'); try { fs.unlinkSync(got); } catch (_) {}
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/direct1_conv.log'), got, '100', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrfd-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8199', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const errs = [];
  const open = async vp => { const p = await b.newPage({ viewport: vp }); p.on('pageerror', e => errs.push(e.message)); await p.goto('http://127.0.0.1:8199/'); await p.waitForFunction(() => cart.ready); return p; };
  const p = await open({ width: 1280, height: 860 });
  // before a Nova: switch on, drag -> must snap back, nothing sent
  await p.evaluate(() => { set('ui.meters.faders', [], 1); go('home'); }); await sleep(600);
  console.log('caps with no Nova:', await p.evaluate(() => document.querySelectorAll('.fcap:not([hidden])').length));
  await p.evaluate(pt => net.send({ t: 'serialOpen', path: pt, baud: 38400, parity: 'odd', listen: false }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 40000 }); await sleep(2500);
  await p.evaluate(() => { set('record.tracks', [3], 1, 'local'); go('home'); }); await sleep(800);
  const caps = await p.evaluate(() => [...document.querySelectorAll('.fcap:not([hidden])')].map(c => c.title));
  console.log('caps with Nova:', caps.length, caps.slice(0, 3));
  const p2 = await open({ width: 390, height: 844 }); await p2.evaluate(() => { set('ui.meters.faders', [], 1); go('home'); }); await sleep(500);
  // drag the first cap up on the desktop
  const cap = p.locator('.fcap:not([hidden])').first(); const bb = await cap.boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down();
  for (let i = 1; i <= 12; i++) { await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2 - i * 15); await sleep(20); }
  await p.mouse.up(); await sleep(600);
  const st = async pg => pg.evaluate(() => JSON.stringify((get('ui.faderpos') || []).map((v, i) => v == null ? null : i + ':' + v).filter(Boolean)));
  console.log('after drag  desk:', await st(p), ' phone:', await st(p2));
  const api = async u => p.evaluate(async u => { const r = await fetch(u); const j = await r.json(); return r.status + ' ' + (j.error || 'ok'); }, u);
  const ch = await p.evaluate(() => (get('ui.faderpos') || []).findIndex(v => v != null)); const n = ch + 1;
  console.log(`up/8 in ${n}:`, await api(`/api/fader/${n}/up/8`)); await sleep(200);
  console.log('toggle (down):', await api(`/api/fader/${n}/toggle`)); await sleep(200);
  console.log('status:', await p.evaluate(async n => JSON.stringify(((await (await fetch('/api/status')).json()).inputs[n - 1])), n));
  console.log('toggle (back):', await api(`/api/fader/${n}/toggle`)); await sleep(200);
  console.log('Analog 1 (no fader):', await api('/api/fader/1/set/100'));
  console.log('RX 8 step, never set:', await api('/api/fader/22/up'));
  console.log('bad:', await api('/api/fader/30/set/1'));
  await b.close(); srv.kill(); fake.kill(); await sleep(300);
  const fr = fs.readFileSync(got, 'utf8').split('\n').filter(l => / 00 22 /.test(l)).map(l => l.trim().split(' ').slice(1).slice(6, 8).join(' '));
  console.log(`fader frames the Nova got: ${fr.length}  first ${fr[0]}  last 3 ${fr.slice(-3).join(' | ')}`);
  console.log('errors:', errs.length ? errs : 'none'); fs.rmSync(data, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
