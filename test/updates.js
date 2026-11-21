/* Nov 18: Setup › Updates end to end (Ferris: "make it read from the repository so that it alerts to an update and gives
   them the option to install it or not. Relay should never auto-update in the event something gets broken").
   An app copy at 0.6.5 (the "installed app"), signed test updates 0.6.9 and 0.6.10, a stand-in for GitHub
   (updates/latest.json + the zip), the real page:
   A. install from a file on the page → Nova Relay restarts by itself into 0.6.9 (installed in the data folder)
   B. refused: a changed file, no signature, a wrong key, an older version
   C. GitHub: the check finds 0.6.10 and says so, and NOTHING installs by itself (waits); two taps install it
   D. Go back → 0.6.9 → Go back → the app's own 0.6.5
   E. an update that can't start: after 3 tries the app's own version runs and says so
   F. the AppImage window restarts its server (exit 75); the box exits for systemd (exit 0) */
const { spawn, execFileSync } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const http = require('http'); const crypto = require('crypto');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
const W = fs.mkdtempSync(path.join(DIR, 'upd-')), PORT = 8321, GH = 8322;
const FILES = ['README.md', 'nova.js', 'package.json', 'public', 'schema.json', 'server.js', 'deck', 'update.js', 'diag.js'];
function makeApp(dest, version, { sign = true, key, tweak } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const f of FILES) fs.cpSync(path.join(ROOT, 'nova-remote', f), path.join(dest, f), { recursive: true });
  const pj = JSON.parse(fs.readFileSync(path.join(dest, 'package.json'), 'utf8')); pj.version = version; fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(pj, null, 2));
  const sv = path.join(dest, 'server.js'); fs.writeFileSync(sv, fs.readFileSync(sv, 'utf8').replace(/const VERSION = "[^"]+";/, `const VERSION = "${version}";`));
  if (tweak) tweak(dest);
  if (sign) { fs.writeFileSync(path.join(W, 'notes.txt'), `Test update ${version}\n`); execFileSync('node', [path.join(ROOT, 'tools/sign_update.js'), dest, path.join(W, 'notes.txt')], { env: { ...process.env, ...(key ? { NOVA_SIGNING_KEY: key } : {}) }, stdio: 'pipe' }); }
  return dest;
}
function zipApp(appDir, zipFile) { const t = path.join(W, 'z-' + path.basename(zipFile, '.zip')); fs.rmSync(t, { recursive: true, force: true }); fs.mkdirSync(t); fs.cpSync(appDir, path.join(t, 'app'), { recursive: true }); fs.rmSync(zipFile, { force: true }); execFileSync('zip', ['-qrX', zipFile, 'app'], { cwd: t }); return zipFile; }
const ghRoot = path.join(W, 'gh'); fs.mkdirSync(path.join(ghRoot, 'updates'), { recursive: true });
const gh = http.createServer((q, r) => { const f = path.join(ghRoot, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f)) { r.writeHead(404).end(); return; } r.writeHead(200, { 'Access-Control-Allow-Origin': '*' }).end(fs.readFileSync(f)); }).listen(GH);
let log = '';
const DATA = path.join(W, 'data'); fs.mkdirSync(DATA);
const startServer = (app, env = {}) => { const s = spawn('node', [path.join(app, 'server.js'), '--port', String(PORT), '--no-open', '--no-auto', '--data', DATA], { env: { ...process.env, NOVA_UPDATE_URL: `http://127.0.0.1:${GH}/updates/latest.json`, ...env } }); s.stdout.on('data', d => log += d); s.stderr.on('data', d => log += d); return s; };
const killAll = () => { try { execFileSync('pkill', ['-f', '--', `server.js --port ${PORT} `], { stdio: 'ignore' }); } catch (_) { } };
(async () => {
  const base = makeApp(path.join(W, 'base'), '0.6.5', { sign: false });
  const up9 = zipApp(makeApp(path.join(W, 'u9'), '0.6.9'), path.join(W, 'Nova-Relay-0.6.9-update.zip'));
  killAll(); startServer(base); await sleep(1000);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const open = async () => { await p.goto(`http://127.0.0.1:${PORT}/`); await p.waitForFunction(() => cart.ready && cart.update); await p.evaluate(() => { setupSec = 'updates'; go('setup'); }); await sleep(300); };
  const running = () => p.evaluate(() => cart.update && cart.update.running);
  await open();
  check(await running() === '0.6.5', `the app's own version runs (${await running()})`);

  console.log('A. install from a file');
  await p.setInputFiles('input[type=file]', up9);
  await p.waitForFunction(() => cart.update && cart.update.running === '0.6.9', null, { timeout: 30000 }).catch(() => { });
  check(await running() === '0.6.9', `restarted into 0.6.9 by itself, page reconnected (${await running()})`);
  check(fs.existsSync(path.join(DATA, 'app/0.6.9/server.js')) && JSON.parse(fs.readFileSync(path.join(DATA, 'app/current.json'))).version === '0.6.9', 'installed in the data folder, not over the app');
  check(await p.evaluate(() => cart.update.fromUpdate && cart.update.back === '0.6.5'), 'Updates says it runs as an update and can go back to 0.6.5');

  console.log('B. refused updates');
  const tryFile = async f => { const r = await p.evaluate(async u => { const b = await (await fetch(u)).blob(); const x = await fetch('/update/file', { method: 'POST', body: b }); return x.json(); }, `http://127.0.0.1:${GH}/${path.relative(ghRoot, f)}`); return r; };
  const toGh = f => { const d = path.join(ghRoot, path.basename(f)); fs.copyFileSync(f, d); return d; };
  const changed = path.join(W, 'u10x'); makeApp(changed, '0.6.10'); fs.appendFileSync(path.join(changed, 'nova.js'), '\n// changed after signing\n');
  let r = await tryFile(toGh(zipApp(changed, path.join(W, 'changed.zip'))));
  check(!r.ok && /checksum/.test(r.error), `a file changed after signing: refused (${r.error})`);
  const unsigned = makeApp(path.join(W, 'u10u'), '0.6.10', { sign: false });
  r = await tryFile(toGh(zipApp(unsigned, path.join(W, 'unsigned.zip'))));
  check(!r.ok && /nova-update\.json|isn't signed/.test(r.error), `unsigned: refused (${r.error})`);
  const other = path.join(W, 'other.pem'); fs.writeFileSync(other, crypto.generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }));
  let wrongKeyMade = true; try { makeApp(path.join(W, 'u10k'), '0.6.10', { key: other }); } catch (_) { wrongKeyMade = false; }
  if (!wrongKeyMade) {   /* sign_update refuses a key that doesn't match update.js; sign by hand to try the server */
    const d = path.join(W, 'u10k'); const mf = path.join(ROOT, 'tools/sign_update.js');
    const src = fs.readFileSync(mf, 'utf8').replace(/if \(!built\.includes[^\n]*\n/, ''); fs.writeFileSync(path.join(W, 'sign_any.js'), src.replace('path.join(__dirname, "..", "signing", "update-signing-key.pem")', JSON.stringify(other)));
    execFileSync('node', [path.join(W, 'sign_any.js'), d], { stdio: 'pipe' });
  }
  r = await tryFile(toGh(zipApp(path.join(W, 'u10k'), path.join(W, 'wrongkey.zip'))));
  check(!r.ok && /signature doesn't match/.test(r.error), `signed with another key: refused (${r.error})`);
  r = await tryFile(toGh(zipApp(makeApp(path.join(W, 'u8'), '0.6.8'), path.join(W, 'older.zip'))));
  check(!r.ok && /already 0\.6\.9/.test(r.error), `an older version: refused (${r.error})`);
  check(await running() === '0.6.9', 'still on 0.6.9 after the refusals');

  console.log('C. GitHub');
  const up10 = zipApp(makeApp(path.join(W, 'u10'), '0.6.10'), path.join(ghRoot, 'updates/Nova-Relay-0.6.10-update.zip'));
  const zb = fs.readFileSync(up10);
  fs.writeFileSync(path.join(ghRoot, 'updates/latest.json'), JSON.stringify({ version: '0.6.10', file: 'Nova-Relay-0.6.10-update.zip', sha256: crypto.createHash('sha256').update(zb).digest('hex'), size: zb.length, date: '2026-11-20', notes: ['Test notes line'] }));
  await p.click('text=Check now');
  await p.waitForFunction(() => cart.update && cart.update.available, null, { timeout: 15000 }).catch(() => { });
  const txt = await p.evaluate(() => document.querySelector('main').innerText);
  check(/Nova Relay 0\.6\.10 is available/.test(txt) && /Test notes line/.test(txt), 'the check says 0.6.10 is available, with its notes');
  check(await p.evaluate(() => !!document.querySelector('.secbtn .secdot')), 'Updates in the Setup list gets a dot');
  await sleep(4000);
  check(await running() === '0.6.9', 'nothing installed by itself (still 0.6.9 after the check)');
  await p.click('text=Install 0.6.10'); await sleep(500);
  check(await running() === '0.6.9' && await p.locator('text=Tap again: install 0.6.10').count() === 1, 'the first tap only asks again');
  await p.click('text=Tap again: install 0.6.10');
  await p.waitForFunction(() => cart.update && cart.update.running === '0.6.10', null, { timeout: 30000 }).catch(() => { });
  check(await running() === '0.6.10', `the second tap installed it and restarted (${await running()})`);
  check(!fs.existsSync(path.join(DATA, 'app/0.6.5')), 'older installed copies are cleared (keeps this one and the one before)');

  console.log('D. go back');
  await p.evaluate(() => { setupSec = 'updates'; go('setup'); }); await sleep(300);
  await p.click('text=Go back to 0.6.9'); await p.click('text=Tap again');
  await p.waitForFunction(() => cart.update && cart.update.running === '0.6.9', null, { timeout: 30000 }).catch(() => { });
  check(await running() === '0.6.9', `went back to 0.6.9 (${await running()})`);
  await p.evaluate(() => { setupSec = 'updates'; go('setup'); }); await sleep(300);
  await p.click('text=Go back to 0.6.5'); await p.click('text=Tap again');
  await p.waitForFunction(() => cart.update && cart.update.running === '0.6.5', null, { timeout: 30000 }).catch(() => { });
  check(await running() === '0.6.5' && await p.evaluate(() => !cart.update.fromUpdate), `went back to the app's own 0.6.5 (${await running()})`);
  check(errs.length === 0, `no page errors (${errs.join('; ')})`);
  await b.close(); killAll(); await sleep(500);

  console.log('E. an update that can\'t start');
  const broken = makeApp(path.join(DATA, 'app/0.7.0'), '0.7.0', { sign: false, tweak: d => fs.writeFileSync(path.join(d, 'server.js'), 'throw new Error("broken on purpose");\n') });
  fs.writeFileSync(path.join(DATA, 'app/current.json'), JSON.stringify({ version: '0.7.0', previous: null, tries: 0, ok: false }));
  const runOnce = () => new Promise(res => { const s = startServer(base); let out = ''; s.stdout.on('data', d => out += d); s.stderr.on('data', d => out += d); const t = setTimeout(() => { s.kill(); res({ code: 'running', out }); }, 2500); s.on('exit', code => { clearTimeout(t); res({ code, out }); }); });
  const runs = []; for (let i = 0; i < 4; i++) runs.push(await runOnce());
  check(runs.slice(0, 3).every(r => r.code !== 'running' && /broken on purpose/.test(r.out)), 'the broken update was tried 3 times');
  check(runs[3].code === 'running' && /didn't start 3 times/.test(runs[3].out), 'the 4th start ran the app\'s own version and said why');
  check(JSON.parse(fs.readFileSync(path.join(DATA, 'app/current.json'))).failed === true, 'marked failed (Setup › Updates says so)');
  killAll(); await sleep(300);

  console.log('F. restart styles');
  fs.rmSync(path.join(DATA, 'app'), { recursive: true, force: true });
  const restartCode = env => new Promise(async res => {
    const s = startServer(base, env); await sleep(1000);
    const q = http.request({ host: '127.0.0.1', port: PORT, path: '/update/file', method: 'POST', headers: { 'Content-Type': 'application/zip' } }, r2 => r2.resume());
    q.end(fs.readFileSync(up9)); s.on('exit', code => res(code)); setTimeout(() => res('none'), 8000);
  });
  check(await restartCode({ NOVA_PARENT_RESTARTS: '1' }) === 75, 'AppImage window: the server exits 75 so the window starts it again');
  fs.rmSync(path.join(DATA, 'app'), { recursive: true, force: true });
  check(await restartCode({ INVOCATION_ID: 'test' }) === 0, 'the box (systemd): the server exits for systemd to restart');
  killAll(); gh.close(); fs.rmSync(W, { recursive: true, force: true });
  console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); console.error(log.slice(-2000)); killAll(); process.exit(1); });
