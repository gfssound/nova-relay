/* Nov 7: replays live session 3 (five takes, 073-077, each with the Nova's record report) through Nova Remote and checks
   the file numbers, start timecodes, user bits and frame rate on the take list and in the sound report. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/live3_conv.log'), path.join(DIR, 'fake_rf.txt'), '75', '12']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrrf-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8157', '--no-open', '--data', data]); await sleep(900);
  let slog = ''; srv.stdout.on('data', d => slog += d);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8157/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(300);
  await p.evaluate(path => { const s = document.getElementById('f-serial-port'); s.append(new Option(path, path)); s.value = path; }, pty);
  await p.locator('button', { hasText: 'Connect' }).first().click();
  let sawFile = '';
  for (let i = 0; i < 70; i++) { await sleep(1000); const t = await p.evaluate(() => document.getElementById('stFile').hidden ? '' : document.getElementById('stFile').textContent); if (t && !sawFile.includes(t)) { sawFile += t + ' '; if (sawFile.split(' ').length === 2) await p.screenshot({ path: path.join(DIR, 'rf-recording.png'), clip: { x: 0, y: 40, width: 700, height: 100 } }); } }
  console.log('header showed while recording:', sawFile || 'nothing');
  await p.evaluate(() => go('meta')); await sleep(400);
  console.log('take list:'); for (const r of await p.locator('table.hist tbody tr').allInnerTexts()) console.log('  ', r.replace(/\s+/g, ' '));
  await p.screenshot({ path: path.join(DIR, 'rf-meta.png') });
  const csv = await p.evaluate(async () => (await fetch('/api/report.csv')).text());
  console.log('report rows:', csv.trim().split('\r\n').length - 1); console.log(csv.trim().split('\r\n').filter((l, i) => i === 0 || /,07[3-7],/.test(l)).join('\n'));
  console.log('server lines:', slog.split('\n').filter(l => /recording file/.test(l)).join('\n'));
  console.log('saved:', fs.existsSync(path.join(data, 'take-files.json')) ? Object.keys(JSON.parse(fs.readFileSync(path.join(data, 'take-files.json')))).join(', ') : 'no file');
  console.log('errors:', errs.length ? errs : 'none');
  srv.kill(); fake.kill(); await sleep(800);
  /* Restart Nova Remote with the same data folder: the take list comes back from the Nova's dump with its files' details. */
  const fake2 = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/live4_conv.log'), path.join(DIR, 'fake_rf2.txt'), '14', '1']);
  const pty2 = await new Promise(r => fake2.stdout.once('data', d => r(String(d).trim())));
  const srv2 = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8158', '--no-open', '--data', data]); await sleep(900);
  const p2 = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p2.goto('http://127.0.0.1:8158/'); await p2.waitForFunction(() => cart.ready);
  await p2.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(300);
  await p2.evaluate(path => { const s = document.getElementById('f-serial-port'); s.append(new Option(path, path)); s.value = path; }, pty2);
  await p2.locator('button', { hasText: 'Connect' }).first().click(); await sleep(9000);
  await p2.evaluate(() => go('meta')); await sleep(400);
  console.log('after restart:'); for (const r of (await p2.locator('table.hist tbody tr').allInnerTexts()).slice(0, 5)) console.log('  ', r.replace(/\s+/g, ' '));
  await b.close(); srv2.kill(); fake2.kill(); await sleep(500); fs.rmSync(data, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
