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
  const OUT = path.join(DIR, 'fake_sd4.txt');
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/live22_conv.log'), OUT, '60', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(DIR, 'nrsd-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8155', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8155/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(300);
  await p.evaluate(path => { const s = document.getElementById('f-serial-port'); s.append(new Option(path, path)); s.value = path; }, pty);
  await p.locator('button', { hasText: /^Connect$/ }).first().click(); await sleep(9000);
  const sd = await fakeStreamDeck();
  const plug = spawn('node', [path.join(PLUG, 'bin/plugin.js'), '-port', String(sd.port), '-pluginUUID', 'PLUGINCTX', '-registerEvent', 'registerPlugin', '-info', '{}']);
  let perr = ''; plug.stderr.on('data', d => perr += d);
  await sleep(400); sd.send({ event: 'didReceiveGlobalSettings', payload: { settings: { address: '127.0.0.1:8155' } } });
  const KEYS = [['rec', {}], ['scene', { mode: 'number' }], ['scene', { mode: 'letter' }], ['take', { mode: 'up' }], ['take', { mode: 'down' }], ['note', { preset: '4' }], ['note', { kind: 'text', text: 'circle' }], ['lasttake', {}],
    ['armset', { name: 'Interview', tracks: '3,4,5' }], ['meter', { source: 't3' }], ['meter', { source: 'o1' }], ['rx', { rx: '1' }], ['rx', { rx: '2' }], ['page', { input: '15' }], ['route', { out: '3', what: 'com1' }],
    ['route', { out: '5', what: 'track-3' }], ['route', { out: '1', what: 'input-15' }], ['route', { out: '1', what: 'track-3' }], ['jam', { mode: 'tc' }], ['trimdial', { input: '15' }, 'Encoder'], ['hpdial', {}, 'Encoder'], ['note', {}], ['note', {}], ['rx', {}], ['trimdial', { mode: 'znet', input: '18' }, 'Encoder']];
  KEYS.forEach(([a, s, ctl], i) => sd.send({ event: 'willAppear', action: 'com.gfssound.novaremote.' + a, context: 'k' + i, device: 'D', payload: { settings: s, controller: ctl || 'Keypad' } }));
  await sleep(1500);
  const fb = ctx => (sd.msgs.filter(m => m.event === 'setFeedback' && m.context === ctx).pop() || {}).payload;
  const line = i => { const [a, s, ctl] = KEYS[i]; return ctl ? `${a}: ${JSON.stringify(fb('k' + i))}` : `${a}${JSON.stringify(s)}: [${fillOf(img(sd, 'k' + i))}] ${texts(img(sd, 'k' + i))}`; };
  console.log('-- drawn'); KEYS.forEach((_, i) => console.log('  ' + line(i)));
  console.log('auto-numbered:', sd.msgs.filter(m => m.event === 'setSettings').map(m => m.context + '=' + JSON.stringify(m.payload)).join(' '));
  const st = () => p.evaluate(async () => (await fetch('/api/status')).json());
  const press = async (ctx, ms = 80) => { sd.send({ event: 'keyDown', context: ctx, payload: {} }); await sleep(ms); sd.send({ event: 'keyUp', context: ctx, payload: {} }); await sleep(600); };
  let s0 = await st(); await press('k1'); let s1 = await st(); console.log('scene number:', s0.sceneNext, '/', s0.takeNext, '->', s1.sceneNext, '/', s1.takeNext, '|', line(1));
  await press('k2'); s1 = await st(); console.log('scene letter ->', s1.sceneNext, '/', s1.takeNext);
  await press('k3'); await press('k3'); s1 = await st(); console.log('take +1 twice ->', s1.takeNext); await press('k4'); s1 = await st(); console.log('take -1 ->', s1.takeNext);
  await press('k5'); s1 = await st(); console.log('note preset 4 ->', JSON.stringify(s1.noteNext), '|', line(5)); await press('k5'); s1 = await st(); console.log('again clears ->', JSON.stringify(s1.noteNext));
  await press('k6'); s1 = await st(); console.log('own words ->', JSON.stringify(s1.noteNext), '|', line(6));
  await press('k8'); s1 = await st(); console.log('arm set 3,4,5 -> armed', JSON.stringify(s1.armed), '|', line(8));
  await press('k14'); s1 = await st(); console.log('route com1 OUT3 ->', s1.outs[2].com1, '|', line(14)); await press('k14'); console.log('again ->', (await st()).outs[2].com1);
  await press('k15'); s1 = await st(); console.log('route track3 OUT5 ->', JSON.stringify(s1.outs[4].routes), '|', line(15)); await press('k15');
  await press('k16'); s1 = await st(); console.log('route input15 OUT1 ->', JSON.stringify(s1.outs[0].routes.filter(r => r.sx === 14)), '|', line(16)); await press('k16');
  const al = sd.msgs.filter(m => m.event === 'showAlert').length; await press('k13'); console.log('page 15:', line(13), '| alerts +', sd.msgs.filter(m => m.event === 'showAlert').length - al);
  await press('k18', 100); console.log('jam tap:', line(18)); await press('k18', 800); console.log('jam hold -> log:', await p.evaluate(() => LOG.slice(-30).map(e => e.line).filter(l => /JAM|jam/.test(l)).slice(-2).join(' // ')));
  sd.send({ event: 'dialRotate', context: 'k19', payload: { ticks: 3 } }); await sleep(900); s1 = await st(); console.log('trim dial +3 -> RX1 trim', s1.inputs[14].trim, '|', JSON.stringify(fb('k19')));
  sd.send({ event: 'dialRotate', context: 'k19', payload: { ticks: -3 } }); await sleep(900); console.log('trim dial -3 ->', (await st()).inputs[14].trim);
  s0 = await st(); sd.send({ event: 'dialRotate', context: 'k20', payload: { ticks: 1 } }); await sleep(900); s1 = await st(); console.log('hp dial +1:', s0.hp, '->', s1.hp, '|', JSON.stringify(fb('k20')));
  sd.send({ event: 'dialRotate', context: 'k20', payload: { ticks: -1 } }); await sleep(700);
  console.log('meter frames sent in 2 s:', await (async () => { const n0 = sd.msgs.filter(m => m.event === 'setImage' && m.context === 'k9').length; await sleep(2000); return sd.msgs.filter(m => m.event === 'setImage' && m.context === 'k9').length - n0; })(), '|', line(9));
  /* Nov 10: ZNet trim dial (RX 4): unknown at first, then set once by API and turned */
  { const zk = 'k' + (KEYS.length - 1);
    sd.send({ event: 'dialRotate', context: zk, payload: { ticks: 1 } }); await sleep(600);
    console.log('znet dial while unknown -> alert:', sd.msgs.some(m => m.event === 'showAlert' && m.context === zk), '|', JSON.stringify(fb(zk)));
    await p.evaluate(async () => fetch('/api/znet/4/set/20')); await sleep(900);
    sd.send({ event: 'dialRotate', context: zk, payload: { ticks: 2 } }); await sleep(900);
    const r4 = (await st()).receivers[3]; console.log('znet dial +2 -> RX4', r4.znetTrim, r4.znetFrom, '|', JSON.stringify(fb(zk))); }
  const svgs = KEYS.map((k, i) => k[2] ? '' : img(sd, 'k' + i)).filter(Boolean);
  const q = await b.newPage({ viewport: { width: 5 * 160 + 20, height: Math.ceil(svgs.length / 5) * 160 + 20 } });
  await q.setContent(`<body style="margin:0;padding:10px;background:#000;display:flex;flex-wrap:wrap;gap:16px">${svgs.map(s => `<div style="width:144px;height:144px">${s}</div>`).join('')}</body>`);
  await q.screenshot({ path: path.join(DIR, 'sd-more.png') });
  console.log('page errors', errs, '| plugin stderr', perr || 'none');
  plug.kill(); sd.close(); await b.close(); srv.kill(); fake.kill(); fs.rmSync(data, { recursive: true });
})().catch(e => { console.error(e); process.exit(1); });
