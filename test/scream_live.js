/* Nov 12: Scream trim in the installed app on a replay of Ferris's direct capture (RX 4 = ZaxNet ID 3, RX 1 = 12):
   Meters button on, button address off; address on, button off; what reaches the Nova each time; the Stream Deck key. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'), os = require('os');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const got = path.join(DIR, 'fake_sc.txt'); try { fs.unlinkSync(got); } catch (_) { }
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/direct1_conv.log'), got, '100', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8167', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 600 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const p2 = await b.newPage({ viewport: { width: 390, height: 844 } }); p2.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8167/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd', listen: false }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 40000 }); await sleep(2500);
  await p2.goto('http://127.0.0.1:8167/'); await p2.waitForFunction(() => cart.ready); await sleep(800);
  const api = async u => p.evaluate(async u => { const r = await fetch(u); const j = await r.json(); return r.status + ' ' + (j.error || JSON.stringify(j.scream)); }, u);
  console.log('no RX chosen:', await api('/api/scream'));
  // set up from the page: RX 1 and RX 4, level 12; known trims 25 / 30
  await p.evaluate(() => { set('ui.znettrim', [0], 25); set('ui.znettrim', [3], 30); set('ui.scream.rx', [], [1,0,0,1,0,0,0,0]); set('ui.scream.level', [], 12); }); await sleep(600);
  const trims = pg => pg.evaluate(() => JSON.stringify((get('ui.znettrim') || []).slice(0, 4)));
  await p.evaluate(() => go('home')); await sleep(300);
  await p.evaluate(() => screamToggle()); await sleep(700);   /* Nov 15: no Meters button for now; same toggle */
  console.log('toggle on -> cart:', JSON.stringify((await (await fetch('http://127.0.0.1:8167/api/status')).json()).scream), '| phone sees', await trims(p2), '| phone state', await p2.evaluate(() => String(!!(get('ui.scream.state') || {}).on)));
  console.log('address off:', await api('/api/scream/off')); await sleep(600);
  console.log('  trims now', await trims(p), '| page state', await p.evaluate(() => String(!!(get('ui.scream.state') || {}).on)));
  console.log('address on:', await api('/api/scream/on')); await sleep(600);
  console.log('  trims now', await trims(p));
  await p2.evaluate(() => go('home')); await sleep(300); await p2.evaluate(() => screamToggle()); await sleep(700);
  console.log('phone toggle off -> trims', await trims(p), '| cart', JSON.stringify((await (await fetch('http://127.0.0.1:8167/api/status')).json()).scream));
  await b.close(); srv.kill(); fake.kill(); await sleep(300);
  const sent = fs.readFileSync(got, 'utf8').split('\n').filter(l => / 00 50 81 /.test(l));
  console.log('CMD 50 81 the Nova got:'); sent.forEach(l => { const by = l.split(' ').slice(1); console.log('   ID', parseInt(by[8], 16), '-> trim', parseInt(by[10], 16) / 4); });
  console.log('errors:', errs.length ? errs : 'none'); fs.rmSync(data, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
