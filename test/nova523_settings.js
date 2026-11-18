/* Nov 14 (0.6.1 Pi bug): the Nova 1 (fw 5.23) sends its settings only to a computer it hasn't heard for 3+ s.
   Scenarios on fake_nova523.py: MID (a reconnect inside 3.5 s: stream, no settings) by hand, and a slow first answer
   (DELAY) found by auto-connect. Passes when the remote ends up with the Nova's settings (track names). */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = (port, p) => new Promise((res, rej) => http.get({ host: '127.0.0.1', port, path: p }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { res(null); } }); }).on('error', rej));
async function run(name, env, { auto = false, secs = 45 }, port) {
  const out = path.join(DIR, `fake523_${port}.txt`); try { fs.unlinkSync(out); } catch (_) {}
  const fake = spawn('python3', [path.join(DIR, 'fake_nova523.py'), path.join(ROOT, 'cap/direct1_conv.log'), out, String(secs + 5)], { env: { ...process.env, ...env } });
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nr523-'));
  fs.writeFileSync(path.join(data, 'state.json'), JSON.stringify({ app: 'nova-remote', version: '0.6.1', saved: new Date().toISOString(), V: { 'track.name': Array(16).fill('') } }));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', String(port), '--no-open', '--data', data, ...(auto ? [] : ['--no-auto'])],
    { env: { ...process.env, ...(auto ? { NOVA_REMOTE_TRY: pty } : {}) } });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  await sleep(1000);
  const b = await chromium.launch(); const pg = await b.newPage(); await pg.goto(`http://127.0.0.1:${port}/`); await pg.waitForFunction(() => cart.ready);
  if (!auto) await pg.evaluate(pt => net.send({ t: 'serialOpen', path: pt, baud: 38400, parity: 'odd', listen: false }), pty);
  const t0 = Date.now(); let names = '', got = false;
  while (Date.now() - t0 < secs * 1000) {
    await sleep(1000);
    const st = await get(port, '/api/status').catch(() => null);
    names = st && st.tracks ? st.tracks.map(t => t.name).filter(Boolean).slice(0, 4).join(',') : '';
    if (names) { got = true; break; }
  }
  const secsTaken = ((Date.now() - t0) / 1000).toFixed(0);
  await b.close(); srv.kill(); fake.kill(); await sleep(300);
  const notes = fs.readFileSync(out, 'utf8').split('\n').filter(l => l.includes('#')).map(l => l.replace(/^\s*([\d.]+) # /, '$1s ')).join(' | ');
  const opens = (log.match(/Looking for the Nova on|Found the Nova|reloading|didn't send its settings|Still no settings/g) || []);
  console.log(`${got ? 'PASS' : 'FAIL'}  ${name}: ${got ? 'settings in ' + secsTaken + ' s (' + names + ')' : 'no settings after ' + secs + ' s'}`);
  console.log(`      Nova: ${notes}`);
  console.log(`      remote: ${[...new Set(opens)].join('; ') || '-'}`);
  fs.rmSync(data, { recursive: true, force: true });
}
(async () => {
  await run('normal, by hand', {}, {}, 8211);
  await run('reconnect inside 3.5 s (MID), by hand', { MID: '1' }, {}, 8212);
  await run('slow first answer (8 s), auto-connect', { DELAY: '8' }, { auto: true }, 8213);
  await run('slow answer + mid, auto-connect', { DELAY: '8', MID: '1' }, { auto: true }, 8214);
})().catch(e => { console.error(e); process.exit(1); });
