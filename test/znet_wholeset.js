// Nov 12 (Ferris's photo: "ZNet trim — FROM REMOTE"): a ZNet trim set from the Stream Deck / button API (the server
// sends the whole 8-value list) must show on every screen, and so must one reported by the Nova.
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'zws-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8164', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8164/'); await p.waitForFunction(() => cart.ready); await sleep(800);
  await p.evaluate(() => { go('inputs'); set('input.channel', [], 16, 'local'); }); await sleep(300);
  const tile = async () => (await p.locator('.vtile[data-key="ui.znettrim|1"]').innerText()).replace(/\s+/g, ' ');
  const r = await p.evaluate(async () => (await fetch('/api/znet/2/set/30')).status); await sleep(500);
  console.log('API set RX2 30 ->', r, '| tile:', await tile(), '| client:', await p.evaluate(() => JSON.stringify(get('ui.znettrim'))));
  await p.evaluate(async () => fetch('/api/znet/2/up/2')); await sleep(500);
  console.log('API up 2 -> tile:', await tile());
  // a Menu setting sent as a whole list must not collapse either
  const menuOk = await p.evaluate(() => { const k = Object.keys(S).find(k => S[k].t === 'Menu' && S[k].d && S[k].d.length === 1 && !S[k].local); const before = JSON.stringify(get(k)); const arr = (get(k) || []).slice(); set(k, [], arr, 'remote'); return [k, before === JSON.stringify(get(k))]; });
  console.log('Menu whole-list unchanged:', JSON.stringify(menuOk));
  console.log('errors', errs); await b.close(); srv.kill();
})();
