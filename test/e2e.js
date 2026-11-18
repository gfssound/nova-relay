const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/tap1.log'), path.join(DIR, 'fake_rx.txt'), '40']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8131', '--no-open', '--data', data]);
  let srvOut = ''; srv.stdout.on('data', d => srvOut += d); srv.stderr.on('data', d => srvOut += d);
  await sleep(800);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const logs = []; p.on('console', m => { if (m.type() === 'error') logs.push(m.text()); }); p.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
  await p.goto('http://localhost:8131/'); await p.waitForFunction(() => cart.ready, null, { timeout: 8000 });
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd' }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 15000 });
  await sleep(4000);
  const st = await p.evaluate(() => ({ pill: $('linkText').textContent, names: V['track.name'].slice(0, 16), armed: V['record.tracks'].slice(0, 16).map((v, i) => v ? i + 1 : 0).filter(Boolean),
    inNames: V['input.name'].slice(0, 22), m3: V['trackmix.matrix'][0][3].map((v, i) => v ? i : -1).filter(i => i >= 0), tone: V['tone.level'], scene: V['scene.current'], takeNext: V['take.next'],
    hist: V['metadata.history'].filter(Boolean).slice(0, 3), presets: V['note.preset'].slice(0, 4), recDisabled: $('bRec').disabled, novaTrk: sim.nova && sim.nova.trk.slice(0, 6), novaOut: sim.nova && sim.nova.out, hpf: V['input.hpf.freq'].slice(0, 6), thresh: V['input.compress.thresh'], ratio: V['input.compress.ratio'], model: cart.nova.model, tc: $('tc') ? $('tc').textContent : '' }));
  console.log(JSON.stringify(st, null, 1));
  await p.screenshot({ path: path.join(DIR, 'live-home.png') });
  // changes made on the remote
  await p.evaluate(() => { set('record.tracks', [1], 1); set('track.name', [2], 'BOOMX'); set('trackmix.matrix', [0, 3, 15], 0); set('tone.enable', [], 1); set('hpmix.tracks', [0, 1], 2); set('scene.next', [], '42B'); set('outputmix.com1', [0, 3], 1); set('outputmix.matrix', [0, 0, 3], 1); link.send({ op: 'CMD', name: 'RECORD' }); });
  await sleep(1500);
  await p.evaluate(() => go('setup')); await sleep(300); await p.screenshot({ path: path.join(DIR, 'live-setup.png') });
  await p.evaluate(() => go('log')); await sleep(300); await p.screenshot({ path: path.join(DIR, 'live-log.png') });
  const logTail = await p.evaluate(() => LOG.slice(-25).map(e => e.line));
  console.log(logTail.join('\n'));
  console.log('page errors', logs);
  await b.close(); srv.kill(); fake.kill();
  const rx = fs.readFileSync(path.join(DIR, 'fake_rx.txt'), 'utf8').split('\n').filter(l => l && !/ 20 50 43/.test(l));
  console.log('--- cart -> fake Nova (non-hello) ---\n' + rx.join('\n'));
  const hellos = fs.readFileSync(path.join(DIR, 'fake_rx.txt'), 'utf8').split('\n').filter(l => / 20 50 43/.test(l));
  console.log('hellos', hellos.length, hellos[0]);
  console.log('--- server ---\n' + srvOut.slice(0, 600));
})().catch(e => { console.error(e); process.exit(1); });
