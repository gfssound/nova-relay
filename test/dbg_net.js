const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--no-proxy-server'] }); const p = await b.newPage();
p.on('console', m => console.log('console', m.text().slice(0,150))); p.on('pageerror', e => console.log('err', e.message)); p.on('requestfailed', r => console.log('fail', r.url(), r.failure().errorText));
await p.goto(process.argv[2]); await p.waitForTimeout(3000); console.log('ready', await p.evaluate(() => typeof cart !== 'undefined' && cart.ready)); await b.close(); })();
