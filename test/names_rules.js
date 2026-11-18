const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 860 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve('build/cart-remote.html')); await p.waitForTimeout(500);
  const sent = []; await p.exposeFunction('rec', m => sent.push(m)); await p.evaluate(() => { const o = link.send.bind(link); link.send = m => { if (m.op === 'SET') rec(`${m.k}[${m.idx}]=${m.val}`); o(m); }; });
  // 1. meter track double-click rename
  await p.evaluate(() => go('home')); await p.waitForTimeout(400);
  await p.locator('.strip:not(.scale) .scrib', { hasText: 'ANNA' }).dblclick(); await p.waitForTimeout(150);
  console.log('track edit box:', await p.locator('input.scribedit').count(), '| modal:', await p.locator('.modal').count());
  await p.keyboard.press('Control+A'); await p.keyboard.type('José~|: boom 2 and a very long tail'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  console.log('track 5 =', JSON.stringify(await p.evaluate(() => get('track.name', [4]))), '| sent', sent.splice(0).filter(x => /track.name/.test(x)).join(', '));
  await p.locator('.strip:not(.scale) .scrib').nth(4).click(); await p.waitForTimeout(500); console.log('single tap opens input page:', await p.locator('.modal').count()); await p.evaluate(() => closeModal());
  const sc = p.locator('.strip:not(.scale) .scrib').nth(5); const bb = await sc.boundingBox(); await p.mouse.move(bb.x + 20, bb.y + 10); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(200);
  console.log('hold still gives presets:', await p.locator('.presetlist').count()); await p.keyboard.press('Escape');
  // 2. headphone preset tile double-click rename
  await p.evaluate(() => { routeMode = 'phones'; go('routing'); }); await p.waitForTimeout(400);
  const tile = p.locator('.pickrow.p6 .pick').nth(2); await tile.dblclick(); await p.waitForTimeout(150);
  console.log('hp edit box:', await p.locator('input.scribedit.overlay').count());
  await p.keyboard.press('Control+A'); await p.keyboard.type('Director™ Mix'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  console.log('HP 3 name =', JSON.stringify(await p.evaluate(() => get('hpmix.names', [2]))), '| sent', sent.splice(0).filter(x => /hpmix.names/.test(x)).join(', '));
  await p.screenshot({ path: 'test/hp-rename.png' });
  // 3. Track Names field: live clean + limit
  await p.evaluate(() => go('names')); await p.waitForTimeout(300);
  await p.fill('#f-track-name-6', ''); await p.type('#f-track-name-6', 'Ana@Set#2 é~`|xxxxxxxxxxxxxxxxxxxxxxxx'); console.log('field shows:', JSON.stringify(await p.inputValue('#f-track-name-6')));
  await p.keyboard.press('Enter'); await p.waitForTimeout(100); console.log('track 7 =', JSON.stringify(await p.evaluate(() => get('track.name', [6]))));
  // 4. timecode digits only
  await p.evaluate(() => go('timecode')); await p.waitForTimeout(300);
  await p.type('#f-tc-set', '1a2b:3c4d5e6f7g8'); console.log('tc field:', await p.inputValue('#f-tc-set'));
  await p.click('text=Set generator'); console.log('bad frames rejected:', await p.evaluate(() => document.getElementById('f-tc-set').validationMessage));
  await p.fill('#f-tc-set', ''); await p.type('#f-tc-set', '01020304'); await p.click('text=Set generator'); await p.waitForTimeout(200);
  console.log('tc set ok:', await p.inputValue('#f-tc-set'), '| sent', sent.splice(0).filter(x => /generator/.test(x)).join(', '));
  console.log(errs); await b.close(); })();
