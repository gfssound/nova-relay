/* Nov 15 (Ferris: "Can we make sure the meters page doesn't scroll, too?"): the Meters page fits the window at phone,
   iPad and laptop sizes, Tracks and Outputs, with 16 tracks armed, with 4, and with the All TX row. */
const { chromium } = require('playwright'); const path = require('path');
const target = process.argv[2] || 'file://' + path.join(__dirname, '../build/cart-remote.html');
const sizes = [[390, 844, 'iPhone'], [375, 667, 'iPhone SE'], [844, 390, 'iPhone sideways'], [820, 1180, 'iPad upright'], [1180, 820, 'iPad sideways'], [1024, 768, 'small iPad sideways'], [1280, 800, 'laptop'], [1280, 650, 'short laptop'], [1920, 1080, 'desktop']];
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const [w, h, name] of sizes) for (const armed of [16, 4]) for (const src of [0, 1]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: w < 1200, isMobile: w < 900 });
    await p.goto(target); await p.waitForTimeout(400); if (/^http/.test(target)) await p.waitForFunction(() => cart.ready);
    await p.evaluate(([n, s]) => { for (let t = 0; t < 16; t++) set('record.tracks', [t], t < n ? 1 : 0, 'remote'); set('home.meters.source', [], s, 'remote'); go('home'); }, [armed, src]);
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const m = document.querySelector('main'), w = document.querySelector('.strips-wrap'); return { main: m.scrollHeight - m.clientHeight, doc: document.documentElement.scrollHeight - innerHeight, side: Math.max(document.documentElement.scrollWidth - innerWidth, w ? w.scrollWidth - w.clientWidth : 0) }; });
    const ok = r.main <= 1 && r.doc <= 1 && r.side <= 1; if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'SCROLLS'} ${name} ${w}x${h} ${armed} armed ${src ? 'Outputs' : 'Tracks'}: main +${r.main}px, page +${r.doc}px, sideways (page or meters) +${r.side}px`);
    await p.close();
  }
  await b.close(); console.log(bad ? `${bad} scroll(s)` : 'no scrolling anywhere'); process.exit(bad ? 1 : 0);
})();
