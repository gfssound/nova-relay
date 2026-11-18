// Nov 12 (Ferris): on the phone meters the ZNet tag (and ON/STBY) must not cover the track name. Measures real boxes.
const { chromium } = require("playwright"), path = require("path");
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const shot = process.argv[2];
  const b = await chromium.launch(); const errs = [];
  for (const [w, h, n] of [[390, 844, 16], [390, 844, 10], [390, 844, 4], [375, 667, 16], [375, 667, 12], [820, 1180, 16], [1024, 600, 10]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); pg.on("pageerror", e => errs.push(e.message));
    await pg.goto("file://" + path.join(__dirname, "../build/cart-remote.html")); await sleep(900);
    await pg.evaluate(n => { for (let t = 0; t < 16; t++) set("record.tracks", [t], t < n ? 1 : 0); }, n); await sleep(600);
    const r = await pg.evaluate(() => {
      let worst = 0, rows = 0, rowh = 0; const hits = [];
      for (const sc of document.querySelectorAll(".strip:not(.scale) .scrib")) {
        if (!sc.offsetParent) continue; rows++; rowh = Math.round(sc.getBoundingClientRect().height);
        const tn = sc.querySelector(".snm"); if (!tn || !tn.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(tn); const t0 = rg.getBoundingClientRect(), box = tn.getBoundingClientRect();
        const t = { left: Math.max(t0.left, box.left), right: Math.min(t0.right, box.right), top: t0.top, bottom: t0.bottom };
        if (tn.scrollWidth > tn.clientWidth) hits.push("cut:" + tn.textContent.trim());
        for (const tag of sc.querySelectorAll(".szid:not([hidden]), .stx:not([hidden])")) {
          const g = tag.getBoundingClientRect(); if (!g.width) continue;
          const ox = Math.min(t.right, g.right) - Math.max(t.left, g.left), oy = Math.min(t.bottom, g.bottom) - Math.max(t.top, g.top);
          if (ox > 0 && oy > 0) { worst = Math.max(worst, Math.round(oy)); hits.push(tn.textContent.trim()); }
        }
      }
      return { rows, rowh, worstOverlapPx: worst, hits: [...new Set(hits)].slice(0, 4) };
    });
    console.log(`${w}x${h} ${n} tracks:`, JSON.stringify(r));
    if (shot && n === 16 && (w === 390 || w === 375)) await pg.screenshot({ path: path.join(__dirname, `../shots/phone_tags_${shot}_${w}.png`), clip: { x: 0, y: 150, width: 390, height: 330 } });
    await pg.close();
  }
  console.log("errors", errs); await b.close();
})();
