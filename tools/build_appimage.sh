#!/bin/bash
# Build the Linux AppImage: Nova-Relay-<version>-<arch>.AppImage (Nov 1).
# One file with the app and its own Electron inside: download, make it executable, run. Updating = replacing the file.
#   tools/build_appimage.sh            x86_64 (most Linux PCs and laptops)
#   tools/build_appimage.sh aarch64    64-bit ARM
# Electron comes from its official GitHub releases and is checked against the published checksums; downloads are
# kept in appimg/dl so later builds don't fetch them again. The AppImage runtime is AppImage's static type2-runtime,
# so the computer doesn't need libfuse2 installed.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
V="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' nova-remote/package.json | head -1)"
EV="33.2.1"
ARCH="${1:-x86_64}"
case "$ARCH" in x86_64) EA=x64 ;; aarch64) EA=arm64 ;; *) echo "Unknown arch $ARCH (x86_64 or aarch64)"; exit 1 ;; esac
DL="$ROOT/appimg/dl"; mkdir -p "$DL"
EB="https://github.com/electron/electron/releases/download/v$EV"
ZIP="electron-v$EV-linux-$EA.zip"
[ -f "$DL/SHASUMS256-$EV.txt" ] || curl -fsSL "$EB/SHASUMS256.txt" -o "$DL/SHASUMS256-$EV.txt"
[ -f "$DL/$ZIP" ] || curl -fsSL "$EB/$ZIP" -o "$DL/$ZIP"
want="$(grep " \*\?$ZIP\$" "$DL/SHASUMS256-$EV.txt" | cut -d' ' -f1)"; got="$(sha256sum "$DL/$ZIP" | cut -d' ' -f1)"
[ -n "$want" ] && [ "$want" = "$got" ] || { echo "$ZIP doesn't match Electron's checksum"; rm -f "$DL/$ZIP"; exit 1; }
[ -f "$DL/runtime-$ARCH" ] || curl -fsSL "https://github.com/AppImage/type2-runtime/releases/download/continuous/runtime-$ARCH" -o "$DL/runtime-$ARCH"
TOOL="$ROOT/appimg/tool/squashfs-root/AppRun"
if [ ! -x "$TOOL" ]; then
  [ -f "$DL/appimagetool-x86_64.AppImage" ] || curl -fsSL https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage -o "$DL/appimagetool-x86_64.AppImage"
  chmod +x "$DL/appimagetool-x86_64.AppImage"; mkdir -p "$ROOT/appimg/tool"; (cd "$ROOT/appimg/tool" && "$DL/appimagetool-x86_64.AppImage" --appimage-extract >/dev/null)
fi

AD="$ROOT/appimg/build/Nova-Relay-$ARCH.AppDir"
rm -rf "$AD"; mkdir -p "$AD/usr/lib"
unzip -q "$DL/$ZIP" -d "$AD/usr/lib/nova-remote"
rm -f "$AD/usr/lib/nova-remote/resources/default_app.asar"
APP="$AD/usr/lib/nova-remote/resources/app"; mkdir -p "$APP/server"
cp linuxbuild/desktop/main.js "$APP/"
printf '{\n  "name": "nova-remote-desktop",\n  "productName": "Nova Relay",\n  "version": "%s",\n  "main": "main.js"\n}\n' "$V" > "$APP/package.json"
cp nova-remote/public/icon-512.png "$APP/icon.png"
if [ -n "${NOVA_APP_STAGE:-}" ]; then cp -R "$ROOT/$NOVA_APP_STAGE/." "$APP/server/"   # the signed app folder (package.sh, Nov 18)
else (cd nova-remote && cp -R server.js nova.js schema.json package.json public deck update.js "$APP/server/"); fi
cp nova-remote/public/icon-512.png "$AD/nova-remote.png"; ln -s nova-remote.png "$AD/.DirIcon"
cat > "$AD/nova-remote.desktop" <<DESK
[Desktop Entry]
Type=Application
Name=Nova Relay
Comment=Control surface for a Zaxcom Nova (through the Aria-8)
Exec=nova-remote
Icon=nova-remote
Terminal=false
Categories=AudioVideo;Audio;
StartupWMClass=Nova Relay
X-AppImage-Version=$V
DESK
cat > "$AD/AppRun" <<'RUN'
#!/bin/bash
# Nova Relay AppImage. Settings live in ~/.nova-remote (shared with the other Nova Relay versions).
#   --install-menu   add Nova Relay to the applications menu (points at this AppImage file)
#   --remove-menu    take it out again
HERE="$(dirname "$(readlink -f "$0")")"
SELF="${APPIMAGE:-$HERE/AppRun}"
ENTRY="$HOME/.local/share/applications/nova-remote-appimage.desktop"
ICON="$HOME/.local/share/icons/hicolor/512x512/apps/nova-remote-appimage.png"
write_entry() {
  mkdir -p "$(dirname "$ENTRY")" "$(dirname "$ICON")"
  cp "$HERE/nova-remote.png" "$ICON"
  sed -e "s|^Exec=.*|Exec=\"$SELF\"|" -e "s|^Icon=.*|Icon=nova-remote-appimage|" "$HERE/nova-remote.desktop" > "$ENTRY"
  command -v update-desktop-database >/dev/null && update-desktop-database "$(dirname "$ENTRY")" 2>/dev/null || true
}
case "${1:-}" in
  --install-menu) write_entry; echo "Nova Relay added to the applications menu (it opens $SELF)."; exit 0 ;;
  --remove-menu) rm -f "$ENTRY" "$ICON"; echo "Nova Relay removed from the applications menu. Settings stay in ~/.nova-remote."; exit 0 ;;
esac
# A menu entry made earlier follows this file, so after an update it opens the new AppImage.
if [ -f "$ENTRY" ] && [ -n "${APPIMAGE:-}" ] && ! grep -qF "Exec=\"$SELF\"" "$ENTRY"; then write_entry; fi
# --no-sandbox: Chromium's sandbox helper needs root setup an AppImage can't have; the window only ever loads
# the remote from this computer.
exec "$HERE/usr/lib/nova-remote/electron" --no-sandbox "$@"
RUN
chmod +x "$AD/AppRun"

mkdir -p out
OUT="$ROOT/out/Nova-Relay-$V-$ARCH.AppImage"; rm -f "$OUT"
ARCH="$ARCH" "$TOOL" --no-appstream --runtime-file "$DL/runtime-$ARCH" "$AD" "$OUT" >/dev/null 2>"$ROOT/appimg/build/appimagetool-$ARCH.log" || { cat "$ROOT/appimg/build/appimagetool-$ARCH.log"; exit 1; }
chmod +x "$OUT"
echo "$(basename "$OUT")  $(du -h "$OUT" | cut -f1)"
