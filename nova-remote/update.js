/* Updates (Nov 18, Ferris: "make the Mac version both easier to install and easier to update ... something similar for
   all versions of the relay ... make Updates its own setting menu, and make it read from the repository so that it
   alerts to an update and gives them the option to install it or not. Relay should never auto-update in the event
   something gets broken accidentally").

   Works the same on the Mac app, the Nova Relay box (Pi), the Linux AppImage and plain `node server.js`:
   - An update is a zip holding app/ (server.js, public/ ...) plus app/nova-update.json (version and a SHA-256 for every
     file) and app/nova-update.sig (an Ed25519 signature of that manifest). Nothing installs unless the signature
     matches the public key below and every file matches its SHA-256, so only updates Ferris published can install.
   - Where from: Setup › Updates checks github.com/gfssound/nova-relay (updates/latest.json on main) and says when a
     newer version is there; it installs only when someone presses Install. A file (the update zip, or the Mac or Pi
     kit zip) can be installed from any device too, for a cart without internet.
   - Installed into the data folder (<data>/app/<version>/), never over the app itself (a Mac app in Applications, a
     read-only AppImage, the box's /opt folder stay as they are). The app's own server.js starts the newest installed
     version (launch()), and falls back to its own if an update fails to start 3 times in a row.
   - Never while the Nova is recording. Settings stay. Go back: Setup › Updates › Go back to <previous>. */
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const zlib = require("zlib");
const crypto = require("crypto");

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAsNCoQS41svHDMGUTlIEZB21AxuDLA9u4zlUeFj/ciow=
-----END PUBLIC KEY-----
`;
const REPO = "gfssound/nova-relay";
const LATEST_URL = process.env.NOVA_UPDATE_URL || `https://raw.githubusercontent.com/${REPO}/main/updates/latest.json`;
const MANIFEST = "nova-update.json", SIG = "nova-update.sig";
const MAX_ZIP = 40 * 1024 * 1024, MAX_UNZIPPED = 120 * 1024 * 1024;
const NEEDED = ["server.js", "nova.js", "update.js", "diag.js", "package.json", "schema.json", "public/index.html"];

function dataDir(argv) {
  const a = argv.slice(2), i = a.indexOf("--data");
  return process.env.NOVA_REMOTE_DATA || (i >= 0 && a[i + 1] ? a[i + 1] : path.join(os.homedir(), ".nova-remote"));
}
const appRoot = data => path.join(data, "app");
const curFile = data => path.join(appRoot(data), "current.json");
function readJson(f) { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (_) { return null; } }
function writeJson(f, o) { const t = f + ".tmp"; fs.writeFileSync(t, JSON.stringify(o, null, 1)); fs.renameSync(t, f); }
/* "0.6.10" > "0.6.9" */
function cmp(a, b) {
  const pa = String(a).split(".").map(n => parseInt(n, 10) || 0), pb = String(b).split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}
const versionIn = dir => (readJson(path.join(dir, "package.json")) || {}).version || "0";

/* ---- start-up: run the newest installed update instead of the app's own copy ---- */
function launch(bundledDir, argv) {
  try {
    const data = dataDir(argv), cur = readJson(curFile(data));
    if (!cur || !cur.version || cur.failed) return null;
    const dir = path.join(appRoot(data), cur.version), entry = path.join(dir, "server.js");
    if (path.resolve(dir) === path.resolve(bundledDir) || !fs.existsSync(entry)) return null;
    const own = versionIn(bundledDir);
    if (cmp(cur.version, own) <= 0) return null;   /* the app itself is as new or newer (a fresh install): it wins */
    if (!cur.ok && (cur.tries || 0) >= 3) {
      cur.failed = true; writeJson(curFile(data), cur);
      console.error(`Nova Relay ${cur.version} (an update) didn't start 3 times in a row, so the app's own ${own} runs instead. Setup › Updates says so.`);
      return null;
    }
    if (!cur.ok) { cur.tries = (cur.tries || 0) + 1; writeJson(curFile(data), cur); }
    return entry;
  } catch (e) { console.error("Updates: couldn't check for an installed update (" + e.message + "); running the app's own version."); return null; }
}
/* The update has served pages for a while: it counts as working. */
function markGood(data, version) {
  const cur = readJson(curFile(data));
  if (cur && cur.version === version && (!cur.ok || cur.tries)) { cur.ok = true; cur.tries = 0; writeJson(curFile(data), cur); }
}

