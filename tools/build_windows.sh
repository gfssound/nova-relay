#!/bin/bash
# Build the Windows desktop app (portable folder, ready to run) for the version in package.json.
# Uses the Electron Windows zip downloaded (and checksum-checked) into winbuild/dl.
set -euo pipefail
cd "$(dirname "$0")/.."
V="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' nova-remote/package.json | head -1)"
EZIP="winbuild/dl/electron-v33.2.1-win32-x64.zip"
[ -f "$EZIP" ] || { echo "missing $EZIP"; exit 1; }
OUT="pkg/Nova-Relay-$V-Windows"
APP="$OUT/Nova Relay"
rm -rf "$OUT"; mkdir -p "$APP"
unzip -q "$EZIP" -d "$APP"
mv "$APP/electron.exe" "$APP/Nova Relay.exe"
rm -f "$APP/resources/default_app.asar"
mkdir -p "$APP/resources/app/server"
cp linuxbuild/desktop/main.js "$APP/resources/app/"
printf '{\n  "name": "nova-remote-desktop",\n  "productName": "Nova Relay",\n  "version": "%s",\n  "main": "main.js"\n}\n' "$V" > "$APP/resources/app/package.json"
cp nova-remote/public/icon-512.png "$APP/resources/app/icon.png"
cp -r nova-remote/server.js nova-remote/nova.js nova-remote/schema.json nova-remote/package.json nova-remote/public nova-remote/deck "$APP/resources/app/server/"
python3 -c "from PIL import Image; Image.open('nova-remote/public/icon-512.png').save('$APP/nova-remote.ico', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])"
cp "winbuild/Install shortcuts.bat" "winbuild/READ ME FIRST.txt" "nova-remote/Nova Relay User Manual.pdf" "$OUT/"
# Windows line endings for the text files
sed -i 's/$/\r/' "$OUT/Install shortcuts.bat" "$OUT/READ ME FIRST.txt"
(cd pkg && rm -f "../out/Nova-Relay-$V-Windows.zip" && zip -qrX -9 "../out/Nova-Relay-$V-Windows.zip" "Nova-Relay-$V-Windows")
ls -la "out/Nova-Relay-$V-Windows.zip" | awk '{print $5, $9}'
