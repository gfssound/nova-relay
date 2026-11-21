/* Nov 14: prototype Setup › Stream Deck › "Stream Deck plugged into this box": the key grid, choosing what a key does
   (with the plugin's own options), auto-numbering, pages, sizes, start over. Screenshots at desktop and phone width. */
const { chromium } = require('playwright'); const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) errors.push(what); };
(async () => {
  const b = await chromium.launch();
  for (const [w, hgt, name] of [[1280, 900, 'desk'], [390, 844, 'phone']]) {
    const p = await b.newPage({ viewport: { width: w, height: hgt }, deviceScaleFactor: name === 'desk' ? 1 : 2 }); p.on('pageerror', e => errors.push(e.message));
    await p.goto('file://' + path.join(__dirname, '../build/cart-remote.html')); await sleep(400);
    await p.evaluate(() => { setupSec = 'exp'; go('setup'); }); await sleep(300);
    const box = p.locator('#deck-box');
    check(await box.isVisible(), `${name}: panel shown`);
    check(await box.locator('.dk-grid').first().locator('.dk-key').count() === 15, `${name}: 15 keys`);
    const lab = await box.locator('.dk-key').nth(5).getAttribute('aria-label'); check(/Arm track, Track 1/.test(lab), `${name}: key 6 = ${lab}`);
    /* choose PFL for key 15, then for key 14: they number themselves 1, 2 */
    await box.locator('.dk-key').nth(14).click(); await p.selectOption('#dk-action', 'pfl');
    await box.locator('.dk-key').nth(13).click(); await p.selectOption('#dk-action', 'pfl');
    const l14 = await box.locator('.dk-key').nth(13).getAttribute('aria-label'), l15 = await box.locator('.dk-key').nth(14).getAttribute('aria-label');
    check(/PFL, Fader 2/.test(l14) && /PFL, Fader 1/.test(l15), `${name}: new PFL keys number themselves (${l15} / ${l14})`);
    check(await p.locator('#o-fader, #dk-o-fader').count() === 1 && await p.locator('#dk-o-fader').inputValue() === '2', `${name}: PFL options shown (fader 2)`);
    await p.selectOption('#dk-o-fader', 'off');
    check(/All PFL off/.test(await box.locator('.dk-key').nth(13).getAttribute('aria-label')), `${name}: option change saved`);
    /* pages */
    await box.locator('button', { hasText: '+ Page' }).click();
    check(await box.locator('button.chip', { hasText: 'Page 2' }).getAttribute('aria-pressed') === 'true', `${name}: page 2 added and shown`);
    check(await box.getByText('Put a Next page').count() === 1, `${name}: warns there's no page key`);
    await box.locator('.dk-key').nth(0).click(); await p.selectOption('#dk-action', 'deck.prev');
    await box.locator('button.chip', { hasText: 'Page 1' }).click(); await box.locator('.dk-key').nth(12).click(); await p.selectOption('#dk-action', 'deck.next');
    check(await box.getByText('Put a Next page').count() === 0, `${name}: warning gone with a page key on each page`);
    if (name === 'desk') await p.screenshot({ path: path.join(__dirname, 'deck/proto_desk.png'), fullPage: false, clip: { x: 0, y: 0, width: 1280, height: 900 } });
    await box.locator('.dk-key').nth(5).click();
    /* sizes: Stream Deck + has dials */
    await p.selectOption('#dk-size', '8+4');
    check(await box.locator('.dk-dial').count() === 4, `${name}: Stream Deck + layout has 4 dials`);
    await box.locator('.dk-dial').nth(0).click();
    check(await p.locator('#dk-action optgroup').count() === 1 && await p.locator('#dk-action option[value="rec"]').count() === 0, `${name}: a dial only offers dials`);
    if (name === 'phone') { await box.scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(__dirname, 'deck/proto_phone.png'), fullPage: true }); }
    await p.selectOption('#dk-size', '15');
    await box.locator('button', { hasText: 'Start this layout over' }).click(); await box.locator('button', { hasText: 'Tap again' }).click();
    check(await box.locator('button.chip', { hasText: 'Page 2' }).count() === 0 && /Battery/.test(await box.locator('.dk-key').nth(14).getAttribute('aria-label')), `${name}: start over restores the layout`);
    const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check(!over, `${name}: no sideways scrolling`);
    await p.close();
  }
  await b.close(); console.log(errors.length ? `${errors.length} problem(s): ${errors.join(' / ')}` : 'all passed'); process.exit(errors.length ? 1 : 0);
})();
