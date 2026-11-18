/* Nov 13 (Ferris: "a track will be labeled PFL when it's not, and it inverts itself"):
   1. a saved layout where two inputs claim one Aria page button is cleaned up on load;
   2. on a live replay, the remote's PFL key and the Aria's own PFL press land on the same input;
   3. holding a PFL key corrects its light without sending anything. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'), os = require('os');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-'));
  // RX 2 (15) and AES 1 (6) both on page button 0x71 (fader 2): the bug's state. RX 3 (16) on 0x72 alone.
  fs.writeFileSync(path.join(data, 'nova-link.json'), JSON.stringify({ hello: null, port: null, pages: { 6: 0x71, 15: 0x71, 16: 0x72 } }));
  const got = path.join(DIR, 'fake_pp.txt'); try { fs.unlinkSync(got); } catch (_) { }
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/live3_conv.log'), got, '100', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8169', '--no-open', '--data', data]);
  let out = ''; srv.stdout.on('data', d => out += d); await sleep(1200);
  console.log('on load:', (out.match(/Forgot.*/) || ['(nothing)'])[0]);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8169/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd', listen: false }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 40000 }); await sleep(2000);
  const map = await p.evaluate(() => { const m = get('ui.pflmap') || []; return m.map((f, ch) => f ? `${inLabel(ch)}→F${f}` : null).filter(Boolean).join(' '); });
  console.log('fader map now:', map);
  const lit = () => p.evaluate(() => (get('ui.soloins') || []).map(c => inLabel(c)).join(',') || 'none');
  // remote PFL on RX 3 (fader 3), then hold-to-correct on it
  await p.evaluate(() => link.send({ op: 'CMD', name: 'PFL 17' })); await sleep(700);
  console.log('remote PFL RX 3 -> lit:', await lit());
  const sent = fs.readFileSync(got, 'utf8').split('\n').filter(l => / 00 25 52 00/.test(l)).length;
  console.log('  Nova got fader-3 PFL presses:', sent);
  await p.evaluate(() => link.send({ op: 'CMD', name: 'PFL FIX 17' })); await sleep(500);
  const after = fs.readFileSync(got, 'utf8').split('\n').filter(l => / 00 25 /.test(l)).length;
  console.log('hold-to-correct RX 3 -> lit:', await lit(), '| presses sent in total:', after, '(no new ones)');
  // the meters' PFL key: hold 1 s on a strip with PFL shows the toast and sends no press
  await p.evaluate(() => go('home')); await sleep(400);
  const key = p.locator('.strip .pflb:not(.nofader)').first();
  if (await key.count()) { const bb = await key.boundingBox(); await p.mouse.move(bb.x + 5, bb.y + 5); await p.mouse.down(); await sleep(1000); await p.mouse.up(); await sleep(400);
    console.log('held a meter PFL key -> toast:', await p.evaluate(() => document.querySelector('.toast')?.textContent), '| presses sent:', fs.readFileSync(got, 'utf8').split('\n').filter(l => / 00 25 /.test(l)).length); }
  await b.close(); srv.kill(); fake.kill();
  console.log('saved pages now:', JSON.stringify(JSON.parse(fs.readFileSync(path.join(data, 'nova-link.json'), 'utf8')).pages));
  console.log('errors:', errs.length ? errs : 'none'); fs.rmSync(data, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