/* ---- zip (stored or deflated entries; what `zip` and macOS make) ---- */
function readZip(buf) {
  if (buf.length < 22) throw new Error("That file isn't a zip.");
  let e = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("That file isn't a zip (or it's damaged).");
  const count = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16);
  const out = new Map(); let total = 0;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("The zip's file list is damaged.");
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), loc = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    p += 46 + nlen + xlen + clen;
    if (name.endsWith("/")) continue;
    total += usize; if (total > MAX_UNZIPPED) throw new Error("The zip is too big to be a Nova Relay update.");
    out.set(name, () => {
      if (buf.readUInt32LE(loc) !== 0x04034b50) throw new Error(`The zip is damaged at ${name}.`);
      const start = loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28), raw = buf.subarray(start, start + csize);
      if (method === 0) return Buffer.from(raw);
      if (method === 8) return zlib.inflateRawSync(raw);
      throw new Error(`${name} is packed in a way Nova Relay can't unpack.`);
    });
  }
  return out;
}

/* ---- check a package: signature, version, every file ---- */
function verify(buf) {
  const zip = readZip(buf);
  const mName = [...zip.keys()].filter(n => n === MANIFEST || n.endsWith("/" + MANIFEST)).sort((a, b) => a.length - b.length)[0];
  if (!mName) throw new Error("That zip isn't a Nova Relay update (it has no nova-update.json). Use Nova-Relay-<version>-update.zip, or the Mac or Pi download.");
  const prefix = mName.slice(0, -MANIFEST.length);
  const sigGet = zip.get(prefix + SIG); if (!sigGet) throw new Error("The update isn't signed, so it wasn't installed.");
  const mBytes = zip.get(mName)(), sig = Buffer.from(String(sigGet()).trim(), "base64");
  let good = false; try { good = crypto.verify(null, mBytes, PUBLIC_KEY, sig); } catch (_) { }
  if (!good) throw new Error("The update's signature doesn't match, so it wasn't installed (it wasn't published by Nova Relay, or it was changed).");
  let m; try { m = JSON.parse(mBytes.toString("utf8")); } catch (_) { throw new Error("The update's list of files is damaged."); }
  if (m.app !== "nova-relay" || !m.version || !m.files || typeof m.files !== "object") throw new Error("That's not a Nova Relay update.");
  for (const n of NEEDED) if (!m.files[n]) throw new Error(`The update is missing ${n}.`);
  if (m.node && +process.versions.node.split(".")[0] < +m.node) throw new Error(`Nova Relay ${m.version} needs a newer Node.js (${m.node}) than this ${process.platform === "darwin" ? "Mac app" : "copy"} has. Install the full download instead.`);
  const files = new Map();
  for (const [rel, sum] of Object.entries(m.files)) {
    if (!/^[A-Za-z0-9._\-/ ]+$/.test(rel) || rel.split("/").some(s => s === ".." || s === "") || path.isAbsolute(rel)) throw new Error(`The update lists a file it can't have (${rel}).`);
    const get = zip.get(prefix + rel); if (!get) throw new Error(`The update is missing ${rel}.`);
    const data = get();
    if (crypto.createHash("sha256").update(data).digest("hex") !== sum) throw new Error(`${rel} in the update doesn't match its checksum, so nothing was installed.`);
    files.set(rel, data);
  }
  return { manifest: m, mBytes, sig: String(sigGet()).trim(), files };
}

