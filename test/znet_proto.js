const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve('build/cart-remote.html')); await p.waitForTimeout(500);
  const openIn = async ch => { await p.evaluate(ch => { go('inputs'); }, ch); await p.waitForTimeout(200); await p.evaluate(ch => { const b = [...document.querySelectorAll('button')].find(x => x.dataset && x.dataset.ch == String(ch)); if (b) b.click(); else if (typeof selectInput === 'function') selectInput(ch); }, ch); await p.waitForTimeout(300); };
  await p.evaluate(() => { go('inputs'); set('input.channel', [], 15, 'local'); });
  await p.waitForTimeout(300);
  const tile = p.locator('.vtile[data-key="ui.znettrim|0"]');
  console.log('tile:', (await tile.innerText()).replace(/\s+/g, ' '));
  await tile.click(); await p.waitForTimeout(200);
  console.log('bar:', (await p.locator('.editbar:not([hidden])').innerText()).replace(/\s+/g, ' ').slice(0, 330));
  await p.locator('.editbar:not([hidden]) button[aria-label^="Raise"]').click(); await p.waitForTimeout(150);
  console.log('after +:', (await tile.innerText()).replace(/\s+/g, ' '), '| src', await p.evaluate(() => JSON.stringify(get('ui.znetsrc'))));
  await p.screenshot({ path: 'build/znet-proto.png' });
  // unknown value: RX 5
  await p.evaluate(() => { tileEdit = null; }); await p.evaluate(() => set('input.channel', [], 19, 'local')); await p.waitForTimeout(300);
  const t5 = p.locator('.vtile[data-key="ui.znettrim|4"]'); if (await t5.count()) { await t5.click(); await p.waitForTimeout(150);
    console.log('RX 5 tile:', (await t5.innerText()).replace(/\s+/g, ' '), '| + disabled:', await p.locator('.editbar:not([hidden]) button[aria-label^="Raise"]').isDisabled()); }
  else console.log('RX 5 tile not found');
  console.log('errors:', errs.length ? errs : 'none'); await b.close(); })();
