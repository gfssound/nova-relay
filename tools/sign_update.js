#!/usr/bin/env node
/* Nov 18: sign Nova Relay's app folder for Setup › Updates (see nova-remote/update.js).
     node tools/sign_update.js <app folder> [notes file]
   Writes <app folder>/nova-update.json (app, version, minimum Node.js, a SHA-256 for every file, release notes) and
   <app folder>/nova-update.sig (Ed25519 signature of that file, base64). The private key comes from NOVA_SIGNING_KEY
   or signing/update-signing-key.pem; it never goes into a package or the repository. Every Nova Relay checks the
   signature with the public key built into update.js, so only updates made with this key can install. */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const dir = path.resolve(process.argv[2] || "nova-remote");
const notesFile = process.argv[3];
const keyFile = process.env.NOVA_SIGNING_KEY || path.join(__dirname, "..", "signing", "update-signing-key.pem");
if (!fs.existsSync(keyFile)) { console.error(`No signing key at ${keyFile}. Updates can't be made without it (see signing/README).`); process.exit(1); }
const key = crypto.createPrivateKey(fs.readFileSync(keyFile));
const pub = crypto.createPublicKey(key).export({ type: "spki", format: "pem" }).toString();
const built = fs.readFileSync(path.join(dir, "update.js"), "utf8");
if (!built.includes(pub.trim().split("\n")[1])) { console.error("This signing key doesn't match the public key in update.js, so its updates would be refused."); process.exit(1); }
const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
const files = {};
(function walk(rel) {
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? rel + "/" + e.name : e.name;
    if (/\.(bak|tmp)$|\.v\d+.*\.bak$|^\.|^node_modules$|^nova-update\.(json|sig)$/.test(e.name) || /\.bak\b/.test(e.name)) continue;
    if (e.isDirectory()) walk(r);
    else if (e.isFile()) files[r] = crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, r))).digest("hex");
  }
})("");
const notes = notesFile && fs.existsSync(notesFile) ? fs.readFileSync(notesFile, "utf8").split("\n").map(l => l.replace(/^[-*]\s*/, "").trim()).filter(Boolean) : [];
const manifest = Buffer.from(JSON.stringify({ app: "nova-relay", version: pkg.version, node: 18, built: new Date().toISOString(), notes, files }, null, 1));
const sig = crypto.sign(null, manifest, key).toString("base64");
fs.writeFileSync(path.join(dir, "nova-update.json"), manifest);
fs.writeFileSync(path.join(dir, "nova-update.sig"), sig + "\n");
console.log(`Signed Nova Relay ${pkg.version}: ${Object.keys(files).length} files${notes.length ? ", " + notes.length + " release notes" : ""}.`);
