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
  const LOG = process.argv[2] || 'cap/live22_conv.log';
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, LOG), path.join(DIR, 'fake_sd3.txt'), '30', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrsd-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8154', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('http://127.0.0.1:8154/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(300);
  await p.evaluate(path => { const s = document.getElementById('f-serial-port'); s.append(new Option(path, path)); s.value = path; }, pty);
  const sd = await fakeStreamDeck();
  const plug = spawn('node', [path.join(PLUG, 'bin/plugin.js'), '-port', String(sd.port), '-pluginUUID', 'PLUGINCTX', '-registerEvent', 'registerPlugin', '-info', '{}']);
  let perr = ''; plug.stderr.on('data', d => perr += d);
  await sleep(400); sd.send({ event: 'didReceiveGlobalSettings', payload: { settings: { address: '127.0.0.1:8154' } } });
  const KEYS = [['meter', { source: 't1' }], ['meter', { source: 't2' }], ['meter', { source: 't11' }], ['meter', { source: 'o1' }]];
  KEYS.forEach(([a, s], i) => sd.send({ event: 'willAppear', action: 'com.gfssound.novaremote.' + a, context: 'k' + i, device: 'D', payload: { settings: s } }));
  await sleep(1200);
  const show = label => { console.log('--', label); KEYS.forEach(([a, s], i) => console.log(`  ${a}${JSON.stringify(s)}: [${fillOf(img(sd, 'k' + i))}] ${texts(img(sd, 'k' + i))}`)); };
  show('no Nova yet');
  await p.locator('button', { hasText: /^Connect$/ }).first().click(); await sleep(12000);
  const st = await p.evaluate(async () => (await fetch('/api/status')).json());
  console.log('status:', JSON.stringify({ driveLeft: st.driveLeft, volts: st.volts, primaryFreeGB: st.primaryFreeGB, mirror: st.mirror }));
  show('with the Nova');
  console.log('api meters:', JSON.stringify(await p.evaluate(async () => (await fetch('/api/meters')).json())).slice(0, 220)); const n0 = sd.msgs.filter(m => m.event === 'setImage' && m.context === 'k0').length; await sleep(2000); console.log('meter frames in 2 s:', sd.msgs.filter(m => m.event === 'setImage' && m.context === 'k0').length - n0);
  const q = await b.newPage({ viewport: { width: 4 * 160 + 20, height: 2 * 160 + 20 } });
  await q.setContent(`<body style="margin:0;padding:10px;background:#000;display:flex;flex-wrap:wrap;gap:16px">${KEYS.map((_, i) => `<div style="width:144px;height:144px">${img(sd, 'k' + i)}</div>`).join('')}</body>`);
  await q.screenshot({ path: path.join(DIR, 'sd-meters.png') });
  console.log('plugin stderr:', perr || 'none');
  plug.kill(); sd.close(); await b.close(); srv.kill(); fake.kill(); fs.rmSync(data, { recursive: true });
})().catch(e => { console.error(e); process.exit(1); });
