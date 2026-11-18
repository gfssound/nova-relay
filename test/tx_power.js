/* Nov 15: Setup › Transmitters (transmitter power for all transmitters and one by ZaxNet ID) against a replayed Nova:
   All takes a second tap; a receiver's row sends at once with its ZaxNet ID; /api/tx/power works; what the Nova gets.
   Also: the installed page blocks pinch / trackpad zoom and double-tap zoom. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails++; };
(async () => {
  const got = path.join(DIR, 'fake_txpw.txt'); try { fs.unlinkSync(got); } catch (_) {}
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/direct1_conv.log'), got, '100', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrtxp-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8261', '--no-open', '--data', data, '--no-auto']); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8261/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(pt => net.send({ t: 'serialOpen', path: pt, baud: 38400, parity: 'odd', listen: false }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 40000 }); await sleep(3000);
  const frames = () => fs.readFileSync(got, 'utf8').split('\n').filter(l => / 00 50 98 /.test(l)).map(l => l.trim().split(' ').slice(1).slice(6, 11).join(' '));
  /* Meters page: All TX, second tap confirms; the scream button is gone */
  await p.evaluate(() => go('home')); await sleep(400);
  check(await p.locator('.screambtn').count() === 0, 'Meters page: no scream button');
  const all = p.locator('.txall');
  await all.locator('button', { hasText: /^Low$/ }).click(); await sleep(400);
  check(frames().length === 0 && await all.locator('button', { hasText: 'Tap again: Low' }).count() === 1, 'Meters page All TX: the first tap only arms ("Tap again: Low"), nothing sent');
  await all.locator('button', { hasText: 'Tap again: Low' }).click(); await sleep(700);
  check(JSON.stringify(frames()) === '["98 01 00 00 02"]', `second tap sends power ALL = Low: ${JSON.stringify(frames())}`);
  /* an RX input's page: TX power for that transmitter, one tap */
  await p.evaluate(() => { go('inputs'); set('input.channel', [], 15, 'local'); }); await sleep(600);
  const tile = p.locator('.txtile').first(); const zid = await p.evaluate(() => rxZid(0));
  check(await p.locator('.txtile').count() >= 1 && /TX power/i.test(await tile.innerText()), `RX 1's page has TX power (ZaxNet ${zid})`);
  const before = frames().length;
  await tile.locator('button', { hasText: /^Wake$/ }).click(); await sleep(400);
  check(frames().length === before && await tile.locator('button', { hasText: 'Tap again: Wake' }).count() === 1, "RX 1's page: the first tap only arms (\"Tap again: Wake\"), nothing sent");
  await tile.locator('button', { hasText: 'Tap again: Wake' }).click(); await sleep(700);
  const want = `98 01 ${zid.toString(16).padStart(2, '0').toUpperCase()} 00 01`;
  check(frames().includes(want), `the second tap on RX 1's page sends to its ZaxNet ID ${zid}: ${want}`);
  await p.evaluate(() => { const a = (get('input.zaxnet.id') || []).slice(); a[14] = null; V['input.zaxnet.id'] = a; notify('input.zaxnet.id', []); }); await sleep(200);
  check(await p.locator('.txtile').first().locator('button').first().isDisabled(), 'no known ZaxNet ID: the buttons are off');
  await p.evaluate(() => { set('input.channel', [], 1, 'local'); }); await sleep(400);
  check(await p.locator('.txtile').count() === 0, 'an analog input has no TX power');
  await p.evaluate(() => { setupSec = 'rec'; go('setup'); }); await sleep(300);
  check(!(await p.evaluate(() => [...document.querySelectorAll('.secbtn')].some(b => /Transmitters/.test(b.textContent)))), 'Setup has no Transmitters section any more');
  const api = async u => p.evaluate(async u => { const r = await fetch(u); return r.status; }, u);
  check(await api('/api/tx/power/on') === 200, '/api/tx/power/on answers 200'); await sleep(600);
  check(await api('/api/tx/power/low/3') === 200, '/api/tx/power/low/3 answers 200'); await sleep(600);
  check(await api('/api/tx/power/on/31') === 409 && await api('/api/tx/power/max') === 400, 'bad ZaxNet ID or state refused');
  await sleep(500);
  const f = frames(); check(f.includes('98 01 00 00 00') && f.includes('98 01 03 00 02'), `the API's frames reached the Nova: ${JSON.stringify(f)}`);
  /* zoom */
  const z = await p.evaluate(() => {
    const ev = (t, o) => { const e = new Event(t, { cancelable: true, ...o }); document.dispatchEvent(e); return e.defaultPrevented; };
    const w = new WheelEvent('wheel', { ctrlKey: true, cancelable: true, deltaY: -10 }); dispatchEvent(w);
    return { touch: getComputedStyle(document.documentElement).touchAction, gesture: ev('gesturestart'), wheel: w.defaultPrevented,
      viewport: document.querySelector('meta[name=viewport]').content };
  });
  check(z.touch === 'manipulation' && z.gesture && z.wheel && /maximum-scale=1/.test(z.viewport), `no zoom: touch-action ${z.touch}, pinch stopped ${z.gesture}, trackpad pinch stopped ${z.wheel}, viewport "${z.viewport}"`);
  /* phone width */
  const ph = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await ph.goto('http://127.0.0.1:8261/'); await ph.waitForFunction(() => cart.ready);
  await ph.evaluate(() => go('home')); await sleep(500); await ph.screenshot({ path: path.join(DIR, 'deck/tx_phone_home.png') });
  await ph.evaluate(() => { go('inputs'); set('input.channel', [], 15, 'local'); }); await sleep(600);
  check(!(await ph.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'phone: no sideways scrolling');
  await ph.screenshot({ path: path.join(DIR, 'deck/tx_phone.png') });
  await p.evaluate(() => go('home')); await sleep(400); await p.screenshot({ path: path.join(DIR, 'deck/tx_desk_home.png') });
  await p.evaluate(() => { go('inputs'); set('input.channel', [], 16, 'local'); }); await sleep(600); await p.screenshot({ path: path.join(DIR, 'deck/tx_desk.png') });
  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' / ') : ''));
  await b.close(); srv.kill(); fake.kill(); await sleep(300); fs.rmSync(data, { recursive: true, force: true });
  console.log(fails ? `${fails} problem(s)` : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
