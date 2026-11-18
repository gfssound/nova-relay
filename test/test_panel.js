const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const got = path.join(DIR, 'fake_tp.txt'); try { fs.unlinkSync(got); } catch (_) {}
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/direct1_conv.log'), got, '100', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrtp-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8176', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1280,height:860} }); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8176/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(pt => net.send({ t:'serialOpen', path:pt, baud:38400, parity:'odd', listen:false }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout:40000 }); await sleep(2000);
  const api = async u => p.evaluate(async u => { const r = await fetch(u,{method:'POST'}); return r.status + ' ' + JSON.stringify((await r.json()).error || 'ok'); }, u);
  console.log('power/wake:', await api('/api/test/power/wake')); await sleep(1700);
  console.log('power/bogus (want 400):', await api('/api/test/power/bogus')); await sleep(1700);
  console.log('fader/2/200:', await api('/api/test/fader/2/200')); 
  console.log('rapid 2nd (want 429):', await api('/api/test/fader/3/10')); await sleep(1700);
  console.log('trim/5/100:', await api('/api/test/trim/5/100')); await sleep(1700);
  console.log('out/1/50:', await api('/api/test/out/1/50')); await sleep(1700);
  console.log('out/9/50 (want 400):', await api('/api/test/out/9/50')); await sleep(1700);
  console.log('enc/3:', await api('/api/test/enc/3')); await sleep(600);
  // UI: panel present, disabled until armed
  console.log('panel exists:', await p.evaluate(() => !!document.body.innerText.match(/Protocol test tools/)) );
  await b.close(); srv.kill(); fake.kill(); await sleep(300);
  const lines = fs.readFileSync(got,'utf8').split('\n');
  const find = re => lines.filter(l => re.test(l)).map(l => l.trim().split(' ').slice(1));
  const show = (name, re, dstart) => { const f = find(re); console.log(`${name}: ${f.length} frame(s)` + (f[0] ? '  data=' + f[0].slice(dstart, dstart+5).join(' ') : '')); };
  show('power(50 98)', / 00 50 98 /, 6);
  show('fader(22)', / 00 22 /, 6);
  show('trim(23)', / 00 23 /, 6);
  show('outknob(24)', / 00 24 /, 6);
  show('encoder(21)', / 00 21 /, 6);
  console.log('errors:', errs.length ? errs : 'none');
  fs.rmSync(data,{recursive:true,force:true});
})().catch(e => { console.error(e); process.exit(1); });
