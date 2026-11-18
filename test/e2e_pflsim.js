const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const ROOT = path.join(__dirname, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8140', '--no-open', '--data', data]); await sleep(800);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8140/'); await p.waitForFunction(() => cart.ready); await p.evaluate(() => go('home')); await sleep(400);
  await p.evaluate(() => document.querySelectorAll('.strip .pflb:not(.nofader)')[1].click()); await sleep(500);
  console.log('sim soloins', JSON.stringify(await p.evaluate(() => get('ui.soloins'))), 'lit', await p.evaluate(() => document.querySelectorAll('.pflb.on').length));
  await p.screenshot({ path: path.join(__dirname, 'pfl-cart-phone.png') }); console.log(errs); await b.close(); srv.kill();
})();
