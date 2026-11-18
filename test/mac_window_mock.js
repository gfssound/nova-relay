// Runs macbuild/window.js (the Mac app's JXA window script) under a fake Cocoa bridge on Linux.
// Checks: the server starts hidden with --exit-with, the start page / remote load, menu actions, page messages
// (download to Downloads, blob save, open outside links), and that the server stops when the "app" goes away.
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const ROOT = path.join(__dirname, "..");
const T = fs.mkdtempSync(path.join(os.tmpdir(), "macwin-"));
const HOME = path.join(T, "home"), RES = path.join(T, "Nova Remote.app/Contents/Resources");
fs.mkdirSync(path.join(HOME, "Downloads"), { recursive: true });
fs.mkdirSync(path.join(RES, "node/x64"), { recursive: true });
fs.symlinkSync(path.join(ROOT, "nova-remote"), path.join(RES, "app"));
fs.symlinkSync(process.execPath, path.join(RES, "node/x64/node"));
const fakeApp = cp.spawn("sleep", ["600"]);   // stands in for the app's process
const calls = [], classes = {};
const mac = c => c.replace(/stat -f%z/g, "stat -c%s").replace(/\bopen -R\b/g, "echo REVEAL").replace(/(^|; )open /g, "$1echo OPEN ").replace(/uname -m\)" = arm64/g, 'uname -m)" = arm64');
function obj(name) {
  const f = function () { };
  return new Proxy(f, {
    get(_, k) {
      if (k === "js") return SPECIAL[name] !== undefined ? SPECIAL[name] : name;
      if (k === "isNil") return () => false;
      const full = name + "." + String(k);
      if (SPECIAL[full] !== undefined && typeof SPECIAL[full] !== "string") return SPECIAL[full];
      if (full in SPECIAL) return obj(full);
      return obj(full);
    },
    apply(_, __, a) { calls.push([name, a]); if (RET[name.split(".").pop()]) return RET[name.split(".").pop()](a); return obj(name + "()"); }
  });
}
const SPECIAL = {
  "$.NSBundle.mainBundle.resourcePath": RES, "$.NSBundle.mainBundle.bundlePath": "/Applications/Nova Remote.app",
  "$.NSHomeDirectory()": HOME, "$.NSProcessInfo.processInfo.processIdentifier": fakeApp.pid,
  "$.NSScreen.mainScreen.visibleFrame": { size: { width: 1440, height: 875 } },
};
const RET = { doubleForKey: () => 0, writeToFileAtomicallyEncodingError: a => { fs.writeFileSync(a[0], TEXT); return true; } };
let TEXT = "";
const $ = new Proxy(function (s) { TEXT = s; return obj("$(str)"); }, {
  get(_, k) { if (k === "NovaRemoteHandler") return { alloc: { init: { __handler: true } } }; return obj("$." + String(k)); }
});
const ObjC = { import() { }, registerSubclass(d) { classes[d.name] = d; }, deepUnwrap: x => x };
const sh = [];
function Application() { return { includeStandardAdditions: true,
  doShellScript(c) { sh.push(c); const r = cp.spawnSync("bash", ["-c", mac(c)], { env: { ...process.env, HOME }, encoding: "utf8", timeout: 30000 });
    if (r.status !== 0) { const e = new Error("sh " + r.status + " " + r.stderr); throw e; } return r.stdout.replace(/\n$/, ""); },
  displayAlert(t, o) { calls.push(["ALERT", [t, o]]); } }; }
