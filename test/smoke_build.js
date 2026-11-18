const { chromium } = require('playwright'); const path=require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  // old-order saved state to test migration
  await p.addInitScript(() => { try{ const o={"ui.inlayout":2,"input.name":["ANNA","MARCUS","DEV","RUTH","","","LAV 7","LAV 8","BOOM","PLANT","","","","","","","","","","","",""]}; localStorage.setItem("cart-remote-state-v1", JSON.stringify(o)); }catch(e){} });
  await p.goto('file://' + path.resolve(__dirname, '../build/cart-remote.html')); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => ({ names: V['input.name'], order: V['ui.inorder'], labels: [inLabel(0), inLabel(4), inLabel(6), inLabel(14)], dig: [isDigitalIn(0), isDigitalIn(6), isDigitalIn(14)], v48: [has48V(0), has48V(4)] }));
  console.log(JSON.stringify(r)); await p.evaluate(() => go('inputs')); await p.waitForTimeout(400); await p.screenshot({ path: path.join(__dirname, 'inputs.png') });
  console.log('errors', errs); await b.close(); })();
