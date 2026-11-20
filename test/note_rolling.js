/* Nov 20: Ferris: "Relay doesn't seem to send note to current take while recording". Replays live session 3 (takes 073-077),
   adds a note through the API while the Nova is recording, and lists every message the cart sent the fake Nova. */
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = +(process.env.PORT || 8161);
(async () => {
  const sent = path.join(DIR, 'note_rolling_sent.txt');
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/live3_conv.log'), sent, '75', '12']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrnote-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', String(PORT), '--no-open', '--data', data]);
  let slog = ''; srv.stdout.on('data', d => slog += d); srv.stderr.on('data', d => slog += d);
  await sleep(1200);
  const api = async p => (await fetch(`http://127.0.0.1:${PORT}${p}`)).json().catch(() => ({}));
  /* connect through the WebSocket-free route the page uses: POST /api/connect isn't there, so use the page's own call */
  const { chromium } = require('playwright'); const b = await chromium.launch(); const pg = await b.newPage();
  await pg.goto(`http://127.0.0.1:${PORT}/`); await pg.waitForFunction(() => cart.ready);
  await pg.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(300);
  await pg.evaluate(p => { const s = document.getElementById('f-serial-port'); s.append(new Option(p, p)); s.value = p; }, pty);
  await pg.locator('button', { hasText: 'Connect' }).first().click();
  let noted = 0, t0 = Date.now(), marks = [];
  while (Date.now() - t0 < 70000 && noted < 2) {
    await sleep(400);
    const s = await api('/api/status');
    if (s.recording) {
      const r = await api('/api/note/text/' + encodeURIComponent('ROLLING NOTE ' + (noted + 1)));
      marks.push(`${((Date.now() - t0) / 1000).toFixed(1)} s: note sent while recording (api ok=${r.ok})`);
      noted++;
      while ((await api('/api/status')).recording && Date.now() - t0 < 70000) await sleep(300);
      marks.push(`${((Date.now() - t0) / 1000).toFixed(1)} s: recording stopped`);
    }
  }
  await sleep(2500);
  const st = await api('/api/status');
  console.log(marks.join('\n'));
  console.log('Relay now shows: current note =', JSON.stringify(st.noteCurrent), ' last take =', JSON.stringify(st.lastTake));
  const lines = fs.readFileSync(sent, 'utf8').trim().split('\n');
  const sets = lines.map(l => l.split(' ')).filter(a => a[6] === '55').map(a => ({ t: a[0], id: parseInt(a[7], 16) | (parseInt(a[8], 16) << 8), hex: a.slice(1).join(' ') }));
  console.log('messages sent to the Nova:', lines.length, '· setting writes:', sets.length);
  const ascii = h => h.split(' ').map(x => parseInt(x, 16)).map(c => c >= 32 && c < 127 ? String.fromCharCode(c) : '.').join('');
  for (const s of sets) console.log('  ', s.t, 'id', s.id, ascii(s.hex).slice(10, 70));
  console.log('server:', slog.split('\n').filter(l => /METADATA_HISTORY|Note /.test(l)).join('\n'));
  const got = [1, 2].map(n => sets.some(x => x.id === 58 && ascii(x.hex).includes('ROLLING NOTE ' + n)));
  console.log(got.every(Boolean) && sets.every(x => x.id === 58) ? 'PASS: both notes went to the Nova as take-list edits, and nothing else was written' : 'FAIL: notes reached the Nova: ' + got.join(', '));
  await b.close(); srv.kill(); fake.kill(); await sleep(400); fs.rmSync(data, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
