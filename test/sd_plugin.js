/* Stream Deck plugin test (Nov 7): a fake Stream Deck app (WebSocket server) runs the plugin against Nova Remote,
   which is connected to the replayed Nova. Checks keys draw from /api/status and presses reach the server. */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const http = require('http'), crypto = require('crypto');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const PLUG = path.join(ROOT, 'streamdeck/com.gfssound.novaremote.sdPlugin');

function fakeStreamDeck() {
  const srv = http.createServer(); const ev = { msgs: [], sock: null };
  srv.on('upgrade', (req, sock) => {
    const acc = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acc}\r\n\r\n`);
    ev.sock = sock; let buf = Buffer.alloc(0);
    sock.on('data', d => { buf = Buffer.concat([buf, d]);
      for (;;) { if (buf.length < 2) return; let len = buf[1] & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; } else if (len === 127) { len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (!(buf[1] & 0x80)) throw new Error('client frames must be masked');
        const mk = buf.slice(off, off + 4); off += 4; if (buf.length < off + len) return;
        const p = Buffer.from(buf.slice(off, off + len)); for (let i = 0; i < p.length; i++) p[i] ^= mk[i & 3];
        buf = buf.slice(off + len); if ((buf[0] & 0x0f) === 8) return; ev.msgs.push(JSON.parse(p.toString())); } });
  });
  ev.send = o => { const p = Buffer.from(JSON.stringify(o)); const n = p.length;
    const h = n < 126 ? Buffer.from([0x81, n]) : n < 65536 ? Buffer.from([0x81, 126, n >> 8, n & 255]) : (() => { const b = Buffer.alloc(10); b[0] = 0x81; b[1] = 127; b.writeBigUInt64BE(BigInt(n), 2); return b; })();
    ev.sock.write(Buffer.concat([h, p])); };
  return new Promise(r => srv.listen(0, '127.0.0.1', () => { ev.port = srv.address().port; ev.close = () => srv.close(); r(ev); }));
}
const img = (sd, ctx) => { const m = sd.msgs.filter(x => x.event === 'setImage' && x.context === ctx).pop(); return m ? decodeURIComponent(m.payload.image.replace(/^data:image\/svg\+xml,/, '')) : ''; };
const texts = svg => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1].replace(/&amp;/g, '&')).join(' | ');
const fillOf = svg => (svg.match(/<rect width="144" height="144" rx="18" fill="([^"]+)"/) || [])[1];

(async () => {
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/live22_conv.log'), path.join(DIR, 'fake_sd.txt'), '20', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrsd-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8150', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://127.0.0.1:8150/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(300);
  await p.evaluate(path => { const s = document.getElementById('f-serial-port'); s.append(new Option(path, path)); s.value = path; }, pty);
  await p.locator('button', { hasText: 'Connect' }).first().click(); await sleep(6000);

  const sd = await fakeStreamDeck();
  const plug = spawn('node', [path.join(PLUG, 'bin/plugin.js'), '-port', String(sd.port), '-pluginUUID', 'PLUGINCTX', '-registerEvent', 'registerPlugin', '-info', '{}']);
  let perr = ''; plug.stderr.on('data', d => perr += d);
  await sleep(500);
  console.log('registered:', JSON.stringify(sd.msgs.slice(0, 2)));
  const ok = sd.msgs.find(m => m.event === 'getGlobalSettings');
  sd.send({ event: 'didReceiveGlobalSettings', payload: { settings: { address: '127.0.0.1:8150' } } });
  const KEYS = [['rec', {}], ['stop', {}], ['tone', {}], ['hp', { mode: 'next' }], ['hp', { mode: '2' }], ['arm', { track: '3' }], ['arm', { track: '1' }],
    ['arm', { track: 'all' }], ['pfl', { fader: '1' }], ['pfl', { fader: 'off' }], ['status', {}]];
  KEYS.forEach(([a, s], i) => sd.send({ event: 'willAppear', action: 'com.gfssound.novaremote.' + a, context: 'k' + i, device: 'D', payload: { settings: s, coordinates: { column: i % 5, row: Math.floor(i / 5) } } }));
  await sleep(1500);
  const show = label => { console.log('--', label); KEYS.forEach(([a, s], i) => console.log(`  ${a}${JSON.stringify(s)}: [${fillOf(img(sd, 'k' + i))}] ${texts(img(sd, 'k' + i))}`)); };
  show('drawn from the Nova');
  const st = () => p.evaluate(async () => (await fetch('/api/status')).json());
  const press = async (ctx, ms) => { sd.send({ event: 'keyDown', action: '', context: ctx, payload: {} }); await sleep(ms); sd.send({ event: 'keyUp', action: '', context: ctx, payload: {} }); await sleep(700); };

  let s0 = await st(); await press('k2', 100); let s1 = await st();
  console.log('tone tap while off -> tone', s0.tone, '->', s1.tone, '| key:', texts(img(sd, 'k2')));
  await press('k2', 800); s1 = await st(); console.log('tone hold -> tone', s1.tone, '| key fill', fillOf(img(sd, 'k2')));
  await press('k2', 80); s1 = await st(); console.log('tone tap while on -> tone', s1.tone);
  s0 = await st(); await press('k5', 80); s1 = await st(); console.log('arm 3 tap: armed', s0.armed.includes(3), '->', s1.armed.includes(3), '| key', fillOf(img(sd, 'k5')), texts(img(sd, 'k5')));
  await press('k5', 80);
  s0 = await st(); await press('k3', 80); s1 = await st(); console.log('hp next:', s0.hp, '->', s1.hp, s1.hpName, '| key', texts(img(sd, 'k3')));
  await press('k4', 80); s1 = await st(); console.log('hp 2:', s1.hp, '| key', fillOf(img(sd, 'k4')), texts(img(sd, 'k4')));
  const alerts0 = sd.msgs.filter(m => m.event === 'showAlert').length;
  await press('k8', 80); console.log('pfl 1:', texts(img(sd, 'k8')), '| alerts +', sd.msgs.filter(m => m.event === 'showAlert').length - alerts0, '| faders', JSON.stringify((await st()).faders.slice(0, 3)));
  await press('k0', 150); console.log('rec tap:', texts(img(sd, 'k0')));
  const logs = () => p.evaluate(() => LOG.slice(-40).map(e => e.line).filter(l => /button API|RECORD|STOP/.test(l)).join(' // '));
  await press('k0', 800); await sleep(300); console.log('rec hold -> log:', (await logs()).slice(-300));
  await press('k1', 80); await sleep(300); console.log('stop tap (not recording here) -> log:', (await logs()).slice(-200));
  await press('k10', 50); console.log('status press ->', JSON.stringify(sd.msgs.filter(m => m.event === 'openUrl').pop()));
  sd.send({ event: 'propertyInspectorDidAppear', action: 'com.gfssound.novaremote.tone', context: 'k2' }); await sleep(700);
  console.log('to settings panel:', JSON.stringify((sd.msgs.filter(m => m.event === 'sendToPropertyInspector').pop() || {}).payload));
  sd.send({ event: 'sendToPlugin', action: 'com.gfssound.novaremote.tone', context: 'k2', payload: { type: 'address', address: '127.0.0.1:8199' } }); await sleep(2600);
  console.log('wrong address ->', texts(img(sd, 'k2')), '|', (sd.msgs.filter(m => m.event === 'sendToPropertyInspector').pop() || {}).payload.text);
  console.log('saved global:', JSON.stringify(sd.msgs.filter(m => m.event === 'setGlobalSettings').pop()));

  // pictures of every key, for a look
  sd.send({ event: 'sendToPlugin', action: 'x', context: 'k2', payload: { type: 'address', address: '127.0.0.1:8150' } }); await sleep(1500);
  const svgs = KEYS.map((_, i) => img(sd, 'k' + i));
  const q = await b.newPage({ viewport: { width: 5 * 160 + 20, height: 3 * 160 + 20 }, deviceScaleFactor: 1 });
  await q.setContent(`<body style="margin:0;padding:10px;background:#000;display:flex;flex-wrap:wrap;gap:16px">${svgs.map(s => `<div style="width:144px;height:144px">${s}</div>`).join('')}</body>`);
  await q.screenshot({ path: path.join(DIR, 'sd-keys.png') });
  console.log('plugin stderr:', perr || 'none');
  plug.kill(); sd.close(); await b.close(); srv.kill(); fake.kill(); fs.rmSync(data, { recursive: true });
})().catch(e => { console.error(e); process.exit(1); });
