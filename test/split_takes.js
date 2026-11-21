/* Nov 20: Ferris: when a Nova file hits its size limit the Nova carries on in a new file named take "1a"; Relay's take
   list showed it as take 2. Replays the night of Nov 18-19 (three splits: INT01 1a, INT02 2a, INT03 1a) without meters,
   fast, and prints Relay's take list and sound report. */
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = +(process.env.PORT || 8163), SPEED = process.env.SPEED || '120';
(async () => {
  const sent = path.join(DIR, 'split_sent_' + PORT + '.txt');
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap1119/night_conv.log'), sent, String(30400 / +SPEED + 30), SPEED]);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrsplit-'));
  const srv = spawn('node', [process.env.SERVER || path.join(ROOT, 'nova-remote/server.js'), '--port', String(PORT), '--no-open', '--data', data]);
  let slog = ''; srv.stdout.on('data', d => slog += d); srv.stderr.on('data', d => slog += d);
  await sleep(1200);
  const { chromium } = require('playwright'); const b = await chromium.launch(); const pg = await b.newPage();
  await pg.goto(`http://127.0.0.1:${PORT}/`); await pg.waitForFunction(() => cart.ready);
  await pg.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(300);
  await pg.evaluate(p => { const s = document.getElementById('f-serial-port'); s.append(new Option(p, p)); s.value = p; }, pty);
  await pg.locator('button', { hasText: /^Connect$/ }).first().click();
  await new Promise(r => fake.on('exit', r));
  await sleep(1500);
  const rows = await pg.evaluate(() => (get('metadata.history') || []).filter(Boolean).map(r => `${String(r.seg + 1).padStart(3, '0')}  ${r.scene}/${r.take}${r.note ? '  note ' + r.note : ''}${r.split ? '  (split)' : ''}${r.dur != null ? '  ' + Math.round(r.dur) + ' s' : ''}`));
  console.log('Relay take list (newest first):'); for (const r of rows) console.log('  ', r);
  const csv = await pg.evaluate(async () => (await fetch('/api/report.csv')).text());
  console.log('sound report:'); for (const l of csv.trim().split('\r\n')) console.log('  ', l.slice(0, 140));
  const want = { '002': '1a', '005': '2a', '007': '1a' };
  const got = {}; for (const r of rows) got[r.slice(0, 3)] = r.split('/')[1].split(' ')[0];
  const ok = Object.entries(want).every(([f, t]) => got[f] === t);
  const notes = await pg.evaluate(() => Object.fromEntries((get('metadata.history') || []).filter(Boolean).map(r => [String(r.seg + 1).padStart(3, '0'), r.note || ''])));
  const nok = notes['002'] === 'ANNA + JASON' && notes['005'] === 'MATT + KRISTIN';
  console.log(ok ? 'PASS: split files 002, 005, 007 are 1a, 2a, 1a' : 'FAIL: split files show ' + JSON.stringify({ '002': got['002'], '005': got['005'], '007': got['007'] }));
  console.log(nok ? 'PASS: split files carry the note (002 ANNA + JASON, 005 MATT + KRISTIN)' : 'FAIL: notes ' + JSON.stringify(notes));
  await b.close(); srv.kill(); await sleep(400); fs.rmSync(data, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
