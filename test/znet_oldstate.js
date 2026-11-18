// A setup saved before 0.4.22 (no ui.znettrim / ui.znetsrc in state.json): does the ZNet trim tile still show a typed value?
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'zold-'));
  let srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8163', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); let p = await b.newPage({ viewport: { width: 1280, height: 860 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8163/'); await p.waitForFunction(() => cart.ready); await sleep(1500); await p.close();
  srv.kill(); await sleep(800);
  const f = path.join(data, 'state.json'), st = JSON.parse(fs.readFileSync(f, 'utf8'));
  const V = st.V || st; console.log('keys in state:', Object.keys(st).slice(0, 5), 'has znettrim:', 'ui.znettrim' in V);
  delete V['ui.znettrim']; delete V['ui.znetsrc']; fs.writeFileSync(f, JSON.stringify(st));
  srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8163', '--no-open', '--data', data]); await sleep(900);
  p = await b.newPage({ viewport: { width: 1280, height: 860 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8163/'); await p.waitForFunction(() => cart.ready); await sleep(1000);
  console.log('client znettrim:', await p.evaluate(() => JSON.stringify(get('ui.znettrim'))));
  await p.evaluate(() => { go('inputs'); set('input.channel', [], 18, 'local'); }); await sleep(300);
  await p.locator('.vtile[data-key="ui.znettrim|3"]').click(); await sleep(150);
  const inp = p.locator('.editbar:not([hidden]) input'); await inp.fill('24'); await inp.press('Enter'); await sleep(500);
  console.log('tile now:', (await p.locator('.vtile[data-key="ui.znettrim|3"]').innerText()).replace(/\s+/g, ' '), '| client:', await p.evaluate(() => JSON.stringify(get('ui.znettrim'))));
  // with the on-screen keyboard
  await p.evaluate(() => set('ui.osk', [], 1)); await sleep(200);
  await p.locator('.vtile[data-key="ui.znettrim|3"]').click(); await sleep(200);
  const inp2 = p.locator('.editbar:not([hidden]) input'); await inp2.focus(); await sleep(300);
  console.log('osk open:', await p.evaluate(() => OSK.open), 'num pad:', await p.evaluate(() => document.querySelector('.osk')?.classList.contains('oknum')));
  const key = async k => { await p.locator(`.osk [data-k="${k}"]`).first().dispatchEvent('pointerdown'); await p.evaluate(() => dispatchEvent(new PointerEvent('pointerup'))); };
  for (const k of ['⌫', '⌫', '3', '1', 'Done']) await key(k); await sleep(500);
  console.log('RX4 tile after OSK:', (await p.locator('.vtile[data-key="ui.znettrim|3"]').innerText()).replace(/\s+/g, ' '), '| client:', await p.evaluate(() => JSON.stringify(get('ui.znettrim'))));
  console.log('errors', errs); await b.close(); srv.kill();
})();
