const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, hgt, name] of [[1280, 800, 'wide'], [390, 844, 'phone']]) {
    const p = await b.newPage({ viewport: { width: w, height: hgt }, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve('build/cart-remote.html')); await p.waitForTimeout(500);
    await p.locator('.strip .pflb:not(.nofader)').first().click(); await p.waitForTimeout(500);
    const box = await p.locator('.strip.soloed').first().boundingBox();
    await p.screenshot({ path: `build/pfl-${name}.png`, clip: { x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 10), width: Math.min(box.width + 20, w), height: Math.min(box.height + 20, hgt) } });
    await p.close(); }
  console.log('errors:', errs.length ? errs : 'none'); await b.close(); })();
