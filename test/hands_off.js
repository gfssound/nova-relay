/* Nov 18 (Ferris, on a job with the Pi on the direct cable: "when it connects to Nova directly the headphone routing
   changes on the Nova, and sometimes it empties the scene / take data. And some routing changes. Remote should always
   read current Nova settings first before anything else, never changing something on first connect ... make sure that
   if I leave the nova.local page and return to it that nothing gets messed up").

   A fake Nova 1 (fw 5.23 behaviour) replays a real direct-cable capture. A saved setup from an earlier day (different
   names, routing, headphones, scene/take) is on the box. Nothing is touched; the pages are opened, reloaded, hidden and
   shown, sent away and brought back, the box's server restarted and the cable "unplugged". Every frame Nova Relay sends
   the Nova is listed: anything but hello (CMD 20) fails. Also lists every change a page tried to send ("set").
     node test/hands_off.js [capture]   */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const CAP = process.argv[2] || 'cap/direct1_conv.log', PORT = 8291;
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
(async () => {
  const got = path.join(DIR, 'fake_ho.txt'); try { fs.unlinkSync(got); } catch (_) { }
  const fake = spawn('python3', [path.join(DIR, 'fake_nova523.py'), path.join(ROOT, CAP), got, '170'], { env: { ...process.env, DELAY: '2' } });
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'ho-'));
  let log = '';
  const run = (auto) => { const s = spawn('node', [(process.env.NR_SERVER || path.join(ROOT, 'nova-remote/server.js')), '--port', String(PORT), '--no-open', '--data', data, ...(auto ? [] : ['--no-auto'])], { env: { ...process.env, NOVA_REMOTE_TRY: pty } }); s.stdout.on('data', d => log += d); s.stderr.on('data', d => log += d); return s; };
  /* day 1: a setup with the Nova not connected: old names, routing, headphones, scene/take */
  let srv = run(false); await sleep(900);
  let b = await chromium.launch(); let p = await b.newPage(); await p.goto(`http://127.0.0.1:${PORT}/`); await p.waitForFunction(() => cart.ready); await sleep(500);
  await p.evaluate(() => {
    for (let t = 0; t < 16; t++) set('track.name', [t], 'OLD' + (t + 1));
    for (let i = 0; i < 8; i++) for (let t = 0; t < 16; t++) set('trackmix.matrix', [0, t, i], (t + i) % 3 ? 0 : 3);
    try { set('hpmix.preset', [], 3); } catch (_) { }
    try { set('scene.next', [], '99Z'); set('take.next', [], '7'); set('scene.current', [], '42A'); set('take.current', [], '12'); } catch (_) { }
  }); await sleep(800);
  await b.close(); srv.kill(); await sleep(500);

  /* day 2: the box starts with auto-connect; two devices open */
  srv = run(true); await sleep(900);
  b = await chromium.launch();
  const ctxA = await b.newContext(), ctxB = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const sets = [];
  const watch = async (pg, who) => {
    await pg.exposeFunction('__setSent', (m, st) => sets.push(`${who}: ${m}  @ ${st}`)).catch(() => { });
    await pg.addInitScript(() => {
      const hook = () => { if (!window.net || net.__hooked) return; net.__hooked = true; const o = net.send.bind(net);
        net.send = obj => { if (obj && (obj.t === 'set' || obj.t === 'replace' || obj.t === 'init' || obj.t === 'cmd' || obj.t === 'txPower' || obj.t === 'novaInput' || obj.t === 'novaConfigure')) window.__setSent(JSON.stringify(obj).slice(0, 160), (new Error().stack || '').split('\n').slice(2, 6).map(s => s.trim()).join(' < ')); return o(obj); }; };
      const iv = setInterval(hook, 5); window.addEventListener('load', () => setTimeout(() => clearInterval(iv), 3000));
    });
  };
  const A = await ctxA.newPage(); await watch(A, 'desk'); const B = await ctxB.newPage(); await watch(B, 'phone');
  await A.goto(`http://127.0.0.1:${PORT}/`); await B.goto(`http://127.0.0.1:${PORT}/`);
  await A.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 60000 });
  const t0 = Date.now(); await A.waitForFunction(() => (get('track.name') || []).some(n => n && !/^OLD/.test(n)), null, { timeout: 30000 }).catch(() => { });
  console.log(`  connected; Nova's names in after ${((Date.now() - t0) / 1000).toFixed(1)} s:`, await A.evaluate(() => (get('track.name') || []).slice(0, 4).join(',')));
  await sleep(4000);
  const views = await A.evaluate(() => [...document.querySelectorAll('[data-go], nav button[data-view]')].map(e => e.dataset.go || e.dataset.view).filter((v, i, a) => v && a.indexOf(v) === i));
  for (const v of views.length ? views : ['home', 'inputs', 'routing', 'arm', 'meta', 'timecode', 'setup']) { await A.evaluate(v => { try { go(v); } catch (_) { } }, v); await B.evaluate(v => { try { go(v); } catch (_) { } }, v); await sleep(250); }
  await A.evaluate(() => go('home')); await B.evaluate(() => go('home'));
  console.log('  step: reload both pages'); await A.reload(); await B.reload(); await A.waitForFunction(() => cart.ready); await B.waitForFunction(() => cart.ready); await sleep(2500);
  console.log('  step: phone hidden 6 s and shown (phone locked / app switched)');
  await B.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); try { document.activeElement && document.activeElement.blur(); } catch (_) { } });
  await sleep(6000);
  await B.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pageshow')); window.dispatchEvent(new Event('focus')); });
  await sleep(2000);
  console.log('  step: phone leaves to another site and comes back (Back)');
  await B.goto('about:blank'); await sleep(3000); await B.goBack(); await B.waitForFunction(() => cart.ready).catch(() => { }); await sleep(2500);
  console.log('  step: phone loses the box for 8 s (Wi-Fi drop) and reconnects');
  await ctxB.setOffline(true); await B.evaluate(() => { try { net.ws.close(); } catch (_) { } }); await sleep(8000); await ctxB.setOffline(false); await sleep(5000);
  console.log('  step: a scene field focused on the phone, then the page hidden (iOS blurs it)');
  await B.evaluate(() => go('meta')); await sleep(400);
  await B.evaluate(() => { const i = [...document.querySelectorAll('input[type=text],input:not([type])')].find(x => x.offsetParent); if (i) { i.focus(); } }); await sleep(200);
  await B.evaluate(() => { document.activeElement && document.activeElement.blur(); }); await sleep(800);
  console.log('  step: Nova Relay restarted on the box (pages reconnect by themselves)');
  srv.kill(); await sleep(1500); srv = run(true);
  await A.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 60000 }).catch(() => { }); await sleep(6000);
  console.log('  step: cable unplugged 6 s (the Nova stops answering) and back');
  fake.kill('SIGSTOP'); await sleep(6000); fake.kill('SIGCONT'); await A.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 40000 }).catch(() => { }); await sleep(6000);
  await b.close(); srv.kill(); fake.kill(); await sleep(300);

  const lines = fs.readFileSync(got, 'utf8').split('\n').filter(l => l && !l.includes('#'));
  const cmds = {}; for (const l of lines) { const c = l.split(' ')[6]; cmds[c] = (cmds[c] || 0) + 1; }
  const nonHello = lines.filter(l => l.split(' ')[6] !== '20');
  console.log('  sent to the Nova by command:', JSON.stringify(cmds));
  nonHello.slice(0, 8).forEach(l => console.log('    ', l.slice(0, 140)));
  check(nonHello.length === 0, `nothing but hello reached the Nova (${nonHello.length} other frames)`);
  const toNova = log.split('\n').filter(l => /→ Nova/.test(l) && !/hello/i.test(l));
  toNova.slice(0, 8).forEach(l => console.log('     log:', l.slice(0, 160)));
  const userSets = sets.filter(s => !/"t":"set","k":"ui\./.test(s) || /ui\.znettrim|ui\.faderpos/.test(s));
  console.log(`  page messages that change things: ${userSets.length}`); userSets.slice(0, 12).forEach(s => console.log('    ', s.slice(0, 300)));
  check(!sets.some(s => /"t":"(set|replace|cmd|txPower|novaConfigure)"/.test(s) && !/"k":"ui\.(helptext|osk|refline|meters)/.test(s)), 'no page sent a change (set / replace / cmd) without being touched');
  const hellos = [...new Set(fs.readFileSync(got, 'utf8').split('\n').filter(l => /hello as/.test(l)).map(l => l.replace(/^.*hello as /, '')))];
  check(hellos.length && hellos.every(h => /^PCnovaT/.test(h)), `every hello was NovaTouch's (${hellos.join(', ')})`);
  fs.rmSync(data, { recursive: true, force: true });
  console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
