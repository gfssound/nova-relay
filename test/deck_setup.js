const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, hgt, name] of [[1280, 900, 'desk'], [390, 844, 'phone']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: hgt }, permissions: ['clipboard-read', 'clipboard-write'] }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2] || 'build/cart-remote.html')); await p.waitForTimeout(500);
    await p.evaluate(() => { setupSec = 'deck'; go('setup'); }); await p.waitForTimeout(300);
    if (name === 'desk') {
      console.log('sections:', await p.$$eval('.secbtn', bs => bs.map(b => b.textContent).join(' / ')));
      console.log('rows:', await p.locator('.deckrow').count(), '| first:', await p.textContent('.deckrow .deckurl'));
      const arm = p.locator('.deckrow', { hasText: 'Arm or disarm track' }); await arm.locator('select').selectOption('7');
      console.log('arm 7 url:', await arm.locator('.deckurl').textContent());
      await arm.locator('button').click(); await p.waitForTimeout(200); console.log('toast:', await p.textContent('.toast'));
      console.log('download button:', await p.locator('.decksteps .btn').first().evaluate(e => e.tagName + ' ' + (e.getAttribute('href') || '')));
    }
    await p.screenshot({ path: `test/deck-${name}.png`, fullPage: true });
    const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); console.log(name, 'horizontal overflow px:', over);
    await ctx.close();
  }
  console.log('errors', errs); await b.close(); })();
