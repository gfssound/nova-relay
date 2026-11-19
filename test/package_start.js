/* Nov 18 (Ferris's Mac app.log: "Cannot find module './deck/manager.js'"): the Mac builder copied a fixed list of
   files and missed deck/, so every Mac built from 0.6.3 to 0.6.5 stopped at start-up. Here the app folder is put
   together the way the packages do it (APPFILES in tools/package.sh; the Mac builder now copies that whole folder;
   the AppImage's fallback list), and the server is started from each copy: it has to answer, with no missing file.
   Also checks that the Mac builder copies the whole folder and still has its file check. */
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path'); const http = require('http');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
const W = fs.mkdtempSync(path.join(DIR, 'pkgs-'));
const pkg = fs.readFileSync(path.join(ROOT, 'tools/package.sh'), 'utf8');
const appfiles = (/APPFILES=\(([^)]*)\)/.exec(pkg) || [])[1].trim().split(/\s+/).map(f => f.replace(/^nova-remote\//, ''));
const appimg = fs.readFileSync(path.join(ROOT, 'tools/build_appimage.sh'), 'utf8');
const imgList = ((/cp -R ([^"]*) "\$APP\/server\/"\); fi/.exec(appimg) || [])[1] || '').trim().split(/\s+/);
const mac = fs.readFileSync(path.join(ROOT, 'macbuild/Build Mac App.command'), 'utf8');
check(/cp -R "\$SRC\/\." "\$RES\/app\/"/.test(mac) && !/cp -R server\.js nova\.js/.test(mac), 'the Mac builder copies the whole app folder (not a list of files)');
check(/fail "the app folder is missing \$f/.test(mac), 'the Mac builder checks every file the server loads');
const stage = (name, files) => { const d = path.join(W, name); fs.mkdirSync(d); for (const f of files) fs.cpSync(path.join(ROOT, 'nova-remote', f), path.join(d, f), { recursive: true }); return d; };
const answers = port => new Promise(res => http.get({ host: '127.0.0.1', port, path: '/api/status' }, r => { r.resume(); res(r.statusCode); }).on('error', () => res(0)));
async function starts(label, dir, port) {
  const s = spawn(process.execPath, [path.join(dir, 'server.js'), '--port', String(port), '--no-open', '--no-auto', '--data', path.join(W, 'data-' + port)]);
  let out = ''; s.stdout.on('data', d => out += d); s.stderr.on('data', d => out += d);
  let code = 0; for (let i = 0; i < 40 && !code; i++) { await sleep(250); if (s.exitCode != null) break; code = await answers(port); }
  s.kill(); await sleep(200);
  check(code && !/Cannot find module/.test(out), `${label}: the server starts and answers${code ? '' : ' — ' + (out.match(/Error: [^\n]*/) || ['no answer'])[0]}`);
}
(async () => {
  console.log('   package.sh APPFILES:', appfiles.join(' '));
  await starts('Mac and Pi kits (APPFILES)', stage('kit', appfiles), 8351);
  if (imgList.length > 1) { console.log('   AppImage fallback list:', imgList.join(' ')); await starts('AppImage without a staged folder', stage('img', imgList), 8352); }
  fs.rmSync(W, { recursive: true, force: true });
  console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
