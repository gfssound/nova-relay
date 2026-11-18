/* Nov 1: the test-send tool against a replayed Nova (live20, which reports RX 2 trim and TX state). */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const rx = path.join(DIR, 'fake_ts.txt');
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/live20_conv.log'), rx, '60', '8']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8141', '--no-open', '--data', data]);
  await sleep(800);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  await p.goto('http://localhost:8141/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd' }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 15000 });
  await sleep(35000);  // RX 2 trim reported by now
  await p.evaluate(() => { setupSec = 'conn'; go('setup'); }); await sleep(400);
  await p.check('#f-testtools');
  await p.selectOption('#f-test-rx', '1'); await p.selectOption('#f-test-kind', 'trim');
  console.log('now:', await p.locator('#f-test-trim').evaluate(e => e.parentElement.parentElement.parentElement.nextElementSibling.textContent));
  await p.locator('button', { hasText: 'Use current value' }).click();
  console.log('trim box', await p.inputValue('#f-test-trim'));
  await p.locator('button', { hasText: 'Send to the Nova' }).click();
  console.log('first press sent?', fs.readFileSync(rx, 'utf8').split('\n').filter(l => / 00 50 81 /.test(l)).length);
  await p.locator('button', { hasText: 'Press again to send' }).click(); await sleep(3200);
  console.log('frames:', fs.readFileSync(rx, 'utf8').split('\n').filter(l => / 00 50 (81|03) /.test(l)).join(' | '));
  console.log('result:', await p.locator('#f-testtools').evaluate(() => [...document.querySelectorAll('[role=status]')].map(e => e.textContent).filter(t => /Test|trim|Nova (now|is)/.test(t)).join(' / ')));
  await p.selectOption('#f-test-kind', 'tx'); await p.selectOption('#f-test-tx', 'Standby');
  await p.locator('button', { hasText: 'Send to the Nova' }).click(); await p.locator('button', { hasText: 'Press again to send' }).click(); await sleep(3200);
  console.log('frames:', fs.readFileSync(rx, 'utf8').split('\n').filter(l => / 00 50 03 /.test(l)).join(' | '));
  await p.locator('#f-testtools').scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(DIR, 'testsend.png'), fullPage: true });
  await b.close(); srv.kill(); fake.kill();
})().catch(e => { console.error(e); process.exit(1); });
