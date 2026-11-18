const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/tap1.log'), path.join(DIR, 'fake_rx4.txt'), '90']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8134', '--no-open', '--data', data]);
  await sleep(800);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://localhost:8134/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd' }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 15000 });
  await sleep(2500);
  const sizes = [[1920,1080,'1920x1080'],[1440,900,'1440x900'],[1280,720,'1280x720'],[1280,560,'1280x560'],[960,600,'960x600'],[800,500,'800x500'],[640,480,'640x480'],[390,844,'phone'],[844,390,'phone-land'],[1024,768,'ipad-land']];
  for (const [w, hh, name] of sizes) {
    await p.setViewportSize({ width: w, height: hh }); await sleep(500);
    const m = await p.evaluate(() => { const mt = document.querySelector('main').getBoundingClientRect().top; return { chrome: Math.round(mt), pct: Math.round(mt / innerHeight * 100), hscroll: document.documentElement.scrollWidth > innerWidth, tr: Math.round(document.querySelector('.transport').getBoundingClientRect().height) }; });
    console.log(name.padEnd(12), JSON.stringify(m));
    await p.screenshot({ path: path.join(DIR, `fl-${name}.png`) });
  }
  for (const v of ['routing', 'inputs', 'meta', 'setup']) { await p.setViewportSize({ width: 960, height: 600 }); await p.evaluate(v => go(v), v); await sleep(400); await p.screenshot({ path: path.join(DIR, `fl-960-${v}.png`) }); }
  await b.close(); srv.kill(); fake.kill();
})().catch(e => { console.error(e); process.exit(1); });
