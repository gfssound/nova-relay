#!/bin/bash
# Package Nova Relay for the version in package.json: the Mac app builder (.dmg), the Pi card image builder, the Linux
# AppImage and the Stream Deck plugin, each with the user manual.
set -euo pipefail
cd "$(dirname "$0")/.."
V="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' nova-remote/package.json | head -1)"
MANUAL="nova-remote/Nova Relay User Manual.pdf"
# Nov 6: the manual ships inside every app (public/manual.pdf) for the Help button.
cp "$MANUAL" nova-remote/public/manual.pdf
# Nov 7: the Stream Deck plugin ships inside every app (Setup › Stream Deck › Download) and as out/Nova-Relay.streamDeckPlugin.
node tools/build_streamdeck.js
APPFILES=(nova-remote/README.md nova-remote/nova.js nova-remote/package.json nova-remote/public nova-remote/schema.json nova-remote/server.js nova-remote/deck nova-remote/update.js)   # deck: Stream Deck on Linux / the Pi box (Nov 14); update.js: Setup › Updates (Nov 18)
# Nov 18: one app folder for every package, signed for Setup › Updates (tools/sign_update.js; release notes from
# tools/release_notes.txt, one per line). The same signed folder goes into the Mac and Pi kits, the AppImage and
# Nova-Relay-<v>-update.zip; out/latest.json tells every Nova Relay which version is newest (the print copies both
# into the repository's updates/ folder).
STAGE="pkg/app-$V"
rm -rf "$STAGE" && mkdir -p "$STAGE"
cp -r "${APPFILES[@]}" "$STAGE/"
node tools/sign_update.js "$STAGE" tools/release_notes.txt
rm -rf "pkg/update-$V" && mkdir -p "pkg/update-$V" && cp -r "$STAGE" "pkg/update-$V/app"
rm -f "out/Nova-Relay-$V-update.zip"; (cd "pkg/update-$V" && zip -qrX "../../out/Nova-Relay-$V-update.zip" app)
node -e '
const fs=require("fs"),c=require("crypto"),[v,f]=process.argv.slice(1);const b=fs.readFileSync("out/"+f);
const m=JSON.parse(fs.readFileSync("pkg/app-"+v+"/nova-update.json","utf8"));
fs.writeFileSync("out/latest.json",JSON.stringify({version:v,file:f,sha256:c.createHash("sha256").update(b).digest("hex"),size:b.length,date:new Date().toISOString().slice(0,10),notes:m.notes||[]},null,1)+"\n");' "$V" "Nova-Relay-$V-update.zip"
echo "Nova-Relay-$V-update.zip + latest.json"
# Nov 7 (Ferris): only the Mac app builder, the Pi box kit and the Linux AppImage are made now (plus the Stream Deck
# plugin and the manual). The plain cart zip and the Linux desktop installer zip are no longer made.
python3 tools/embed_mac_window.py
rm -rf "pkg/Nova-Relay-$V-Mac"
mkdir -p "pkg/Nova-Relay-$V-Mac/app"
cp -r "$STAGE/." "pkg/Nova-Relay-$V-Mac/app/"
cp "macbuild/Build Mac App.command" "macbuild/READ ME FIRST.txt" "$MANUAL" "pkg/Nova-Relay-$V-Mac/"
chmod +x "pkg/Nova-Relay-$V-Mac/Build Mac App.command"
rm -f "out/Nova-Relay-$V-Mac.zip"; (cd pkg && zip -qrX "../out/Nova-Relay-$V-Mac.zip" "Nova-Relay-$V-Mac")
echo "Nova-Relay-$V-Mac.zip"
# Pi box (Nov 10, Ferris: "should be an sd image"): the card image builder for the Mac (Build Pi Image.command makes
# Nova-Relay-<v>-Pi.img.gz from Raspberry Pi OS Lite + Node.js for the Pi), its settings file, the first-power-up
# setup, and install-pi.sh for updating a box in place. Replaces Nova-Relay-Pi-Kit.zip.
PI="pkg/Nova-Relay-$V-Pi"
rm -rf "$PI" && mkdir -p "$PI/app"
cp -r "$STAGE/." "$PI/app/"
cp "pibuild/Build Pi Image.command" "pibuild/Pi box settings.txt" pibuild/install-pi.sh pibuild/firstboot.sh "pibuild/READ ME FIRST.txt" "pibuild/Nova Relay Box Guide.pdf" "$MANUAL" "$PI/"
chmod +x "$PI/Build Pi Image.command" "$PI/install-pi.sh" "$PI/firstboot.sh"
rm -f "out/Nova-Relay-$V-Pi.zip"; (cd pkg && zip -qrX "../out/Nova-Relay-$V-Pi.zip" "Nova-Relay-$V-Pi")
echo "Nova-Relay-$V-Pi.zip"
# Linux AppImage (Nov 1): one file with its own Electron; x86_64.
NOVA_APP_STAGE="$STAGE" bash tools/build_appimage.sh x86_64
