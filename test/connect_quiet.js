/* Nov 13 (Ferris: "when the app launches does it read settings from the Nova, send the app's last settings, or nothing?"):
   connect to a replay of a real session with an existing saved setup and two devices open, touch nothing, and list every
   message the remote sends the Nova. Only hellos are expected. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'), os = require('os');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  for (const cap of ['cap/live3_conv.log', 'cap/direct1_conv.log']) {
    const got = path.join(DIR, 'fake_cq.txt'); try { fs.unlinkSync(got); } catch (_) { }
    const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, cap), got, '100', '1']);
    const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
    const data = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-'));
    // a saved setup from an earlier day, with different names, so a push would show
    const run = () => spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8168', '--no-open', '--data', data]);
    let srv = run(); await sleep(900);
    const b = await chromium.launch(); let p = await b.newPage(); await p.goto('http://127.0.0.1:8168/'); await p.waitForFunction(() => cart.ready); await sleep(800);
    await p.evaluate(() => { for (let t = 0; t < 16; t++) set('track.name', [t], 'OLD' + (t + 1)); set('ui.znettrim', [0], 40); }); await sleep(800);
    await b.close(); srv.kill(); await sleep(500);
    srv = run(); await sleep(900);
    const b2 = await chromium.launch(); p = await b2.newPage(); const p2 = await b2.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto('http://127.0.0.1:8168/'); await p.waitForFunction(() => cart.ready); await p2.goto('http://127.0.0.1:8168/'); await sleep(500);
    await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd', listen: false }), pty);
    await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 40000 }); await sleep(15000);
    const names = await p.evaluate(() => (get('track.name') || []).slice(0, 4).join(','));
    await b2.close(); srv.kill(); fake.kill(); await sleep(300);
    const lines = fs.readFileSync(got, 'utf8').split('\n').filter(Boolean);
    const cmds = {}; for (const l of lines) { const by = l.split(' ').slice(1); const c = by[5]; cmds[c] = (cmds[c] || 0) + 1; }
    const nonHello = lines.filter(l => l.split(' ').slice(1)[5] !== '20');
    console.log(cap, '| sent to the Nova by command:', JSON.stringify(cmds), '| anything but hello:', nonHello.length, '| names on screen after connect:', names);
    nonHello.slice(0, 5).forEach(l => console.log('   ', l.slice(0, 120)));
    fs.rmSync(data, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exit(1); });
