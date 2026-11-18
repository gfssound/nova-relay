#!/bin/bash
# Nova Remote: install the Linux desktop app (its own window; this computer only, no browser needed).
#
# Run once on the Linux computer, with internet:   ./install-linux.sh
# It downloads Electron (the window, with its own built-in Node.js) from Electron's official GitHub releases,
# checks it against the published checksums, and installs Nova Remote for your user, with a menu entry.
# Nothing is installed system-wide and no sudo is needed. To remove it:  ./install-linux.sh --uninstall
#
# Electron already on this computer? It's used as is, nothing is downloaded:
#   - the copy from an earlier Nova Remote install (same Electron version), or
#   - an Electron already installed on the system (electron on the PATH, version 28 or newer).
# To download a fresh copy anyway:  ./install-linux.sh --reinstall
set -euo pipefail

ELECTRON_VERSION="33.2.1"
HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.local/share/nova-remote"
BIN="$HOME/.local/bin/nova-remote"
DESKTOP="$HOME/.local/share/applications/nova-remote.desktop"
ICON="$HOME/.local/share/icons/hicolor/512x512/apps/nova-remote.png"

REINSTALL=0; [ "${1:-}" = "--reinstall" ] && REINSTALL=1
if [ "${1:-}" = "--uninstall" ]; then
  rm -rf "$DEST" "$BIN" "$DESKTOP" "$ICON"
  command -v update-desktop-database >/dev/null && update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
  echo "Nova Remote removed. Your settings stay in ~/.nova-remote."
  exit 0
fi

fail(){ echo; echo "Install stopped: $*"; exit 1; }
[ "$(uname -s)" = "Linux" ] || fail "this installer is for Linux."
[ -f "$HERE/app/server.js" ] || fail "the 'app' folder is missing. Unzip the whole download and run this from inside it."

case "$(uname -m)" in
  x86_64|amd64) ARCH=x64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  armv7l) ARCH=armv7l ;;
  *) fail "this computer's processor ($(uname -m)) isn't supported." ;;
esac
VERSION="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$HERE/app/package.json" | head -1)"
echo "Installing Nova Remote $VERSION (Electron $ELECTRON_VERSION, $ARCH) for $(whoami)"

# ---- Electron: reuse what's already here, download only if needed (Nov 1) ----
MODE=""; SYS_ELECTRON=""
if [ "$REINSTALL" = "0" ] && [ -x "$DEST/electron/electron" ] && [ "$(cat "$DEST/electron/version" 2>/dev/null)" = "$ELECTRON_VERSION" ]; then
  MODE="kept"
elif [ "$REINSTALL" = "0" ] && command -v electron >/dev/null 2>&1; then
  SYS_ELECTRON="$(command -v electron)"
  SYS_VER="$(ELECTRON_RUN_AS_NODE=1 timeout 15 "$SYS_ELECTRON" -p 'process.versions.electron' 2>/dev/null | tail -1 || true)"
  if [ -n "$SYS_VER" ] && [ "${SYS_VER%%.*}" -ge 28 ] 2>/dev/null; then MODE="system"; else SYS_ELECTRON=""; fi
fi

if [ "$MODE" = "kept" ]; then
  echo "1/4  Electron $ELECTRON_VERSION is already installed here: using it (nothing to download)."
elif [ "$MODE" = "system" ]; then
  echo "1/4  Found Electron $SYS_VER on this computer ($SYS_ELECTRON): using it (nothing to download)."
else
  for t in curl unzip sha256sum; do command -v "$t" >/dev/null || fail "'$t' is needed (for example: sudo apt install $t)."; done
  WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
  BASE="https://github.com/electron/electron/releases/download/v$ELECTRON_VERSION"
  ZIP="electron-v$ELECTRON_VERSION-linux-$ARCH.zip"
  echo "1/4  Downloading Electron…"
  curl -fsSL "$BASE/SHASUMS256.txt" -o "$WORK/SHASUMS256.txt" || fail "couldn't reach github.com. Check the internet connection."
  curl -fL --progress-bar "$BASE/$ZIP" -o "$WORK/$ZIP" || fail "couldn't download $ZIP."
  want="$(grep " \*\?$ZIP\$" "$WORK/SHASUMS256.txt" | cut -d' ' -f1 || true)"
  got="$(sha256sum "$WORK/$ZIP" | cut -d' ' -f1)"
  [ -n "$want" ] && [ "$want" = "$got" ] || fail "$ZIP didn't match Electron's published checksum, so it wasn't used."
  MODE="bundled"
fi

echo "2/4  Installing Nova Remote to $DEST…"
if [ "$MODE" = "bundled" ]; then
  rm -rf "$DEST"; mkdir -p "$DEST"
  unzip -q "$WORK/$ZIP" -d "$DEST/electron"
  rm -f "$DEST/electron/resources/default_app.asar"
fi
if [ "$MODE" = "system" ]; then
  APPDIR="$DEST/app"; rm -rf "$DEST/electron"
else
  APPDIR="$DEST/electron/resources/app"; rm -rf "$DEST/app"
fi
rm -rf "$APPDIR"; mkdir -p "$APPDIR/server"
cp "$HERE/desktop/main.js" "$HERE/desktop/package.json" "$APPDIR/"
cp "$HERE/app/public/icon-512.png" "$APPDIR/icon.png"
(cd "$HERE/app" && cp -R server.js nova.js schema.json package.json public "$APPDIR/server/")
if [ "$MODE" = "system" ]; then RUN="\"$SYS_ELECTRON\" --no-sandbox \"$APPDIR\""; else RUN="\"$DEST/electron/electron\" --no-sandbox"; fi

echo "3/4  Adding the launcher and menu entry…"
mkdir -p "$(dirname "$BIN")" "$(dirname "$DESKTOP")" "$(dirname "$ICON")"
cat > "$BIN" <<LAUNCH
#!/bin/bash
# Nova Remote desktop app. (--no-sandbox: Chromium's sandbox helper needs root setup that a per-user install
# can't do; the window only ever loads the remote from this computer.)
exec $RUN "\$@"
LAUNCH
chmod +x "$BIN"
cp "$HERE/app/public/icon-512.png" "$ICON"
cat > "$DESKTOP" <<DESK
[Desktop Entry]
Type=Application
Name=Nova Remote
Comment=Control surface for a Zaxcom Nova (through the Aria-8)
Exec=$BIN
Icon=nova-remote
Terminal=false
Categories=AudioVideo;Audio;
StartupWMClass=Nova Remote
DESK
command -v update-desktop-database >/dev/null && update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true

echo "4/4  Checking serial port access…"
if ! id -nG | grep -qwE "dialout|uucp"; then
  echo
  echo "  To open the Aria's serial port, add yourself to the 'dialout' group once:"
  echo "      sudo usermod -aG dialout $(whoami)"
  echo "  then log out and back in."
fi
echo
echo "Done. Open Nova Remote from your applications menu, or run:  nova-remote"
echo "Settings are kept in ~/.nova-remote (shared with the other versions)."
