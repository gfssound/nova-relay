const { chromium } = require('playwright'); const path = require('path'); const http = require('http'), crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const msgs = []; let sock = null;
  const srv = http.createServer(); srv.on('upgrade', (req, s) => { sock = s;
    const acc = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    s.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acc}\r\n\r\n`);
    let buf = Buffer.alloc(0); s.on('data', d => { buf = Buffer.concat([buf, d]); for (;;) { if (buf.length < 2) return; let len = buf[1] & 0x7f, off = 2; if (len === 126) { len = buf.readUInt16BE(2); off = 4; }
      const mk = buf.slice(off, off + 4); off += 4; if (buf.length < off + len) return; const p = Buffer.from(buf.slice(off, off + len)); for (let i = 0; i < p.length; i++) p[i] ^= mk[i & 3]; buf = buf.slice(off + len); try { msgs.push(JSON.parse(p)); } catch (_) {} } }); });
  const sendPI = o => { const p = Buffer.from(JSON.stringify(o)); sock.write(Buffer.concat([p.length < 126 ? Buffer.from([0x81, p.length]) : Buffer.from([0x81, 126, p.length >> 8, p.length & 255]), p])); };
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 420 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve('streamdeck/com.gfssound.novaremote.sdPlugin/ui/settings.html'));
  await p.evaluate(port => connectElgatoStreamDeckSocket(port, 'PI1', 'registerPropertyInspector', '{}', JSON.stringify({ action: 'com.gfssound.novaremote.arm', context: 'k5', payload: { settings: { track: '3' } } })), port);
  await sleep(400);
  console.log('PI registered:', msgs.map(m => m.event + (m.payload && m.payload.type ? ':' + m.payload.type : '')).join(', '));
  console.log('track select shows:', await p.inputValue('#o-track'));
  await p.selectOption('#o-track', 'all'); await sleep(200);
  console.log('after picking All:', JSON.stringify(msgs.filter(m => m.event === 'setSettings').pop()));
  sendPI({ event: 'sendToPropertyInspector', payload: { type: 'conn', ok: true, text: 'Connected to Nova Remote 0.4.18 at http://127.0.0.1:8080. The Nova is connected.', address: '' } }); await sleep(200);
  await p.fill('#address', '192.168.1.20:8080'); await p.press('#address', 'Enter'); await sleep(200);
  console.log('address sent:', JSON.stringify(msgs.filter(m => m.payload && m.payload.type === 'address').pop().payload));
  await p.screenshot({ path: 'test/sd-pi.png' });
  await p.evaluate(port => connectElgatoStreamDeckSocket(port, 'PI3', 'registerPropertyInspector', '{}', JSON.stringify({ action: 'com.gfssound.novaremote.armset', context: 'k9', payload: { settings: { tracks: '3,4' } } })), port);
  await sleep(300);
  console.log('arm set ticks:', await p.$$eval('.tracks input:checked', cs => cs.map(c => c.value).join(',')));
  await p.locator('.tracks label', { hasText: /^ 5$/ }).locator('input').check(); await sleep(150);
  await p.fill('#o-name', 'Interview'); await p.press('#o-name', 'Tab'); await sleep(150);
  console.log('arm set saved:', JSON.stringify(msgs.filter(m => m.event === 'setSettings').pop().payload));
  await p.screenshot({ path: 'test/sd-pi-armset.png' });
  for (const a of ['rec', 'stop', 'tone', 'slate', 'hp', 'pfl', 'scene', 'take', 'note', 'meter', 'rx', 'page', 'route', 'jam', 'trimdial', 'drive', 'battery', 'mirror', 'status']) {
    await p.evaluate(a => connectElgatoStreamDeckSocket(0, 'PI2', 'x', '{}', JSON.stringify({ action: 'com.gfssound.novaremote.' + a, context: 'c', payload: { settings: {} } })), a).catch(() => {});
    console.log(a, '->', (await p.$$eval('#opts .row', rs => rs.map(r => r.innerText.replace(/\s+/g, ' ').trim().slice(0, 60)).join(' / '))) || '(info only)');
  }
  console.log('errors', errs); await b.close(); srv.close(); process.exit(0);
})();
