// Nov 13 (Ferris): the Mirror reading must not push Daylight onto a second row or move the page. Installed app.
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8170', '--no-open', '--data', data]); await sleep(900);
  const b = await chromium.launch(); let bad = 0;
  for (const [w, h] of [[1024, 600], [1280, 800], [820, 1180], [1100, 700], [700, 500]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); await p.goto('http://127.0.0.1:8170/'); await p.waitForFunction(() => cart.ready); await sleep(500);
    const res = [];
    for (const t of ['', ' [Pri: 49GB :: Mirroring (7%)  :: File 3 of 16]', ' [Pri: 49GB :: Mirroring (99%)  :: File 16 of 16]', ' [Pri: 49GB :: Mirroring (100%)  :: Mirror = Cont]', ' [Pri: 1849GB :: Mirroring (100%)  :: File 116 of 116]']) {
      await p.evaluate(t => { set('status.text', [], t, 'remote'); paintDrives(); }, t); await sleep(120);
      res.push(await p.evaluate(() => { const s = document.getElementById('status'), d = document.getElementById('dayBtn').getBoundingClientRect(), hb = document.getElementById('helpBtn').getBoundingClientRect();
        return { m: document.getElementById('stMirror').textContent, h: Math.round(s.getBoundingClientRect().height), dayTop: Math.round(d.top), dayRight: Math.round(d.right), main: Math.round(document.querySelector('main').getBoundingClientRect().top), fits: d.right <= innerWidth + 0.5 && hb.left >= 0 }; }));
    }
    const steady = new Set(res.map(r => `${r.h}/${r.dayTop}/${r.main}`)).size === 1, fits = res.every(r => r.fits);
    if (!steady || !fits) bad++;
    console.log(`${w}x${h}`, steady ? 'steady' : 'MOVES', fits ? 'fits' : 'OVERFLOWS', res.map(r => `"${r.m}" h${r.h} day@${r.dayTop},${r.dayRight} main@${r.main}`).join(' | '));
    await p.screenshot({ path: path.join(ROOT, `shots/status_${w}.png`), clip: { x: 0, y: 0, width: w, height: 70 } });
    await p.close();
  }
  await b.close(); srv.kill(); console.log(bad ? `PROBLEMS: ${bad}` : 'all steady'); fs.rmSync(data, { recursive: true, force: true });
})();
