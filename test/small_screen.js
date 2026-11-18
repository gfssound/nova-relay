// Nov 12: the installed app on a 1024x600 cart screen (Ferris's photo), daylight: header on one line, nothing cut off.
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8165', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch();
  for (const [w, h] of [[1024, 600], [1280, 800]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8165/'); await p.waitForFunction(() => cart.ready); await sleep(800);
    await p.evaluate(() => { const t = document.getElementById('dayBtn'); t && t.click(); }); await sleep(400);
    const r = await p.evaluate(() => { const st = document.getElementById('status'); const kids = [...st.children].filter(e => e.offsetParent); const tops = new Set(kids.map(e => Math.round(e.getBoundingClientRect().top / 10)));
      return { headerRows: tops.size, headerH: Math.round(st.getBoundingClientRect().height), statSize: getComputedStyle(document.querySelector('.stat b')).fontSize, lblSize: getComputedStyle(document.querySelector('.stat .lbl')).fontSize, sub: getComputedStyle(document.querySelector('.tc-sub')).fontSize, sideways: document.documentElement.scrollWidth > innerWidth + 1 }; });
    await p.screenshot({ path: path.join(ROOT, `shots/ss_installed_${w}.png`) });
    console.log(`${w}x${h}`, JSON.stringify(r), 'errors', errs); await p.close();
  }
  await b.close(); srv.kill();
})();
