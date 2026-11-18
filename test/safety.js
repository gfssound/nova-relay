/* Nov 15 (Ferris's Pi on a weak power bank: the cable echoed every hello and the Nova froze):
   - an exact echo of our own hello is recognised: an error line naming the power supply, and Nova Relay goes quiet;
   - the Pi box's power (vcgencmd get_throttled, here a stand-in script): low → error + Setup warning + /api/status
     boxPower; back to normal → logged, Setup still says it ran short. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails++; };
(async () => {
  const T = fs.mkdtempSync(path.join(DIR, 'nrsafe-')), vc = path.join(T, 'vcgencmd'), val = path.join(T, 'throttled');
  fs.writeFileSync(val, '0x50005'); fs.writeFileSync(vc, `#!/bin/sh\necho "throttled=$(cat ${val})"\n`); fs.chmodSync(vc, 0o755);
  const out = path.join(T, 'nova.txt');
  const fake = spawn('python3', [path.join(DIR, 'fake_nova523.py'), path.join(ROOT, 'cap/direct1_conv.log'), out, '60'], { env: { ...process.env, ECHO: '1' } });
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8262', '--no-open', '--data', path.join(T, 'data'), '--no-auto', '--set-clock'], { env: { ...process.env, NOVA_VCGENCMD: vc } });
  await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8262/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(pt => net.send({ t: 'serialOpen', path: pt, baud: 38400, parity: 'odd', listen: false }), pty);
  await sleep(20000);
  const logText = await p.evaluate(() => LOG.map(e => e.line).join('\n'));
  const hellos = fs.readFileSync(out, 'utf8').split('\n').filter(l => /echoing/.test(l)).length;
  check(/own messages are coming back on the cable/.test(logText) && /power supply/.test(logText), 'echo recognised: the Link log says the messages are coming back and points at the power supply');
  check(hellos <= 6, `Nova Relay went quiet: ${hellos} hellos in 20 s (about 19 without the guard)`);
  const st = await (await fetch('http://127.0.0.1:8262/api/status')).json();
  check(st.boxPower === 'low' && /supply is too weak right now/.test(logText), `box power low: /api/status boxPower=${st.boxPower}, Link log warned`);
  await p.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(400);
  const warn = await p.evaluate(() => [...document.querySelectorAll('p[role=status]')].map(e => e.textContent).find(t => /Power:/.test(t)) || '');
  check(/too weak right now/.test(warn), 'Setup › Cart & Recorder Link shows the power warning');
  fs.writeFileSync(val, '0x50000'); await sleep(11000);
  const st2 = await (await fetch('http://127.0.0.1:8262/api/status')).json();
  const warn2 = await p.evaluate(() => [...document.querySelectorAll('p[role=status]')].map(e => e.textContent).find(t => /Power:/.test(t)) || '');
  const log2 = await p.evaluate(() => LOG.map(e => e.line).join('\n'));
  check(st2.boxPower === 'was low' && /power is back to normal/.test(log2) && /ran short/.test(warn2), `power back: boxPower=${st2.boxPower}, logged, Setup says it ran short`);
  const sel = await p.evaluate(() => document.getElementById('f-hello').value);
  check(sel === 'touch', `Say hello as defaults to NovaTouch (${sel})`);
  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' / ') : ''));
  await b.close(); srv.kill(); fake.kill(); await sleep(300); fs.rmSync(T, { recursive: true, force: true });
  console.log(fails ? `${fails} problem(s)` : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
