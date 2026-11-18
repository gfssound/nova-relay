const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/tap2.log'), path.join(DIR, 'fake_rx2.txt'), '45', '10']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8132', '--no-open', '--data', data]);
  await sleep(800);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  await p.goto('http://localhost:8132/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd' }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 15000 });
  const seen = new Set(); let maxOut = -120, recShot = false;
  for (let i = 0; i < 80; i++) {
    const s = await p.evaluate(() => ({ st: sim.state, out: sim.nova ? Math.max(...sim.nova.out) : -120, take: V['take.current'] }));
    seen.add(s.st + ' ' + s.take); maxOut = Math.max(maxOut, s.out);
    if (s.st === 'RECORDING' && !recShot) { recShot = true; await p.screenshot({ path: path.join(DIR, 'live-rec.png') }); }
    await sleep(500);
  }
  const fin = await p.evaluate(() => ({ hist: V['metadata.history'].filter(Boolean).slice(0, 4), runmode: V['timecode.runmode'], tone: V['tone.level'], log: LOG.filter(e => /Nova:/.test(e.line)).map(e => e.line) }));
  console.log([...seen], 'max out dB', maxOut); console.log(JSON.stringify(fin, null, 1));
  await p.evaluate(() => go('meta')); await sleep(300); await p.screenshot({ path: path.join(DIR, 'live-meta.png') });
  await b.close(); srv.kill(); fake.kill();
})().catch(e => { console.error(e); process.exit(1); });
