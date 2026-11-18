/* Nov 15: Ferris's Pi capture (2026-11-15T13-09-37): Nova Relay said hello while the Nova was still starting up; the
   port echoed each hello back scrambled for 10 s, the Nova then answered and froze 0.3 s later ("computer found").
   fake_nova523 BOOT=10 FREEZE=1 plays that Nova. The 0.6.2 server keeps saying hello into it (frozen); the start-up
   guard stays quiet while the port sends noise and says hello once it has been quiet: connected, settings loaded. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
async function run(name, server, env, port, wait, expectOk, srvEnv = {}, maxFed = 99) {
  if (!fs.existsSync(path.join(ROOT, 'nova-remote', server))) { console.log(`--   ${name}: skipped (${server} isn't in this copy; it's the old server kept only for comparison)`); return; }
  const out = path.join(DIR, `fakebg_${port}.txt`); try { fs.unlinkSync(out); } catch (_) {}
  const fake = spawn('python3', [path.join(DIR, 'fake_nova523.py'), path.join(ROOT, 'cap/direct1_conv.log'), out, String(wait + 10)], { env: { ...process.env, ...env } });
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrbg-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote', server), '--port', String(port), '--no-open', '--data', data, '--no-auto'], { env: { ...process.env, ...srvEnv } }); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage(); await p.goto(`http://127.0.0.1:${port}/`); await p.waitForFunction(() => cart.ready);
  await p.evaluate(pt => net.send({ t: 'serialOpen', path: pt, baud: 38400, parity: 'odd', listen: false }), pty);
  await sleep(wait * 1000);
  const st = await p.evaluate(async () => { const s = await (await fetch('/api/status')).json(); return { connected: cart.nova.connected, names: s.tracks.map(t => t.name).filter(Boolean).length }; });
  const log = await p.evaluate(() => [...document.querySelectorAll('#log .ln, .log .ln, [data-log] div')].map(e => e.textContent).filter(t => /noise|starting up/.test(t)).slice(0, 2));
  await b.close(); srv.kill(); fake.kill(); await sleep(300);
  const notes = fs.readFileSync(out, 'utf8').split('\n').filter(l => l.includes('#'));
  const froze = notes.some(l => /FROZE/.test(l)), fedDuringBoot = notes.filter(l => /starting up: got/.test(l)).length;
  const ok = st.connected && !froze && st.names > 0 && fedDuringBoot <= maxFed;
  console.log(`${ok === expectOk ? 'PASS' : 'FAIL'}  ${name}: connected=${st.connected}, track names=${st.names}, froze=${froze}, hellos that reached it while starting up=${fedDuringBoot}`);
  console.log('      Nova: ' + notes.map(l => l.replace(/^\s*([\d.]+) # /, '$1s ')).filter(l => !/starting up: got/.test(l)).join(' | '));
  if (ok !== expectOk) fails++;
  fs.rmSync(data, { recursive: true, force: true });
}
(async () => {
  await run('0.6.2 (before), Nova starting up', 'server.v062.bak', { BOOT: '10', FREEZE: '1' }, 8241, 30, false);
  await run('guard: port just appeared (Nova switched on), waits before the first hello', 'server.js', { BOOT: '10', FREEZE: '1' }, 8242, 30, true, { NOVA_BOOT_WAIT: '20000' }, 0);
  await run('guard: port was already there, Nova restarting behind it: stays quiet through the noise', 'server.js', { BOOT: '10' }, 8243, 30, true, { NOVA_BOOT_WAIT: '0' }, 2);
  await run('guard: Nova already running, port already there: connects at once', 'server.js', {}, 8244, 6, true, { NOVA_BOOT_WAIT: '0' });
  console.log(fails ? `${fails} problem(s)` : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
