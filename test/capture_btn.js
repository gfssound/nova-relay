// Setup › Link log has "Download capture", and it downloads the newest serial capture.
const { chromium } = require("playwright"), cp = require("child_process"), fs = require("fs"), path = require("path"), os = require("os");
const D = fs.mkdtempSync(path.join(os.tmpdir(), "cap-"));
fs.writeFileSync(path.join(D, "serial-capture-2026-11-11T10-00-00.log"), "# old\n");
fs.writeFileSync(path.join(D, "serial-capture-2026-11-11T12-00-00.log"), "# newest capture\n");
fs.utimesSync(path.join(D, "serial-capture-2026-11-11T10-00-00.log"), new Date(Date.now() - 60000), new Date(Date.now() - 60000));
const srv = cp.spawn(process.execPath, ["server.js", "--no-open", "--port", "8179", "--data", D], { cwd: path.join(__dirname, "../nova-remote") });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(1500);
  const b = await chromium.launch(), pg = await (await b.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 800 } })).newPage();
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.goto("http://127.0.0.1:8179/"); await sleep(1500);
  const r = await pg.evaluate(async () => { const x = await fetch("/api/capture"); return [x.status, x.headers.get("content-disposition"), await x.text()]; });
  console.log("api/capture:", r[0], r[1], JSON.stringify(r[2]));
  // open Setup › the link log section by searching for the button text
  await pg.evaluate(() => { setupSec = "conn"; go("setup"); }); await sleep(600);
  const btn = await pg.$("a:has-text('Download capture')");
  console.log("button visible:", !!btn && await btn.isVisible());
  if (btn) { const [dl] = await Promise.all([pg.waitForEvent("download"), btn.click()]); console.log("downloaded:", dl.suggestedFilename(), JSON.stringify(fs.readFileSync(await dl.path(), "utf8"))); }
  console.log("page errors", errs);
  await b.close(); srv.kill(); process.exit(0);
})().catch(e => { console.log("CRASH", e); srv.kill(); process.exit(1); });
