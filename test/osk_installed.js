// The installed app: the keyboard switch is per device (not shared), and typing a name with it reaches the server.
const { chromium } = require("playwright"), cp = require("child_process"), fs = require("fs"), path = require("path"), os = require("os");
const D = fs.mkdtempSync(path.join(os.tmpdir(), "osk-"));
const srv = cp.spawn(process.execPath, ["server.js", "--no-open", "--port", "8181", "--data", D], { cwd: path.join(__dirname, "../nova-remote") });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(1500);
  const b = await chromium.launch();
  const a = await b.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true }), c = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; for (const p of [a, c]) p.on("pageerror", e => errs.push(e.message));
  await a.goto("http://127.0.0.1:8181/"); await c.goto("http://127.0.0.1:8181/"); await sleep(1500);
  await a.evaluate(() => set("ui.osk", [], 1)); await sleep(500);
  console.log("device A on:", await a.evaluate(() => get("ui.osk")), "| device B stays off:", await c.evaluate(() => get("ui.osk")));
  await a.evaluate(() => { const i = outNameInput(2, "t-out"); i.style.cssText = "position:fixed;top:120px;left:40px;width:300px;z-index:5"; document.body.append(i); });
  await a.tap("#t-out"); await sleep(300);
  const key = async k => { await a.locator(`.osk [data-k="${k}"]`).first().dispatchEvent("pointerdown"); await a.evaluate(() => dispatchEvent(new PointerEvent("pointerup"))); };
  for (const k of ["c", "a", "m", "space", "123", "3", "Done"]) await key(k);
  await sleep(600);
  console.log("name on device B:", JSON.stringify(await c.evaluate(() => (get("ui.outnames") || [])[2])));
  await a.reload(); await sleep(1500);
  console.log("A after reload still on:", await a.evaluate(() => get("ui.osk")));
  console.log("errors", errs);
  await b.close(); srv.kill(); process.exit(0);
})().catch(e => { console.log("CRASH", e); srv.kill(); process.exit(1); });
