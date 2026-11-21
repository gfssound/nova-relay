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
  const OUT = path.join(DIR, 'fake_sd2.txt');
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(DIR, 'files/live22_buttons.log'), OUT, '40', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrsd-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8153', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8153/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(300);
  await p.evaluate(path => { const s = document.getElementById('f-serial-port'); s.append(new Option(path, path)); s.value = path; }, pty);
  await p.locator('button', { hasText: /^Connect$/ }).first().click(); const t0 = Date.now(); const at = s => sleep(Math.max(0, t0 + s * 1000 - Date.now()));
  const sd = await fakeStreamDeck();
  const plug = spawn('node', [path.join(PLUG, 'bin/plugin.js'), '-port', String(sd.port), '-pluginUUID', 'PLUGINCTX', '-registerEvent', 'registerPlugin', '-info', '{}']);
  let perr = ''; plug.stderr.on('data', d => perr += d);
  await sleep(400); sd.send({ event: 'didReceiveGlobalSettings', payload: { settings: { address: '127.0.0.1:8153' } } });
  const KEYS = [['slate', {}], ['com', {}], ['slate', { mode: 'latch' }]];
  KEYS.forEach(([a, s], i) => sd.send({ event: 'willAppear', action: 'com.gfssound.novaremote.' + a, context: 's' + i, device: 'D', payload: { settings: s } }));
  // a folder of Arm keys and PFL keys dragged in one by one (no settings), on another device too
  for (let i = 0; i < 5; i++) { sd.send({ event: 'willAppear', action: 'com.gfssound.novaremote.arm', context: 'a' + i, device: 'D', payload: { settings: {} } }); await sleep(30); }
  sd.send({ event: 'willAppear', action: 'com.gfssound.novaremote.arm', context: 'x0', device: 'OTHER', payload: { settings: {} } });
  for (let i = 0; i < 3; i++) { sd.send({ event: 'willAppear', action: 'com.gfssound.novaremote.pfl', context: 'p' + i, device: 'D', payload: { settings: {} } }); await sleep(30); }
  await sleep(300);
  console.log('auto-numbered arm keys:', sd.msgs.filter(m => m.event === 'setSettings' && /^a|^x/.test(m.context)).map(m => m.context + '=' + m.payload.track).join(' '));
  console.log('auto-numbered pfl keys:', sd.msgs.filter(m => m.event === 'setSettings' && /^p/.test(m.context)).map(m => m.context + '=' + m.payload.fader).join(' '));
  const sent = () => fs.readFileSync(OUT, 'utf8').split('\n').filter(l => / 25 (90|A3) /.test(l)).map(l => l.split(' ').slice(-2).join(' '));
  const st = () => p.evaluate(async () => (await fetch('/api/status')).json());
  await at(6);
  console.log('before: slateMic', (await st()).slateMic, 'comKnown', (await st()).comKnown, '| slate key:', texts(img(sd, 's0')));
  sd.send({ event: 'keyDown', context: 's0', payload: {} }); await sleep(500);
  console.log('slate held: slateMic', (await st()).slateMic, '| key', fillOf(img(sd, 's0')), texts(img(sd, 's0')));
  sd.send({ event: 'keyUp', context: 's0', payload: {} }); await sleep(500);
  console.log('slate let go: slateMic', (await st()).slateMic, '| to Nova:', sent().join(', '));
  const al = sd.msgs.filter(m => m.event === 'showAlert').length;
  sd.send({ event: 'keyDown', context: 's1', payload: {} }); await sleep(400); sd.send({ event: 'keyUp', context: 's1', payload: {} }); await sleep(500);
  console.log('com before learning: alerts +', sd.msgs.filter(m => m.event === 'showAlert').length - al, '|', texts(img(sd, 's1')));
  await at(10.5); console.log('Aria Slate held (replay): slateMic', (await st()).slateMic, '| key', fillOf(img(sd, 's0')), '| latch key', fillOf(img(sd, 's2')));
  await at(11.8); console.log('Aria Slate let go: slateMic', (await st()).slateMic);
  await p.evaluate(() => { setupSec = 'deck'; go('setup'); }); await sleep(300);
  console.log('Setup com row:', await p.locator('.deckrow', { hasText: 'Com' }).first().innerText());
  await p.locator('.deckrow', { hasText: 'Com' }).first().locator('button', { hasText: 'Learn' }).click(); await sleep(400);
  console.log('learning row:', (await p.locator('.deckrow', { hasText: 'Com' }).first().innerText()).replace(/\s+/g, ' '));
  for (let i = 0; i < 60 && !(await st()).comKnown; i++) await sleep(250);   /* until the replayed Aria press arrives */
  console.log('after Aria press: row:', (await p.locator('.deckrow', { hasText: 'Com' }).first().innerText()).replace(/\s+/g, ' '), '| comKnown', (await st()).comKnown);
  sd.send({ event: 'keyDown', context: 's1', payload: {} }); await sleep(600);
  console.log('com held: comMic', (await st()).comMic, '| key', fillOf(img(sd, 's1')), texts(img(sd, 's1')));
  sd.send({ event: 'keyUp', context: 's1', payload: {} }); await sleep(500);
  sd.send({ event: 'keyDown', context: 's2', payload: {} }); sd.send({ event: 'keyUp', context: 's2', payload: {} }); await sleep(600);
  console.log('latch tap: slateMic', (await st()).slateMic);
  sd.send({ event: 'keyDown', context: 's2', payload: {} }); sd.send({ event: 'keyUp', context: 's2', payload: {} }); await sleep(600);
  console.log('latch tap again: slateMic', (await st()).slateMic);
  // a key that disappears while held (folder closed) lets go
  sd.send({ event: 'keyDown', context: 's0', payload: {} }); await sleep(400); sd.send({ event: 'willDisappear', context: 's0', payload: {} }); await sleep(500);
  console.log('held key closed: slateMic', (await st()).slateMic);
  console.log('all sent to Nova:', sent().join(', '));
  console.log('nova-link buttons:', JSON.stringify(JSON.parse(fs.readFileSync(path.join(data, 'nova-link.json'), 'utf8')).buttons));
  const r = await p.evaluate(async () => { const a = await fetch('/api/com/sideways'); return a.status + ' ' + (await a.json()).error; }); console.log('bad address:', r);
  console.log('page errors', errs, '| plugin stderr', perr || 'none');
  plug.kill(); sd.close(); await b.close(); srv.kill(); fake.kill(); fs.rmSync(data, { recursive: true });
})().catch(e => { console.error(e); process.exit(1); });
