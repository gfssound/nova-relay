/* Nov 18: the cart computer (or the box) can't reach GitHub but the phone can (cellular): the phone checks GitHub
   itself, shows the update, and on Install downloads it and sends it to the cart computer. GitHub is stood in for by
   the browser's own network layer (page.route), which only the phone can reach. */
const { spawn, execFileSync } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
const W = fs.mkdtempSync(path.join(DIR, 'updd-')), PORT = 8331, URL0 = 'http://127.0.0.1:8339/updates/latest.json';   /* nothing listens on 8339 */
const FILES = ['README.md', 'nova.js', 'package.json', 'public', 'schema.json', 'server.js', 'deck', 'update.js', 'diag.js'];
function makeApp(dest, version, sign) {
  fs.mkdirSync(dest, { recursive: true }); for (const f of FILES) fs.cpSync(path.join(ROOT, 'nova-remote', f), path.join(dest, f), { recursive: true });
  const pj = JSON.parse(fs.readFileSync(path.join(dest, 'package.json'), 'utf8')); pj.version = version; fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(pj));
  const sv = path.join(dest, 'server.js'); fs.writeFileSync(sv, fs.readFileSync(sv, 'utf8').replace(/const VERSION = "[^"]+";/, `const VERSION = "${version}";`));
  if (sign) execFileSync('node', [path.join(ROOT, 'tools/sign_update.js'), dest], { stdio: 'pipe' });
  return dest;
}
const killAll = () => { try { execFileSync('pkill', ['-f', '--', `server.js --port ${PORT} `], { stdio: 'ignore' }); } catch (_) { } };
(async () => {
  const base = makeApp(path.join(W, 'base'), '0.6.5', false), up = makeApp(path.join(W, 'up', 'app'), '0.6.11', true);
  const zip = path.join(W, 'u.zip'); execFileSync('zip', ['-qrX', zip, 'app'], { cwd: path.join(W, 'up') }); const zb = fs.readFileSync(zip);
  const latest = JSON.stringify({ version: '0.6.11', file: 'Nova-Relay-0.6.11-update.zip', sha256: crypto.createHash('sha256').update(zb).digest('hex'), size: zb.length, notes: ['Phone-fetched'] });
  killAll(); const data = path.join(W, 'data');
  spawn('node', [path.join(base, 'server.js'), '--port', String(PORT), '--no-open', '--no-auto', '--data', data], { env: { ...process.env, NOVA_UPDATE_URL: URL0 }, stdio: 'ignore' });
  await sleep(1000);
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route(/127\.0\.0\.1:8339\/updates\/latest\.json/, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: latest }));
  await p.route(/127\.0\.0\.1:8339\/updates\/Nova-Relay-0\.6\.11-update\.zip/, r => r.fulfill({ status: 200, contentType: 'application/zip', headers: { 'Access-Control-Allow-Origin': '*' }, body: zb }));
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.waitForFunction(() => cart.ready && cart.update);
  await p.evaluate(() => { setupSec = 'update'; go('setup'); }); await sleep(300);
  await p.click('text=Check now');
  await p.waitForFunction(() => updState().available, null, { timeout: 15000 }).catch(() => { });
  check(await p.evaluate(() => cart.update.offline && updState().viaDevice && updState().latest.version === '0.6.11'), 'the cart computer couldn\'t reach GitHub; the phone found 0.6.11 itself');
  await p.click('text=Install 0.6.11'); await p.click('text=Tap again: install 0.6.11');
  await p.waitForFunction(() => cart.update && cart.update.running === '0.6.11', null, { timeout: 30000 }).catch(() => { });
  check(await p.evaluate(() => cart.update && cart.update.running) === '0.6.11', 'the phone downloaded it, sent it over, and the cart computer restarted into it');
  await b.close(); killAll(); fs.rmSync(W, { recursive: true, force: true });
  console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); killAll(); process.exit(1); });
