const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(500);
  // rename the mix tracks so they don't say MIX, like a real Nova setup could
  await p.evaluate(() => { set('track.name', [0], 'L'); set('track.name', [1], 'R'); go('home'); }); await p.waitForTimeout(300);
  await p.evaluate(() => togglePfl(14)); await p.waitForTimeout(200);   // PFL RX 1
  console.log(path.basename(process.argv[2]), 'lit strips:', await p.$$eval('.strip.soloed .scrib', e => e.map(x => x.childNodes[0].textContent).join(', ')), '| lit keys:', await p.locator('.pflb.on').count());
  console.log(errs); await b.close(); })();
