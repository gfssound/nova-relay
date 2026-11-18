const { chromium, devices } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve('build/cart-remote.html')); await p.waitForTimeout(500);
  await p.evaluate(() => sim.command('RECORD')); await p.waitForTimeout(800);
  await p.screenshot({ path: 'build/recfile-phone.png', clip: { x: 0, y: 0, width: 390, height: 200 } });
  console.log('overflow:', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'errors:', errs.length ? errs : 'none'); await b.close(); })();
