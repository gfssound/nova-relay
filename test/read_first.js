/* Nov 18 (Ferris: "Remote should always read current Nova settings first before anything else, never changing
   something on first connect"). Fake Nova 1 (fw 5.23) on a replay of the direct-cable capture.
   A. normal connect: the pill reads "Reading Nova n%" then "Nova"; the log says the settings are read and nothing
      but hellos was sent; a change after that goes to the Nova.
   B. MID (the Nova still counts the computer as connected: stream, no settings): a change made before the settings are
      read is refused, the control goes back, nothing reaches the Nova; after the reload the Nova's value shows.
   C. REC is never held back.
   D. the hello never switches away from NovaTouch's, even with no answer for 40 s (port open by hand).
   E. auto-connect with one port: stays open and picks up a Nova that answers late (after 25 s) without closing. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const SERVER = process.env.NR_SERVER || path.join(ROOT, 'nova-remote/server.js');
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
async function setup(port, env, secs, { auto = false, open = true } = {}) {
  const got = path.join(DIR, `fake_rf_${port}.txt`); try { fs.unlinkSync(got); } catch (_) { }
  const fake = spawn('python3', [path.join(DIR, 'fake_nova523.py'), path.join(ROOT, 'cap/direct1_conv.log'), got, String(secs)], { env: { ...process.env, ...env } });
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'rf-'));
  fs.writeFileSync(path.join(data, 'state.json'), JSON.stringify({ app: 'nova-remote', version: '0.6.4', saved: new Date().toISOString(), V: { 'track.name': Array(16).fill('').map((_, i) => 'OLD' + (i + 1)) } }));
  let log = '';
  const srv = spawn('node', [SERVER, '--port', String(port), '--no-open', '--data', data, ...(auto ? [] : ['--no-auto'])], { env: { ...process.env, ...(auto ? { NOVA_REMOTE_TRY: pty } : {}) } });
  srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage(); await p.goto(`http://127.0.0.1:${port}/`); await p.waitForFunction(() => cart.ready);
  await p.evaluate(() => { window.__L = []; logSubs.add(e => __L.push(e.line)); });
  if (open && !auto) await p.evaluate(pt => net.send({ t: 'serialOpen', path: pt, baud: 38400, parity: 'odd', listen: false }), pty);
  let pageLog = [];
  const sent = () => fs.readFileSync(got, 'utf8').split('\n').filter(l => l && !l.includes('#'));
  const notes = () => fs.readFileSync(got, 'utf8').split('\n').filter(l => l.includes('#'));
  const done = async () => { await b.close(); srv.kill(); fake.kill(); await sleep(300); fs.rmSync(data, { recursive: true, force: true }); };
  return { p, sent, notes, log: () => log + '\n' + pageLog.join('\n'), sync: async () => { try { pageLog = await p.evaluate(() => __L.slice()); } catch (_) { } }, done, t0: Date.now() };
}
const nonHello = lines => lines.filter(l => l.split(' ')[6] !== '20');
(async () => {
  if (!process.env.ONLY || process.env.ONLY.includes('A')) { console.log('A. normal connect');
    const s = await setup(8301, { DELAY: '2' }, 60); const pills = new Set();
    for (let i = 0; i < 60 && !(await s.p.evaluate(() => cart.nova && cart.nova.connected && !cart.nova.loading)); i++) { pills.add(await s.p.evaluate(() => $('linkText').textContent)); await sleep(150); }
    pills.add(await s.p.evaluate(() => $('linkText').textContent));
    console.log('   pill:', [...pills].join(' | ')); await s.sync(); s.log().split('\n').filter(l => /Nova link/.test(l)).forEach(l => console.log('     ', l.slice(0, 170)));
    await sleep(1500);
    await s.sync(); check(/settings are read \(\d+ settings\)\. Nothing was sent to it but hellos/.test(s.log()), 'log: "the Nova\'s settings are read … Nothing was sent to it but hellos"');
    check(nonHello(s.sent()).length === 0, 'nothing but hellos before any change');
    const name = await s.p.evaluate(() => get('track.name', [0])); check(name && !/^OLD/.test(name), `the Nova's name shows (track 1 = ${name})`);
    await s.p.evaluate(() => set('track.name', [1], 'AFTER')); await sleep(800);
    check(nonHello(s.sent()).some(l => l.includes('41 46 54 45 52')), 'a change after the settings are read goes to the Nova');
    await s.done(); }
  if (!process.env.ONLY || process.env.ONLY.includes('B')) { console.log('B. reconnect the Nova still counts as connected (stream, no settings)');
    const s = await setup(8302, { MID: '1', DELAY: '1' }, 60);
    await s.p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 20000 });
    const loading = await s.p.evaluate(() => !!cart.nova.loading); check(loading, 'connected, still marked reading');
    await s.p.evaluate(() => { set('track.name', [2], 'EARLY'); }); await sleep(600);
    const shown = await s.p.evaluate(() => get('track.name', [2]));
    check(shown !== 'EARLY', `the early change was put back on the page (track 3 = ${shown})`);
    await s.sync(); check(/Not sent, because Nova Relay is still reading the Nova's settings/.test(s.log()), 'log says why it wasn\'t sent');
    await s.p.waitForFunction(() => cart.nova && cart.nova.connected && !cart.nova.loading, null, { timeout: 30000 }).catch(() => { });
    await sleep(1000);
    check(!nonHello(s.sent()).length, `nothing but hellos reached the Nova (${nonHello(s.sent()).length} other)`);
    await s.sync(); s.log().split('\n').filter(l => /Nova link|Not sent/.test(l)).forEach(l => console.log('     ', l.slice(0, 170))); console.log('     fake:', s.notes().join(' | ').slice(0, 400));
    check(/reloading the Nova's setup/.test(s.log()) && /settings are read/.test(s.log()), 'it asked for the settings again and read them');
    await s.done(); }
  if (!process.env.ONLY || process.env.ONLY.includes('C')) { console.log('C. REC while the settings are being read');
    const s = await setup(8303, { MID: '1', DELAY: '1' }, 40);
    await s.p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 20000 });
    await s.p.evaluate(() => net.send({ t: 'cmd', name: 'RECORD' })); await sleep(800);
    check(nonHello(s.sent()).some(l => l.split(' ')[6] === '25'), 'REC went to the Nova (CMD 25)');
    await s.done(); }
  if (!process.env.ONLY || process.env.ONLY.includes('D')) { console.log('D. no answer for 40 s, port open by hand');
    const s = await setup(8304, { DELAY: '999' }, 50);
    await sleep(42000);
    const hellos = [...new Set(s.notes().filter(l => /hello as/.test(l)).map(l => l.replace(/^.*hello as /, '')))];
    check(hellos.length === 1 && /^PCnovaT/.test(hellos[0]), `only NovaTouch's hello (${hellos.join(', ')})`);
    await s.done(); }
  if (!process.env.ONLY || process.env.ONLY.includes('E')) { console.log('E. auto-connect, one port, the Nova answers after 25 s');
    const s = await setup(8305, { DELAY: '25' }, 70, { auto: true });
    const t0 = Date.now();
    await s.p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 60000 }).catch(() => { });
    const secs = (Date.now() - t0) / 1000;
    check(secs < 32, `connected after ${secs.toFixed(1)} s (the Nova answered at 25 s)`);
    await s.sync(); check(/keeps it open and keeps saying hello/.test(s.log()) && !/new computer: settings in.*\n.*new computer: settings in/.test(s.notes().join('\n')), 'the port stayed open (no close and reopen)');
    await s.done(); }
  console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
