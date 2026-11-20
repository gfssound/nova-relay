const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const data = fs.mkdtempSync(path.join(DIR, 'nrhelp-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8146', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const posts = []; p.on('request', r => { if (r.url().includes('/manual')) posts.push(r.method() + ' ' + new URL(r.url()).pathname); });
  await p.goto('http://127.0.0.1:8146/'); await p.waitForFunction(() => cart.ready); await sleep(800);
  const pdf = await p.evaluate(async () => { const r = await fetch('/manual.pdf'); return r.status + ' ' + r.headers.get('content-type') + ' ' + (await r.arrayBuffer()).byteLength; });
  console.log('manual.pdf:', pdf);
  const get = await p.evaluate(async () => (await fetch('/manual/open')).status); console.log('GET /manual/open ->', get);
  const pop = p.waitForEvent('popup', { timeout: 4000 }).catch(() => null);
  /* Nov 19: Help moved from the header to Setup › Help */
  console.log('header Help button:', await p.locator('#status #helpBtn').count());
  await p.evaluate(() => { setupSec = 'help'; go('setup'); }); await sleep(300);
  await p.click('#helpBtn'); const w = await pop; await sleep(500);
  console.log('requests:', posts.join(', '), '| toast:', await p.locator('.toast').textContent().catch(() => ''), '| fallback window:', w ? (await w.waitForURL(/manual/, {timeout: 4000}).catch(() => {}), w.url().replace(/^https?:..[^/]+/, '')) : 'none');
  await p.evaluate(() => go('timecode')); await sleep(300);
  console.log('set field:', await p.locator('#f-tc-set').count(), '| hint:', (await p.locator('p.hint', { hasText: 'Aria link' }).textContent().catch(() => 'none')).slice(0, 80));
  await p.evaluate(() => openNextTakeModal('scene')); await sleep(200);
  console.log('note placeholder:', await p.getAttribute('.modal.nt input[aria-label="Next note"]', 'placeholder'));
  console.log('errors', errs); await b.close(); srv.kill(); fs.rmSync(data, { recursive: true, force: true }); })();
