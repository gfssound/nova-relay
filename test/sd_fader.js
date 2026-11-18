/* Nov 14 (0.6.1): Stream Deck fader dial and fader step keys against Nova Relay on a replay of the direct capture. */

const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const http = require('http'), crypto = require('crypto');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const PLUG = path.join(ROOT, 'streamdeck/com.gfssound.novaremote.sdPlugin');

function fakeStreamDeck() {
  const srv = http.createServer(); const ev = { msgs: [], sock: null };
  srv.on('upgrade', (req, sock) => {
    const acc = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acc}\r\n\r\n`);
    ev.sock = sock; sock.on("error", () => {}); let buf = Buffer.alloc(0);
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

const fb = (sd, ctx) => { const m = sd.msgs.filter(x => x.event === 'setFeedback' && x.context === ctx).pop(); return m ? `${m.payload.title} => ${m.payload.value}` : '(none)'; };
const alerts = (sd, ctx) => sd.msgs.filter(x => x.event === 'showAlert' && x.context === ctx).length;
(async () => {
  const OUT = path.join(DIR, 'fake_sdf.txt'); try { fs.unlinkSync(OUT); } catch (_) {}
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/direct1_conv.log'), OUT, '100', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrsdf-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8157', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8157/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(pt => net.send({ t: 'serialOpen', path: pt, baud: 38400, parity: 'odd', listen: false }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 40000 }); await sleep(2500);
  const sd = await fakeStreamDeck();
  const plug = spawn('node', [path.join(PLUG, 'bin/plugin.js'), '-port', String(sd.port), '-pluginUUID', 'PLUGINCTX', '-registerEvent', 'registerPlugin', '-info', '{}']);
  let perr = ''; plug.stderr.on('data', d => perr += d);
  await sleep(400); sd.send({ event: 'didReceiveGlobalSettings', payload: { settings: { address: '127.0.0.1:8157' } } });
  const A = 'com.gfssound.novaremote.';
  sd.send({ event: 'willAppear', action: A + 'faderdial', context: 'dial', device: 'D', payload: { settings: { input: '15' }, controller: 'Encoder' } });
  sd.send({ event: 'willAppear', action: A + 'faderstep', context: 'up', device: 'D', payload: { settings: { input: '15', dir: 'up' } } });
  sd.send({ event: 'willAppear', action: A + 'faderstep', context: 'dn', device: 'D', payload: { settings: { input: '15', dir: 'down', step: '10' } } });
  sd.send({ event: 'willAppear', action: A + 'faderstep', context: 'an1', device: 'D', payload: { settings: { input: '1' } } });
  await sleep(1800);
  console.log('dial (unset):  ', fb(sd, 'dial'));
  console.log('step up (unset):', texts(img(sd, 'up')), '| Analog 1:', texts(img(sd, 'an1')));
  sd.send({ event: 'dialRotate', context: 'dial', payload: { ticks: 3 } }); await sleep(400);
  console.log('turn while unset -> alerts:', alerts(sd, 'dial'));
  await p.evaluate(async () => fetch('/api/fader/15/set/128')); await sleep(1500);
  console.log('after set 128:  ', fb(sd, 'dial'));
  for (let i = 0; i < 5; i++) { sd.send({ event: 'dialRotate', context: 'dial', payload: { ticks: 1 } }); await sleep(30); }
  await sleep(900);
  const pos = async () => p.evaluate(async () => (await (await fetch('/api/status')).json()).inputs[14]);
  console.log('after +5 clicks:', fb(sd, 'dial'), '| server pos', (await pos()).faderPos);
  sd.send({ event: 'dialDown', context: 'dial', payload: {} }); await sleep(1200);
  console.log('press (down):   ', fb(sd, 'dial'));
  sd.send({ event: 'dialDown', context: 'dial', payload: {} }); await sleep(1200);
  console.log('press (back):   ', fb(sd, 'dial'));
  sd.send({ event: 'keyDown', context: 'up', payload: {} }); await sleep(60); sd.send({ event: 'keyUp', context: 'up', payload: {} }); await sleep(900);
  console.log('step up tap:    ', (await pos()).faderPos, '|', texts(img(sd, 'up')));
  sd.send({ event: 'keyDown', context: 'dn', payload: {} }); await sleep(1300); sd.send({ event: 'keyUp', context: 'dn', payload: {} }); await sleep(900);
  console.log('step down held 1.3 s (10/step):', (await pos()).faderPos);
  sd.send({ event: 'keyDown', context: 'an1', payload: {} }); await sleep(200); sd.send({ event: 'keyUp', context: 'an1', payload: {} });
  console.log('Analog 1 press -> alerts:', alerts(sd, 'an1'));
  plug.kill(); sd.close(); await b.close(); srv.kill(); fake.kill(); await sleep(300);
  const fr = fs.readFileSync(OUT, 'utf8').split('\n').filter(l => / 00 22 /.test(l)).map(l => parseInt(l.trim().split(' ').slice(1)[7], 16));
  console.log('fader values the Nova got:', fr.join(' '));
  console.log('plugin errors:', perr.trim() || 'none', '| page errors:', errs.length ? errs : 'none');
  fs.rmSync(data, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
