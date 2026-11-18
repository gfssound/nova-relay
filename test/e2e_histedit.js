/* Nov 1: take history edits must not be written to the Nova (writing them froze it). */
const { spawn } = require('child_process');  const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const rxFile = path.join(DIR, 'fake_hist.txt');
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/tap1101.log'), rxFile, '40', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nr-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8133', '--no-open', '--data', data]);
  await sleep(800);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  await p.goto('http://localhost:8133/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd' }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 15000 });
  await p.waitForFunction(() => (V['metadata.history'] || []).some(Boolean), null, { timeout: 15000 });
  const t0 = Date.now(); await p.waitForFunction(() => cart.nova && !cart.nova.loading, null, { timeout: 30000 });   /* Nov 18: changes wait until the Nova's settings are read */
  console.log('settings read after', ((Date.now() - t0) / 1000).toFixed(1), 's');
  const before = await p.evaluate(() => V['metadata.history'].find(Boolean));
  await p.evaluate(() => go('meta')); await sleep(300);
  await p.locator('tr.hrow').first().click();
  await p.fill('#hist-scene', 'EDITED'); await p.keyboard.press('Enter'); await sleep(1500);
  const after = await p.evaluate(() => V['metadata.history'].find(Boolean));
  const sent = fs.readFileSync(rxFile, 'utf8').split('\n').filter(l => / 55 3A /.test(l)); console.log(sent.join('\n'));
  const edits = fs.existsSync(path.join(data, 'history-edits.json')) ? JSON.parse(fs.readFileSync(path.join(data, 'history-edits.json'), 'utf8')) : null;
  const log = await p.evaluate(() => LOG.filter(e => /history|Segment/.test(e.line)).map(e => e.line));
  console.log('before', before.seg, before.scene, '| after', after.scene, after.edited, '| SET 58 frames sent:', sent.length, '| saved', JSON.stringify(edits), '\n', log.join('\n '));
  await p.screenshot({ path: path.join(DIR, 'histedit.png') });
  await p.locator('tr.hrow').first().click(); await sleep(200); await p.screenshot({ path: path.join(DIR, 'histedit2.png') });
  await p.locator('.modal button', { hasText: 'Revert' }).click(); await sleep(1200);
  const rv = await p.evaluate(() => V['metadata.history'].find(Boolean)); const ed2 = JSON.parse(fs.readFileSync(path.join(data, 'history-edits.json'), 'utf8'));
  console.log('reverted', rv.scene, rv.edited, JSON.stringify(ed2), 'SET 58 sent', fs.readFileSync(rxFile, 'utf8').split('\n').filter(l => / 55 3A /.test(l)).length);
  await b.close(); srv.kill(); fake.kill();
})().catch(e => { console.error(e); process.exit(1); });
