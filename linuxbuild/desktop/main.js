/* Nova Relay desktop window (Linux). Starts the cart server for this computer only and shows the remote in its
   own window. No browser, phones or iPads. Closing the window stops everything. */
"use strict";
const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");
const http = require("http");

const SERVER = path.join(__dirname, "server", "server.js");
let server = null, win = null, quitting = false;

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

/* Port 8080 when it's free, so Stream Deck and other button boxes can always find the button API at
   http://localhost:8080/api/... (Oct 30); otherwise any free port, so it never clashes with another program. */
const tryPort = want => new Promise((res, rej) => {
  const s = net.createServer(); s.unref(); s.on("error", rej);
  s.listen(want, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});
const freePort = () => tryPort(8080).catch(() => tryPort(0));
const waitFor = (url, ms) => new Promise((res, rej) => {
  const end = Date.now() + ms;
  const tryOnce = () => http.get(url, r => { r.resume(); res(); }).on("error", () => Date.now() > end ? rej(new Error("The Nova Relay server didn't start.")) : setTimeout(tryOnce, 150));
  tryOnce();
});

function spawnServer(port) {
  let log = "";
  /* Electron's own binary runs the server as plain Node. */
  server = spawn(process.execPath, [SERVER, "--port", String(port), "--no-open", "--local"], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NOVA_PARENT_RESTARTS: "1" }, cwd: path.dirname(SERVER), stdio: ["ignore", "pipe", "pipe"]
  });
  server.stdout.on("data", d => { log += d; process.stdout.write(d); });
  server.stderr.on("data", d => { log += d; process.stderr.write(d); });
  server.on("exit", code => {
    if (quitting) return;
    /* Nov 18: 75 = an update was installed (Setup › Updates): start the server again (it runs the new version) and reload */
    if (code === 75) { restart(port).catch(e => { dialog.showErrorBox("Nova Relay", String(e && e.message || e)); app.quit(); }); return; }
    dialog.showErrorBox("Nova Relay stopped", `The Nova Relay server stopped (code ${code}).\n\n${log.slice(-1500)}`);
    app.quit();
  });
}
async function restart(port) {
  spawnServer(port); const url = `http://127.0.0.1:${port}/`;
  await waitFor(url, 20000); if (win) await win.loadURL(url);
}
async function start() {
  const port = await freePort();
  spawnServer(port);
  const url = `http://127.0.0.1:${port}/`;
  await waitFor(url, 15000);
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600, title: "Nova Relay", backgroundColor: "#0a0b0c",
    icon: path.join(__dirname, "icon.png"), autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  /* Links that leave the remote open in the system browser, never inside the app. */
  win.webContents.setWindowOpenHandler(({ url: u }) => { if (/^https?:/.test(u)) shell.openExternal(u); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, u) => { if (!u.startsWith(url)) { e.preventDefault(); if (/^https?:/.test(u)) shell.openExternal(u); } });
  win.on("closed", () => { win = null; });
  await win.loadURL(url);
}

Menu.setApplicationMenu(Menu.buildFromTemplate([
  { label: "Nova Relay", submenu: [{ role: "reload" }, { role: "togglefullscreen" }, { type: "separator" }, { role: "quit" }] },
  { label: "View", submenu: [{ role: "zoomIn" }, { role: "zoomOut" }, { role: "resetZoom" }, { type: "separator" }, { role: "toggleDevTools" }] }
]));

app.whenReady().then(start).catch(e => { dialog.showErrorBox("Nova Relay", String(e && e.message || e)); app.quit(); });
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => { quitting = true; if (server && server.exitCode == null) server.kill("SIGTERM"); });