/* ---- install (into <data>/app/<version>) ---- */
function install(buf, { data, running, bundledDir }) {
  if (buf.length > MAX_ZIP) throw new Error("That file is too big to be a Nova Relay update.");
  const { manifest: m, mBytes, sig, files } = verify(buf);
  if (cmp(m.version, running) <= 0) throw new Error(`That's Nova Relay ${m.version}, and this one is already ${running}. (To go back, use Go back in Setup › Updates.)`);
  const root = appRoot(data); fs.mkdirSync(root, { recursive: true });
  const tmp = path.join(root, `.incoming-${m.version}-${process.pid}`), dest = path.join(root, m.version);
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const [rel, d] of files) { const f = path.join(tmp, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, d); }
  fs.writeFileSync(path.join(tmp, MANIFEST), mBytes); fs.writeFileSync(path.join(tmp, SIG), sig + "\n");
  fs.rmSync(dest, { recursive: true, force: true }); fs.renameSync(tmp, dest);
  const before = readJson(curFile(data));
  const previous = before && before.version && !before.failed && fs.existsSync(path.join(root, before.version, "server.js")) && cmp(before.version, versionIn(bundledDir)) > 0 ? before.version : null;
  writeJson(curFile(data), { version: m.version, previous, tries: 0, ok: false, installed: new Date().toISOString(), from: running });
  /* keep this one and the one before it; older installed updates go */
  for (const d of fs.readdirSync(root)) {
    if (d === m.version || d === previous || d === "current.json" || d.startsWith(".incoming")) continue;
    if (/^\d+\.\d+\.\d+/.test(d)) fs.rmSync(path.join(root, d), { recursive: true, force: true });
  }
  return { version: m.version, notes: m.notes || [] };
}
function rollback({ data, running, bundledDir }) {
  const cur = readJson(curFile(data)); const own = versionIn(bundledDir);
  if (!cur || !cur.version) throw new Error(`Nova Relay is already on the app's own version (${own}); there's nothing to go back to.`);
  const prev = cur.previous && fs.existsSync(path.join(appRoot(data), cur.previous, "server.js")) ? cur.previous : null;
  if (prev) writeJson(curFile(data), { version: prev, previous: null, tries: 0, ok: true, installed: new Date().toISOString(), from: running, wentBackFrom: cur.version });
  else fs.rmSync(curFile(data), { force: true });
  return { version: prev || own };
}
function info({ data, running, bundledDir }) {
  const cur = readJson(curFile(data)), own = versionIn(bundledDir);
  const fromUpdate = path.resolve(bundledDir) !== path.resolve(__dirname);
  const prev = cur && cur.previous && fs.existsSync(path.join(appRoot(data), cur.previous, "server.js")) ? cur.previous : null;
  return {
    running, appVersion: own, fromUpdate,
    failed: cur && cur.failed ? cur.version : null,
    back: fromUpdate ? (prev || own) : null,   /* what Go back returns to */
    source: `github.com/${REPO}`,
  };
}

/* ---- the repository: updates/latest.json → {version, file, sha256, size, notes[], date} ---- */
function fetchUrl(url, { max = MAX_ZIP, timeout = 15000, redirects = 4 } = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https:") ? require("https") : require("http");
    const req = mod.get(url, { headers: { "User-Agent": "Nova-Relay-updater", "Cache-Control": "no-cache" }, timeout }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume(); return resolve(fetchUrl(new URL(res.headers.location, url).href, { max, timeout, redirects: redirects - 1 }));
      }
      if (res.statusCode !== 200) { res.resume(); const e = new Error(`HTTP ${res.statusCode}`); e.status = res.statusCode; return reject(e); }
      const chunks = []; let n = 0;
      res.on("data", d => { n += d.length; if (n > max) { req.destroy(); reject(new Error("too big")); } else chunks.push(d); });
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("timed out")));
    req.on("error", reject);
  });
}
const latestUrl = () => LATEST_URL;
const fileUrl = name => new URL(name, LATEST_URL).href;
async function checkLatest() {
  let buf;
  try { buf = await fetchUrl(LATEST_URL + (LATEST_URL.includes("?") ? "&" : "?") + "t=" + Date.now(), { max: 64 * 1024 }); }
  catch (e) {
    const err = new Error(e.status === 404 ? `No update list at ${`github.com/${REPO}`} yet (the repository may still be private).` : `Couldn't reach github.com (${e.message}). This computer may not have internet.`);
    err.offline = e.status !== 404; throw err;
  }
  let j; try { j = JSON.parse(buf.toString("utf8")); } catch (_) { throw new Error("The update list on GitHub is damaged."); }
  if (!j || !j.version || !j.file) throw new Error("The update list on GitHub is incomplete.");
  return { version: String(j.version), file: String(j.file), url: fileUrl(j.file), sha256: j.sha256 || null, size: +j.size || null, notes: Array.isArray(j.notes) ? j.notes.map(String).slice(0, 20) : [], date: j.date || null };
}
async function download(latest) {
  const buf = await fetchUrl(latest.url, { max: MAX_ZIP, timeout: 120000 });
  if (latest.sha256 && crypto.createHash("sha256").update(buf).digest("hex") !== latest.sha256) throw new Error("The downloaded update doesn't match the update list's checksum. Try again.");
  return buf;
}

module.exports = { launch, markGood, verify, install, rollback, info, checkLatest, download, cmp, dataDir, latestUrl, MANIFEST, SIG, REPO };
