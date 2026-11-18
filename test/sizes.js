const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/tap1.log'), path.join(DIR, 'fake_rx3.txt'), '60']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8133', '--no-open', '--data', data]);
  await sleep(800);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('http://localhost:8133/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd' }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 15000 });
  await sleep(3000);
  for (const [w, hh, name] of [[1920, 1080, 'big'], [1280, 800, 'laptop'], [820, 1180, 'ipad'], [390, 844, 'phone']]) {
    await p.setViewportSize({ width: w, height: hh }); await sleep(600);
    const m = await p.evaluate(() => ({ ledh: getComputedStyle(document.documentElement).getPropertyValue('--ledh'), docH: document.documentElement.scrollHeight, inner: innerHeight, sw: document.documentElement.scrollWidth, iw: innerWidth }));
    console.log(name, JSON.stringify(m));
    await p.screenshot({ path: path.join(DIR, `size-${name}.png`) });
  }
  // next scene test
  await p.evaluate(() => setNextScene('99A')); await sleep(300);
  console.log('take.next after new scene:', await p.evaluate(() => V['take.next']));
  await b.close(); srv.kill(); fake.kill();
  console.log(fs.readFileSync(path.join(DIR, 'fake_rx3.txt'), 'utf8').split('\n').filter(l => l && !/ 20 50 43/.test(l)).join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
