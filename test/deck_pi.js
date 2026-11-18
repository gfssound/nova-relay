/* Nov 14: Stream Deck plugged straight into the Pi box. A stand-in Linux hidraw device (a /sys entry, a pipe for
   key presses, a file that collects every report Nova Relay sends) plays a Stream Deck MK.2, then a Stream Deck +;
   Nova Relay runs with --deck against a replayed Nova. Checks: it's found, every key gets a picture (rebuilt into a
   PNG to look at), brightness is set, presses reach the recorder, a page key flips pages, layout edits from Setup
   redraw, unplugging is noticed, the + dials and strip work, and stopping Nova Relay leaves STOPPED on the keys. */
const { spawn, execFileSync } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = 8171, errors = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) errors.push(what); };

(async () => {
  const T = fs.mkdtempSync(path.join(DIR, 'deckpi-')), SYS = path.join(T, 'sys'), DEV = path.join(T, 'dev');
  fs.mkdirSync(DEV, { recursive: true });
  const plug = (n, pid, name) => {
    fs.mkdirSync(path.join(SYS, n, 'device'), { recursive: true });
    fs.writeFileSync(path.join(SYS, n, 'device', 'uevent'), `DRIVER=hid-generic\nHID_ID=0003:00000FD9:${pid.toString(16).toUpperCase().padStart(8, '0')}\nHID_NAME=Elgato ${name}\nHID_UNIQ=TEST${pid}\n`);
    execFileSync('mkfifo', [path.join(DEV, n)]);
  };
  const unplug = n => fs.rmSync(path.join(SYS, n), { recursive: true, force: true });
  plug('hidraw3', 0x80, 'Stream Deck MK.2');
  /* a keyboard-ish hidraw that isn't Elgato: must be ignored */
  fs.mkdirSync(path.join(SYS, 'hidraw0', 'device'), { recursive: true }); fs.writeFileSync(path.join(SYS, 'hidraw0', 'device', 'uevent'), 'HID_ID=0003:0000046D:0000C52B\nHID_NAME=Logitech\n');

  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/live22_conv.log'), path.join(T, 'nova.txt'), '120', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = path.join(T, 'data');
  const env = { ...process.env, NOVA_DECK_SYS: SYS, NOVA_DECK_DEV: DEV };
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', String(PORT), '--no-open', '--no-auto', '--deck', '--data', data], { env });
  let slog = ''; srv.stdout.on('data', d => slog += d); srv.stderr.on('data', d => slog += d);
  await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errors.push('page: ' + e.message));
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.waitForFunction(() => cart.ready);
  await p.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(300);
  await p.evaluate(path => { const s = document.getElementById('f-serial-port'); s.append(new Option(path, path)); s.value = path; }, pty);
  await p.locator('button', { hasText: 'Connect' }).first().click(); await sleep(8000);

  const api = async q => (await fetch(`http://127.0.0.1:${PORT}${q}`)).json();
  const out = path.join(DEV, 'hidraw3.out');
  /* key presses: the MK.2's input report (01 00 0F 00 then one byte per key) */
  const fifo = fs.openSync(path.join(DEV, 'hidraw3'), 'w');
  const keys = Array(15).fill(0);
  const send = () => { const r = Buffer.alloc(512); r[0] = 1; r[2] = 15; keys.forEach((v, i) => r[4 + i] = v); fs.writeSync(fifo, r); };
  const press = async (k, ms = 80) => { keys[k] = 1; send(); await sleep(ms); keys[k] = 0; send(); await sleep(700); };

  let d = await api('/api/deck');
  check(d.state === 'open' && d.device && d.device.name === 'Stream Deck MK.2', `found the MK.2 (state ${d.state}, ${d.device && d.device.name})`);
  check(Object.keys(d.images).length === 15, `15 key pictures reported to the server (${Object.keys(d.images).length})`);
  const feat = fs.readFileSync(path.join(DEV, 'hidraw3.feature'), 'utf8').trim().split('\n');
  check(feat[0].startsWith('030846') && feat[0].length === 64, `brightness 70% as a 32-byte 03 08 report (${feat[0].slice(0, 8)}…)`);
  const dec = (png, from = 0) => execFileSync('python3', [path.join(DIR, 'deck/decode_deck.py'), out, '80', png, String(from)]).toString().trim();
  await sleep(1500);
  console.log('     ' + dec(path.join(DIR, 'deck/mk2_page1.png')));
  const tx = svg => [...String(svg || '').matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]).join(' | ');
  d = await api('/api/deck');
  check(/REC/.test(tx(d.images.k0)) && /TRACK 1/.test(tx(d.images.k5)) && /NEXT SCENE/.test(tx(d.images.k11)), `default layout drawn live: ${tx(d.images.k0)} / ${tx(d.images.k5)} / ${tx(d.images.k11)}`);

  /* Setup › Stream Deck in the installed app: live pictures in the grid; a change there reaches the Stream Deck */
  await p.evaluate(() => { setupSec = 'deck'; go('setup'); }); await sleep(1200);
  const stateTxt = await p.locator('#dk-state').textContent();
  check(/Stream Deck MK\.2 plugged in/.test(stateTxt), `Setup says: ${stateTxt}`);
  check(await p.locator('#deck-box .dk-grid img').count() === 15, `Setup shows the 15 live key pictures (${await p.locator('#deck-box .dk-grid img').count()})`);
  await p.locator('#deck-box .dk-key').nth(12).click(); await p.selectOption('#dk-action', 'lasttake'); await sleep(1200);
  d = await api('/api/deck');
  check(/LAST TAKE/.test(tx(d.images.k12)) && d.layouts['15'].pages[0].keys[12].a === 'lasttake', `key 13 set to Last take from Setup: the Stream Deck shows ${tx(d.images.k12)}`);
  const imgSrc = await p.locator('#deck-box .dk-key').nth(12).locator('img').getAttribute('src');
  check(/LAST%20TAKE/.test(imgSrc || ''), 'the Setup grid shows the new picture too');
  await p.screenshot({ path: path.join(DIR, 'deck/installed_setup.png') });

  /* presses */
  let s0 = await api('/api/status'); await press(11); let s1 = await api('/api/status');
  check(s1.sceneNext !== s0.sceneNext, `Next scene key: ${s0.sceneNext} -> ${s1.sceneNext}`);
  const armed0 = (s1.armed || []).includes(4); await press(8); s1 = await api('/api/status');
  check(((s1.armed || []).includes(4)) !== armed0, `Arm track 4 key: ${armed0} -> ${(s1.armed || []).includes(4)}`);
  await press(3, 100); s1 = await api('/api/status'); const toneTap = s1.tone;
  await press(3, 900); s1 = await api('/api/status');
  check(!toneTap && s1.tone === true, `Tone: a tap does nothing (${toneTap}), a 0.9 s hold turns it on (${s1.tone})`);
  await press(3, 80); s1 = await api('/api/status'); check(s1.tone === false, `Tone: a tap turns it off again (${s1.tone})`);

  /* layout edit from Setup: key 15 = Next page, page 2 = meters */
  d = await api('/api/deck');
  const lay = d.layouts['15']; lay.pages[0].keys[14] = { a: 'deck.next', s: {} };
  lay.pages.push({ keys: [{ a: 'meter', s: { source: 't1' } }, { a: 'meter', s: { source: 't2' } }, { a: 'rx', s: { rx: '1' } }, null, null, null, null, null, null, null, null, null, null, null, { a: 'deck.prev', s: {} }] });
  await p.evaluate(l => net.send({ t: 'deck', size: '15', layout: l }), lay); await sleep(1200);
  d = await api('/api/deck'); check(/PAGE 1 \/ 2/.test(tx(d.images.k14)), `edit from Setup redraws: key 15 shows ${tx(d.images.k14)}`);
  const before = fs.statSync(out).size;
  await press(14); d = await api('/api/deck');
  check(d.page === 1 && /TRACK 1/.test(tx(d.images.k0)) && /RX 1/.test(tx(d.images.k2)) && !d.images.k3.includes('<text'), `page key: now page ${d.page + 1}: ${tx(d.images.k0)} / ${tx(d.images.k2)}`);
  await sleep(1200); console.log('     ' + dec(path.join(DIR, 'deck/mk2_page2.png'), before));
  await press(14); d = await api('/api/deck'); check(d.page === 0, `Previous page goes back (page ${d.page + 1})`);
  const saved = JSON.parse(fs.readFileSync(path.join(data, 'deck.json'), 'utf8'));
  check(saved.enabled === true && saved.layouts['15'].pages.length === 2, 'layout saved in deck.json');

  /* unplug, then a Stream Deck + */
  fs.closeSync(fifo); unplug('hidraw3'); await sleep(2500);
  d = await api('/api/deck'); check(d.state === 'none', `unplugged noticed (state ${d.state})`);
  plug('hidraw4', 0x84, 'Stream Deck +'); await sleep(3500);
  d = await api('/api/deck'); check(d.state === 'open' && d.device.name === 'Stream Deck +' && d.device.dials === 4, `Stream Deck + found (${d.device && d.device.name}, ${d.device && d.device.dials} dials)`);
  check(Object.keys(d.images).filter(k => k[0] === 'd').length === 4, `4 strip parts drawn (${Object.keys(d.images).filter(k => k[0] === 'd').join(',')})`);
  const fifo2 = fs.openSync(path.join(DEV, 'hidraw4'), 'w');
  const plusIn = (type, sub, vals) => { const r = Buffer.alloc(512); r[0] = 1; r[1] = type; r[4] = sub; vals.forEach((v, i) => r[5 + i] = v & 255); fs.writeSync(fifo2, r); };
  s0 = await api('/api/status'); plusIn(3, 1, [0, 0, 0, 1]); await sleep(900); s1 = await api('/api/status');
  check(s1.hp !== s0.hp, `Headphones dial turned one click: preset ${s0.hp} -> ${s1.hp}`);
  const st15 = s1.inputs && s1.inputs[14]; const trim0 = st15 ? st15.trim : null;
  plusIn(3, 1, [2, 0, 0, 0]); await sleep(900); s1 = await api('/api/status');
  check(trim0 != null && s1.inputs[14].trim === trim0 + 2, `Trim dial (RX 1) two clicks: ${trim0} -> ${s1.inputs[14].trim} dB`);
  plusIn(3, 1, [-2, 0, 0, 0]); await sleep(900);
  d = await api('/api/deck'); check(/TRIM/.test(tx(d.images.d0)), `strip shows ${tx(d.images.d0)}`);
  await sleep(500);
  console.log('     ' + execFileSync('python3', [path.join(DIR, 'deck/decode_deck.py'), path.join(DEV, 'hidraw4.out'), '84', path.join(DIR, 'deck/plus.png')]).toString().trim());

  /* Setup switch off: keys say OFF; on again */
  await p.evaluate(() => net.send({ t: 'deck', enabled: false })); await sleep(1500);
  d = await api('/api/deck'); check(d.state === 'off' && d.enabled === false, `switched off in Setup (state ${d.state})`);
  await p.evaluate(() => net.send({ t: 'deck', enabled: true })); await sleep(2500);
  d = await api('/api/deck'); check(d.state === 'open', `switched on again (state ${d.state})`);

  /* stopping Nova Relay: the keys are left saying STOPPED */
  const size0 = fs.statSync(path.join(DEV, 'hidraw4.out')).size;
  srv.kill('SIGTERM'); await sleep(1500);
  console.log('     ' + execFileSync('python3', [path.join(DIR, 'deck/decode_deck.py'), path.join(DEV, 'hidraw4.out'), '84', path.join(DIR, 'deck/plus_stopped.png'), String(size0)]).toString().trim());
  check(fs.statSync(path.join(DEV, 'hidraw4.out')).size > size0, 'stopping Nova Relay redrew the keys');

  const logs = slog.split('\n').filter(l => /error|Error|helper/.test(l));
  check(!logs.length, 'no errors in the server output' + (logs.length ? ': ' + logs.slice(0, 3).join(' / ') : ''));
  fs.closeSync(fifo2); await b.close(); fake.kill(); fs.rmSync(T, { recursive: true, force: true });
  console.log(errors.length ? `${errors.length} problem(s)` : 'all passed'); process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