Application.currentApplication = Application;
global.$ = $; global.ObjC = ObjC; global.Application = Application;
const src = fs.readFileSync(path.join(ROOT, "macbuild/window.js"), "utf8").replace(/http:\/\/127\.0\.0\.1:' \+ PORT/, "http://127.0.0.1:' + PORT").replace("var PORT = 8080;", "var PORT = 8177;");
const run = new Function("$", "ObjC", "Application", src + "\nreturn {run, reopen, onPageMessage: typeof onPageMessage === 'function' ? onPageMessage : null, serverUp};")($, ObjC, Application);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
(async () => {
  cp.execSync("pkill -f '[s]erver.js --no-open --port 8177' || true");
  const t0 = Date.now(); run.run(); const took = Date.now() - t0;
  console.log("run() returned in", took, "ms (must not wait for the server)");
  if (took > 4000) errs.push("run() blocked");
  const startPage = calls.find(c => c[0].endsWith("loadHTMLStringBaseURL"));
  console.log("start page shown:", !!startPage, "| alerts:", calls.filter(c => c[0] === "ALERT").length);
  const H = classes.NovaRemoteHandler; if (!H) errs.push("no handler class");
  console.log("handler methods:", Object.keys(H.methods).join(", "));
  const menuTitles = calls.filter(c => c[0].endsWith("initWithTitleActionKeyEquivalent")).map(c => c[1][0] + (c[1][2] ? " ⌘" + c[1][2] : ""));
  console.log("menu items:", menuTitles.join(" | "));
  for (const c of calls.filter(c => c[0].endsWith("initWithTitleActionKeyEquivalent"))) { const sel = c[1][1]; if (sel.startsWith("nr") && !H.methods[sel]) errs.push("menu action missing: " + sel); }
  let up = false; for (let i = 0; i < 60 && !(up = run.serverUp()); i++) await sleep(250);
  console.log("server up:", up); if (!up) errs.push("server didn't start");
  const ps = cp.execSync("ps -eo args | grep '[s]erver.js --no-open' || true").toString().trim();
  console.log("server process:", ps.replace(/.*node /, "node ")); if (!ps.includes("--exit-with " + fakeApp.pid)) errs.push("exit-with pid wrong");
  fs.writeFileSync(path.join(HOME, ".nova-remote/serial-capture-2026-11-11T17-00-00.log"), "# test capture\n");
  { const { chromium } = require("playwright"); const b = await chromium.launch(); const pg = await b.newPage(); await pg.goto("http://127.0.0.1:8177/"); await sleep(2500); await b.close(); }
  const msg = m => H.methods["userContentController:didReceiveScriptMessage:"].implementation(null, { body: m });
  msg({ download: "http://127.0.0.1:8177/api/report.csv", name: "Sound report 2026-11-11.csv" });
  msg({ download: "http://127.0.0.1:8177/api/report.csv", name: "Sound report 2026-11-11.csv" });
  msg({ download: "http://127.0.0.1:8177/api/capture", name: "" });
  msg({ save: "notes/a.txt", text: "hello" });
  msg({ open: "https://example.com/x" });
  const dl = fs.readdirSync(path.join(HOME, "Downloads")).sort();
  console.log("Downloads:", dl.join(" | "));
  if (!dl.includes("Sound report 2026-11-11.csv") || !dl.includes("Sound report 2026-11-11 2.csv")) errs.push("report download/naming");
  if (!dl.includes("notes-a.txt")) errs.push("blob save");
  const toasts = calls.filter(c => c[0].endsWith("evaluateJavaScriptCompletionHandler")).map(c => c[1][0]);
  console.log("toasts:", toasts.map(t => t.replace(/^window.toast&&toast\(/, "").replace(/\)$/, "")).join(" | "));
  const opened = calls.filter(c => c[0] === "$.NSURL.URLWithString").map(c => c[1][0]);
  console.log("opened outside:", opened.includes("https://example.com/x"));
  H.methods["nrZoomIn:"].implementation(null); H.methods["nrOpenInBrowser:"].implementation(null);
  console.log("zoom set:", calls.filter(c => c[0].endsWith("setPageZoom")).map(c => c[1][0]).join(","));
  // The page script: run it in a tiny DOM stand-in to check it intercepts download links and window.open.
  const posted = [];
  const listeners = {};
  const fakeWin = { webkit: { messageHandlers: { nova: { postMessage: m => posted.push(m) } } }, location: { href: "http://127.0.0.1:8080/", origin: "http://127.0.0.1:8080" } };
  const doc = { addEventListener: (t, f) => (listeners[t] = f) };
  const PAGE = /var PAGE_SCRIPT = ([\s\S]*?);\n/.exec(src)[1];
  const pageJs = eval(PAGE);
  new Function("window", "document", "location", "URL", "fetch", pageJs)(fakeWin, doc, fakeWin.location, URL, async () => ({ text: async () => "x" }));
  const link = (href, attrs) => ({ closest: () => ({ getAttribute: k => k === "href" ? href : attrs[k] == null ? null : attrs[k], target: attrs.target || "" }) });
  let prevented = 0; const ev = t => ({ target: t, preventDefault() { prevented++; } });
  listeners.click(ev(link("api/report.csv", { download: "Sound report.csv" })));
  listeners.click(ev(link("https://zaxcom.com", {})));
  listeners.click(ev(link("#setup", {})));
  fakeWin.open("/manual.pdf", "_blank");
  console.log("page script posted:", JSON.stringify(posted), "| prevented:", prevented);
  if (posted.length !== 3 || prevented !== 2) errs.push("page script");
  // Quit the "app": the server must stop by itself.
  fakeApp.kill(); let gone = false;
  for (let i = 0; i < 20 && !gone; i++) { await sleep(250); gone = !run.serverUp(); }
  console.log("server stopped after app quit:", gone); if (!gone) errs.push("server kept running");
  console.log("app.log tail:", fs.readFileSync(path.join(HOME, ".nova-remote/app.log"), "utf8").trim().split("\n").slice(-3).join(" / "));
  console.log("errors:", errs.length ? errs.join("; ") : "none");
  cp.execSync("pkill -f '[s]erver.js --no-open --port 8177' || true");
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.log("CRASH", e); process.exit(1); });
