/* Nov 15: which hello a session starts with. Default: NovaTouch-type (PCnovaT-0.92.03), which Ferris's Touch licence
   covers (the afternoon's freezes were the Pi's power supply; with Nova Relay's own hello "Demo mode still appears").
   Nova Relay's own is a choice in Setup › Cart & Recorder Link (nova-link.json helloMode + helloChosen), from the next
   Connect. 0.6.3 saved helloMode "own" for everyone without anyone choosing it: that doesn't count. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) fails++; };
async function session(port, saved, act) {
  const out = path.join(DIR, `fakehc_${port}.txt`); try { fs.unlinkSync(out); } catch (_) {}
  const fake = spawn('python3', [path.join(DIR, 'fake_nova523.py'), path.join(ROOT, 'cap/direct1_conv.log'), out, '40']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrhc-'));
  if (saved) fs.writeFileSync(path.join(data, 'nova-link.json'), JSON.stringify(saved));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', String(port), '--no-open', '--data', data, '--no-auto']); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage(); await p.goto(`http://127.0.0.1:${port}/`); await p.waitForFunction(() => cart.ready);
  const open = () => p.evaluate(pt => net.send({ t: 'serialOpen', path: pt, baud: 38400, parity: 'odd', listen: false }), pty);
  const r = await act({ p, open, out, data });
  await b.close(); srv.kill(); fake.kill(); await sleep(300); fs.rmSync(data, { recursive: true, force: true });
  return r;
}
const hellos = out => [...new Set(fs.readFileSync(out, 'utf8').split('\n').filter(l => / TX|^\d/.test(l)).map(l => (l.match(/hello as (\S+)/) || [])[1]).filter(Boolean))];
(async () => {
  const ver = require(path.join(ROOT, 'nova-remote/package.json')).version, T = 'PCnovaT-0.92.03#01.01', OWN = `PCnovaRemote-${ver}#01.01`;
  const first = async (port, saved, what) => session(port, saved, async ({ p, open, out }) => {
    await open(); await sleep(4000);
    const c = await p.evaluate(() => cart.nova.connected);
    return { hello: hellos(out)[0], c };
  });
  let r = await first(8251, null); check(r.c && r.hello === T, `fresh install: says hello as ${r.hello}, connected=${r.c}`);
  r = await first(8252, { helloMode: 'own', hello: OWN }); check(r.hello === T, `0.6.3's saved "own" (nobody chose it) doesn't count: ${r.hello}`);
  r = await first(8253, { helloMode: 'own', helloChosen: true }); check(r.c && r.hello === OWN, `Nova Relay chosen in Setup before: ${r.hello}, connected=${r.c}`);
  let savedJson = null;
  await session(8254, null, async ({ p, open, data }) => {
    await open(); await sleep(3000);
    await p.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(400);
    check(await p.locator('#f-hello').inputValue() === 'touch', 'Setup › Cart & Recorder Link shows "Say hello as: NovaTouch"');
    await p.selectOption('#f-hello', 'own'); await sleep(600);
    savedJson = JSON.parse(fs.readFileSync(path.join(data, 'nova-link.json'), 'utf8'));
    check(savedJson.helloMode === 'own' && savedJson.helloChosen === true, `switching to Nova Relay is saved as a choice (${savedJson.helloMode}, chosen ${savedJson.helloChosen})`);
  });
  r = await first(8255, savedJson); check(r.c && r.hello === OWN, `next Connect: says hello as ${r.hello}, connected=${r.c}`);
  console.log(fails ? `${fails} problem(s)` : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
