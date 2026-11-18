/* Nov 18 (Ferris: "Let's work on 1, 2, 3"): diagnostics against a fake Nova 1 (fw 5.23) replaying the direct capture.
   1. Session 1 keeps a snapshot of the Nova's settings. Three of them are then made different in the snapshot (as if
      the Nova had been changed while Nova Relay was off); session 2 lists exactly those in the Link log, readably,
      and the page shows a notice.
   2. Save the last 10 minutes, with a note, after closing and re-opening the port: one file with both port sessions,
      the hellos and the Nova's bytes, the Link log's events and the note.
   3. The problem report: a zip with the report, the Link log, the last 30 minutes, the saved capture and the data files. */
const { spawn, execFileSync } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const http = require('http');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
const PORT = 8341, W = fs.mkdtempSync(path.join(DIR, 'dg-')), DATA = path.join(W, 'data');
const getBuf = p => new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: p }, r => { const c = []; r.on('data', d => c.push(d)); r.on('end', () => res({ status: r.statusCode, headers: r.headers, body: Buffer.concat(c) })); }).on('error', rej));
async function session(label, fn) {
  const got = path.join(W, `fake-${label}.txt`);
  const fake = spawn('python3', [path.join(DIR, 'fake_nova523.py'), path.join(ROOT, 'cap/direct1_conv.log'), got, '120'], { env: { ...process.env, DELAY: '1' } });
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', String(PORT), '--no-open', '--data', DATA], { env: { ...process.env, NOVA_REMOTE_TRY: pty }, stdio: 'ignore' });
  await sleep(1000);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const toasts = []; await p.exposeFunction('__toast', t => toasts.push(t));
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.waitForFunction(() => cart.ready);
  await p.evaluate(() => { window.__L = []; logSubs.add(e => __L.push(e.line)); const t = window.toast; window.toast = (m, u) => { __toast(String(m)); return t(m, u); }; });
  await p.waitForFunction(() => cart.nova && cart.nova.connected && !cart.nova.loading, null, { timeout: 40000 });
  await sleep(1500);
  try { await fn({ p, pty, fake, toasts, log: () => p.evaluate(() => __L.join('\n')) }); }
  finally { await b.close(); srv.kill(); fake.kill(); await sleep(400); }
}
(async () => {
  console.log('session 1');
  await session('1', async ({ log }) => {
    const l = await log(); check(!/Since the last session/.test(l), 'first session: nothing to compare yet');
  });
  const snapF = path.join(DATA, 'nova-snapshot.json'); const snap = JSON.parse(fs.readFileSync(snapF, 'utf8'));
  check(snap.values && Object.keys(snap.values).length >= 20, `a snapshot of ${Object.keys(snap.values || {}).length} settings was kept (${snap.model})`);
  /* make three settings different "last time" */
  const v = snap.values, changes = [];
  if (Array.isArray(v['hpmix.tracks'])) { v['hpmix.tracks'][1][2] = v['hpmix.tracks'][1][2] === 3 ? 0 : 3; changes.push('Headphones 2'); }
  if (Array.isArray(v['track.name'])) { v['track.name'][2] = 'OLD99'; changes.push('Track name'); }
  if (Array.isArray(v['trackmix.matrix'])) { const c = v['trackmix.matrix'][0][4]; c[16] = c[16] ? 0 : 3; changes.push('Track routing'); }
  fs.writeFileSync(snapF, JSON.stringify(snap));
  console.log('   made different in the snapshot:', changes.join(', '));

  console.log('session 2');
  await session('2', async ({ p, pty, fake, toasts, log }) => {
    const l = await log();
    const lines = l.split('\n').filter(x => /Since the last session|•/.test(x));
    lines.forEach(x => console.log('     ', x.replace(/^\S+\s+EV\s+/, '').slice(0, 160)));
    check(new RegExp(`Since the last session .*, ${changes.length} of the Nova's settings are different`).test(l), `the Link log says ${changes.length} settings are different`);
    check(/Headphones 2.*track 3: .* → /.test(l), 'readable headphone line (Headphones 2 … track 3: x → y)');
    check(/Track name, track 3: "OLD99" \u2192 "/.test(l), 'readable name line (Track name, track 3: "OLD99" → …)');
    check(/Track routing, preset 1: track 5 from RX 3: /.test(l), 'readable routing line (Track routing, preset 1: track 5 from RX 3: …)');
    check(toasts.some(t => new RegExp(`${changes.length} of the Nova's settings are different from the last session`).test(t)), 'the page shows a notice');

    /* 2. a dropout (the Nova stops answering for 6 s), then save */
    fake.kill('SIGSTOP'); await sleep(6000); fake.kill('SIGCONT');
    await p.waitForFunction(() => cart.nova && cart.nova.connected && !cart.nova.loading, null, { timeout: 40000 }); await sleep(1500);
    await p.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(400);
    await p.fill('input[aria-label=Note]', 'HP routing changed as it connected');
    await p.locator('button', { hasText: /^Save$/ }).click();
    await p.waitForFunction(() => diagSaved.length > 0, null, { timeout: 5000 }).catch(() => { });
    const saved = await p.evaluate(() => diagSaved[0]);
    check(saved && /^saved-capture-/.test(saved.name), `saved (${saved && saved.name})`);
    const f = path.join(DATA, 'saved-captures', saved.name), t = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
    check(/# Note: HP routing changed as it connected/.test(t), 'the note is in the file');
    check(/port .* opened at 38400/.test(t) && /LOG ER .*no answer from the Nova for 4 seconds/.test(t) && t.indexOf('no answer from the Nova') < t.lastIndexOf(' RAW AA '), 'from the port opening, through the dropout, to after it');
    check(/ TX AA .* 20 50 43 6E 6F 76 61 54/.test(t) && / RAW AA /.test(t), 'hellos sent and the Nova\'s bytes');
    check(/LOG EV .*settings are read/.test(t) && /LOG EV .*Since the last session/.test(t), 'the Link log\'s events are in it too');
    const dl = await getBuf('/api/capture/saved/' + saved.name);
    check(dl.status === 200 && /attachment/.test(dl.headers['content-disposition'] || ''), 'it downloads from the page\'s Download link');

    /* 3. problem report */
    const rep = await getBuf('/api/problem-report?who=test');
    const zf = path.join(W, 'report.zip'); fs.writeFileSync(zf, rep.body);
    const list = execFileSync('unzip', ['-Z1', zf]).toString().split('\n').filter(Boolean);
    console.log('     report:', list.join(', '));
    for (const need of ['report.txt', 'link-log.txt', 'capture-last-30-minutes.log', 'saved-captures/' + saved.name, 'data/state.json', 'data/nova-link.json', 'data/nova-snapshot.json'])
      check(list.includes(need), `the report has ${need}`);
    const rt = execFileSync('unzip', ['-p', zf, 'report.txt']).toString();
    check(/Nova Relay 0\.\d+\.\d+ · Node\.js/.test(rt) && /^Nova link: connected/m.test(rt) && new RegExp(`Since the last session, at the connect of .*: ${changes.length} settings different`).test(rt), 'report.txt: versions, the Nova, the differences');
    console.log(rt.split('\n').slice(0, 18).map(x => '        ' + x).join('\n'));
    check(execFileSync('unzip', ['-tq', zf]).toString().includes('No errors'), 'the zip checks out');
  });
  fs.rmSync(W, { recursive: true, force: true });
  console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
