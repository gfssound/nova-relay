const { chromium, devices } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [label, opts] of [['desk', { viewport: { width: 1280, height: 800 } }], ['phone', { ...devices['iPhone 13'] }]]) {
    const ctx = await b.newContext(opts); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve('build/cart-remote.html')); await p.waitForTimeout(500);
    await p.evaluate(() => go('home')); await p.waitForTimeout(400);
    const sc = p.locator('.strip .scrib', { hasText: 'ANNA' }); const bb = await sc.boundingBox();
    if (label === 'desk') { await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); }
    else { const cdp = await ctx.newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }] }); await p.waitForTimeout(700); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    await p.waitForTimeout(250);
    console.log(label, 'list open:', await p.locator('.presetlist').count(), '| modal open:', await p.locator('.modal').count(), '| ticked:', await p.$$eval('.presetlist [aria-selected=true]', e => e.map(x => x.textContent).join()));
    await p.screenshot({ path: `test/presets-meter-${label}.png` });
    await p.locator('.presetlist button', { hasText: 'PLAYBACK' }).click(); await p.waitForTimeout(300);
    console.log(label, 'track 5 =', await p.evaluate(() => get('track.name', [4])), '| modal open:', await p.locator('.modal').count());
    await p.locator('.strip .scrib', { hasText: 'PLAYBACK' }).click(); await p.waitForTimeout(300);
    console.log(label, 'short tap opens input page:', await p.locator('.modal').count(), await p.locator('#mtitle').textContent().catch(() => ''));
    await ctx.close();
  }
  console.log(errs); await b.close(); })();
