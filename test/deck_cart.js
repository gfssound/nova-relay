const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const data = fs.mkdtempSync(path.join(DIR, 'nrdeck-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8152', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8152/'); await p.waitForFunction(() => cart.ready); await sleep(500);
  await p.evaluate(() => { setupSec = 'deck'; go('setup'); }); await sleep(300);
  console.log('cart urls:', JSON.stringify(await p.evaluate(() => cart.urls)));
  console.log('first address:', await p.textContent('.deckrow .deckurl'), '| step 4 address:', await p.textContent('.decksteps .urlrow code'));
  console.log('local-only note:', await p.locator('.panel p', { hasText: 'Only this computer' }).count());
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('.decksteps a.btn').click()]);
  const f = path.join(DIR, 'dl.streamDeckPlugin'); await dl.saveAs(f);
  console.log('download:', dl.suggestedFilename(), fs.statSync(f).size, 'bytes');
  const r = await p.evaluate(async () => (await fetch('/api/arm/3')).json()); console.log('api via copied address works:', r.ok, '| status has tracks:', Array.isArray(r.tracks), r.version);
  console.log('errors', errs); fs.unlinkSync(f); await b.close(); srv.kill(); fs.rmSync(data, { recursive: true });
})();
