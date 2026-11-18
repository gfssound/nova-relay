const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const data = fs.mkdtempSync(path.join(DIR, 'nrblank-'));
  // an old 0.4.13 setup made from the example
  fs.writeFileSync(path.join(data, 'state.json'), JSON.stringify({ app: 'nova-remote', version: '0.4.13', V: { 'track.name': ['MIX L','MIX R','BOOM','PLANT','ANNA'] } }));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8145', '--no-open', '--data', data]); let out = ''; srv.stdout.on('data', d => out += d);
  await sleep(900);
  console.log('migration:', fs.readdirSync(data).filter(f => /state/.test(f)).join(', '), '|', (out.match(/Started fresh[^\n]*/) || [''])[0].slice(0, 60));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8145/'); await p.waitForFunction(() => cart.ready); await sleep(1500);
  console.log('no Nova:', JSON.stringify(await p.evaluate(() => ({
    pill: document.getElementById('linkText').textContent, tc: document.getElementById('tc').textContent,
    batt: document.getElementById('stBatt').textContent, drive: document.getElementById('stDrive').textContent,
    names: V['track.name'].filter(Boolean).length, routes: V['trackmix.matrix'].flat(3).filter(Boolean).length,
    history: V['metadata.history'].filter(Boolean).length, scene: V['scene.current'], rx: V['ui.rxfreq'].filter(Boolean).length,
    presets: (V['ui.outpresets'] || []).length, maxIn: Math.max(...sim.inDb) }))));
  await p.evaluate(() => link.send({ op: 'CMD', name: 'RECORD' })); await sleep(500);
  console.log('REC without Nova -> state', await p.evaluate(() => sim.state), '| log:', await p.evaluate(() => LOG.slice(-1)[0].line.slice(0, 70)));
  await p.evaluate(() => go('home')); await sleep(300); await p.screenshot({ path: path.join(DIR, 'blank-home.png') });
  await b.close(); srv.kill(); fs.rmSync(data, { recursive: true }); console.log('errors', errs);
})().catch(e => { console.error(e); process.exit(1); });
