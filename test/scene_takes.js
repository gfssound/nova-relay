/* Nov 12: going back to a scene already shot carries on from its highest take.
   Part 1 prototype; part 2 installed app on a replay of a real session (whole take list from the Nova). */
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'), os = require('os');
const DIR = __dirname, ROOT = path.join(DIR, '..'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const errs = [];
  // 1. prototype
  let p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(ROOT, 'build/cart-remote.html')); await sleep(800);
  const r1 = await p.evaluate(() => {
    const rows = [["102","2"],["102","1"],["101D","3"],["101d","2A"],["101D","1"],["100","7"]].map(([scene, take], i) => ({seg: 20 - i, scene, take, note: ""}));
    while(rows.length < 10) rows.push(null);
    set("metadata.history", [], rows, "remote"); set("scene.current", [], "102", "remote");
    const out = {};
    for(const sc of ["101D", "101d ", "100", "103", "102"]){ setNextScene(sc); out[sc] = get("take.next"); }
    return out;
  });
  console.log('prototype:', JSON.stringify(r1), '(want 101D 4, 100 8, 103 1, 102 "" = count on)');
  await p.close();
  // 2. installed app, replay
  const got = path.join(DIR, 'fake_st.txt'); try { fs.unlinkSync(got); } catch (_) { }
  const fake = spawn('python3', [path.join(DIR, 'fake_nova.py'), path.join(ROOT, 'cap/live3_conv.log'), got, '100', '1']);
  const pty = await new Promise(r => fake.stdout.once('data', d => r(String(d).trim())));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
  const srv = spawn('node', [path.join(ROOT, 'nova-remote/server.js'), '--port', '8166', '--no-open', '--data', data]); await sleep(900);
  p = await b.newPage({ viewport: { width: 1280, height: 860 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8166/'); await p.waitForFunction(() => cart.ready);
  await p.evaluate(path => net.send({ t: 'serialOpen', path, baud: 38400, parity: 'odd', listen: false }), pty);
  await p.waitForFunction(() => cart.nova && cart.nova.connected, null, { timeout: 40000 }); await sleep(4000);
  const st = await p.evaluate(() => ({ scenetakes: get('ui.scenetakes'), last: ((get('metadata.history') || []).find(Boolean) || {}).scene, rows: (get('metadata.history') || []).filter(Boolean).length }));
  console.log('cart list:', JSON.stringify(st));
  const scenes = Object.keys(st.scenetakes || {}); const back = scenes.find(s => s !== String(st.last || '').toUpperCase());
  if (back) {
    await p.evaluate(sc => setNextScene(sc), back); await sleep(600);
    console.log(`back to ${back}: take.next =`, await p.evaluate(() => get('take.next')), `(highest was ${st.scenetakes[back]})`);
    await p.evaluate(() => setNextScene('ZZ9')); await sleep(400);
    console.log('new scene ZZ9: take.next =', await p.evaluate(() => get('take.next')));
    await p.evaluate(sc => { set('scene.next', [], ''); }, back); await sleep(300);
    // the Stream Deck / API path
    await p.evaluate(sc => set('scene.next', [], sc), back); await sleep(300);
  }
  console.log('errors:', errs.length ? errs : 'none');
  await b.close(); srv.kill(); fake.kill(); fs.rmSync(data, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
