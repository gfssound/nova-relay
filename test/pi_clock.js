/* Nov 14 (0.6.1): the Pi box sets its clock from a connecting device. Stand-in sudo/timedatectl; the browser's Date is shifted. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const os = require('os');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'clkbin-')), calls = path.join(bin, 'calls.txt');
fs.writeFileSync(path.join(bin, 'sudo'), `#!/bin/sh\nprintf "%s\\n" "$*" >> ${calls}\nexit 0\n`, { mode: 0o755 });
fs.writeFileSync(path.join(bin, 'timedatectl'), `#!/bin/sh\necho "\${FAKE_NTP:-no}"\n`, { mode: 0o755 });
let port = 8190;
async function run(name, { flag = true, ntp = 'no', shiftMs = 40 * 864e5, clients = 1 }) {
  try { fs.unlinkSync(calls); } catch (_) {}
  const data = fs.mkdtempSync(path.join(DIR, 'nrck-')); const p0 = port++;
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', String(p0), '--no-open', '--data', data, ...(flag ? ['--set-clock'] : [])],
    { env: { ...process.env, PATH: bin + ':' + process.env.PATH, FAKE_NTP: ntp } });
  let log = ''; srv.stdout.on('data', d => log += d); await sleep(900);
  const b = await chromium.launch();
  for (let i = 0; i < clients; i++) {
    const pg = await b.newPage(); await pg.addInitScript(s => { const n = Date.now; Date.now = () => n() + s; }, shiftMs);
    await pg.goto(`http://127.0.0.1:${p0}/`); await pg.waitForFunction(() => cart.ready); await sleep(700);
  }
  await b.close(); srv.kill(); await sleep(200);
  const c = fs.existsSync(calls) ? fs.readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean) : [];
  let detail = '';
  if (c[0]) { const sec = +c[0].split(' ').pop(); detail = ` -> ${c[0].replace(/\d{10}$/, '')}<sec> (off by ${Math.round((sec * 1000 - Date.now() - shiftMs) / 1000)} s)`; }
  console.log(`${name}: helper calls=${c.length}${detail}`);
  fs.rmSync(data, { recursive: true, force: true });
}
(async () => {
  await run('A  Pi, no internet, device 40 days ahead', {});
  await run('B  two devices connect (only one set)', { clients: 2 });
  await run('C  synced to internet: leave it', { ntp: 'yes' });
  await run('D  not a Pi box (no --set-clock)', { flag: false });
  await run('E  device clock dead (2020)', { shiftMs: Date.UTC(2020, 0, 1) - Date.now() });
  await run('F  only 30 s off', { shiftMs: 30000 });
  fs.rmSync(bin, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
