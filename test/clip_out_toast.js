const { chromium, devices } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve('build/cart-remote.html')); await p.waitForTimeout(500);
  const sent = []; await p.exposeFunction('rec', m => sent.push(m)); await p.evaluate(() => { const o = link.send.bind(link); link.send = m => { if (m.op === 'SET') rec(`${m.k}[${m.idx}]=${m.val}`); o(m); }; });
  // copy RX 1 (14) after changing a few things, paste on RX 2 (15)
  await p.evaluate(() => { set('input.hpf.freq', [14], 150); set('input.trim.level', [14], 6); set('input.notch.enable', [14, 0], 1); set('input.delay.enable', [14], 1); set('input.delay.time', [14], 12.5); go('inputs'); set('input.channel', [], 15, 'local'); });
  await p.waitForTimeout(300); sent.length = 0;
  await p.locator('.panel .clipb', { hasText: 'Copy' }).click();
  await p.evaluate(() => set('input.channel', [], 16, 'local')); await p.waitForTimeout(300);
  console.log('paste button:', await p.locator('.panel .clipb').nth(1).textContent());
  await p.locator('.panel .clipb').nth(1).click(); await p.waitForTimeout(200);
  const v = k => p.evaluate(([k, i]) => JSON.stringify(get(k, i)), k);
  console.log('RX2 after paste: hpf', await v(['input.hpf.freq', [15]]), 'trim', await v(['input.trim.level', [15]]), 'notch1', await v(['input.notch.enable', [15, 0]]), 'delay', await v(['input.delay.time', [15]]), '| zid kept', await v(['input.zaxnet.id', [15]]), '| sets sent', sent.length);
  await p.screenshot({ path: 'test/toast-center.png' });
  console.log('toast:', await p.evaluate(() => { const t = document.querySelector('.toast'); const r = t.getBoundingClientRect(); return t.textContent + ' @' + Math.round(r.x + r.width / 2) + ',' + Math.round(r.y + r.height / 2); }));
  await p.locator('.toast .btn', { hasText: 'Undo' }).click(); await p.waitForTimeout(200);
  console.log('after undo: hpf', await v(['input.hpf.freq', [15]]), 'trim', await v(['input.trim.level', [15]]));
  // analog -> RX: 48V/level skipped
  await p.evaluate(() => { copyInput(0); pasteInput(14); }); console.log('A1->RX1 48V on RX1?', await v(['input.power48V', [14]]));
  // output names: double-click on meters
  await p.evaluate(() => { set('home.meters.source', [], 1); go('home'); }); await p.waitForTimeout(400);
  const sc = p.locator('.strip:not(.scale) .scrib').first(); await sc.dblclick(); await p.waitForTimeout(150);
  console.log('edit box:', await p.locator('input.scribedit').count(), '| modal:', await p.locator('.modal').count());
  await p.keyboard.type('Camera A'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  console.log('OUT 1 =', await p.evaluate(() => outName(0)), '| strip:', await p.locator('.strip:not(.scale) .scrib').first().textContent());
  await p.locator('.strip:not(.scale) .scrib').first().click(); await p.waitForTimeout(500); console.log('single click opens routing:', await p.locator('.modal').count());
  await p.evaluate(() => closeModal());
  // lock toast centred too
  await p.evaluate(() => { sim.state = 'RECORDING'; flashLock(); }); await p.waitForTimeout(100);
  console.log('lock toast centre:', await p.evaluate(() => { const r = document.querySelector('.locktoast').getBoundingClientRect(); return Math.round(r.x + r.width / 2) + ',' + Math.round(r.y + r.height / 2); }));
  // phone: double tap
  const c = await b.newContext({ ...devices['iPhone 13'] }); const q = await c.newPage(); q.on('pageerror', e => errs.push(e.message));
  await q.goto('file://' + path.resolve('build/cart-remote.html')); await q.waitForTimeout(500); await q.evaluate(() => { set('home.meters.source', [], 1); go('home'); }); await q.waitForTimeout(400);
  const t = q.locator('.strip:not(.scale) .scrib').nth(1); await t.tap(); await q.waitForTimeout(120); await t.tap(); await q.waitForTimeout(200);
  console.log('phone double-tap edit box:', await q.locator('input.scribedit').count());
  await q.screenshot({ path: 'test/outname-phone.png' });
  await q.evaluate(() => toast('Hold STOP to stop recording')); await q.waitForTimeout(100); await q.screenshot({ path: 'test/toast-phone.png' });
  console.log(errs); await b.close(); })();
