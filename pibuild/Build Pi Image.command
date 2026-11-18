#!/bin/bash
# Nova Relay: build the Nova Relay box card image for a Raspberry Pi.
#
# Run this on a Mac with internet (double-click it; the first time, right-click → Open → Open). It also runs on a
# Linux PC with mtools installed (sudo apt install mtools), from a terminal: ./"Build Pi Image.command"
#
# It downloads Raspberry Pi OS Lite (64-bit) from raspberrypi.com and Node.js for the Pi from nodejs.org, checks
# both against their published checksums, and puts Nova Relay and a first-power-up setup on the card image.
# The result, Nova-Relay-<version>-Pi.img.gz next to this file, goes onto a microSD card with Raspberry Pi Imager
# (Choose OS → Use custom) or balenaEtcher. At its first power-up the Pi sets itself up with no internet:
# Nova Relay, its Wi-Fi network and http://nova.local. The settings come from "Pi box settings.txt".
set -euo pipefail

NODE_VERSION="v22.11.0"            # Node.js LTS, the same as the Mac app. Change here to update.
OS_URL="${NOVA_PI_OS_URL:-https://downloads.raspberrypi.com/raspios_lite_arm64_latest}"
NODE_BASE="${NOVA_NODE_BASE:-https://nodejs.org/dist/$NODE_VERSION}"

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/app"
VERSION="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$SRC/package.json" 2>/dev/null | head -1)"
OUT="$HERE/Nova-Relay-$VERSION-Pi.img.gz"
CACHE="$HERE/downloads"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/nova-remote-pi.XXXXXX")"
OS_NAME="$(uname -s)"
DISK=""; MNT="$WORK/boot"

pause(){ [ -t 0 ] && [ -z "${NOVA_NO_PAUSE:-}" ] && { read -r -p "Press Return to close this window." || true; }; return 0; }
cleanup(){
  if [ "$OS_NAME" = "Darwin" ] && [ -n "$DISK" ]; then diskutil unmount "$MNT" >/dev/null 2>&1 || true; hdiutil detach "$DISK" >/dev/null 2>&1 || true; fi
  rm -rf "$WORK"
}
fail(){ echo; echo "Build stopped: $*"; echo; cleanup; pause; exit 1; }
trap 'fail "an unexpected error on line $LINENO."' ERR
sha256(){ if command -v shasum >/dev/null; then shasum -a 256 "$1" | cut -d' ' -f1; else sha256sum "$1" | cut -d' ' -f1; fi; }

[ -t 1 ] && [ -z "${NOVA_NO_PAUSE:-}" ] && clear
echo "Building the Nova Relay $VERSION card image for Raspberry Pi"
echo
[ -f "$SRC/server.js" ] || fail "the 'app' folder is missing. Unzip the whole download and run this from inside it."
for f in install-pi.sh firstboot.sh "Pi box settings.txt"; do [ -f "$HERE/$f" ] || fail "'$f' is missing. Unzip the whole download and run this from inside it."; done
for t in curl gzip; do command -v "$t" >/dev/null || fail "the tool '$t' wasn't found."; done
case "$OS_NAME" in
  Darwin) for t in hdiutil diskutil; do command -v "$t" >/dev/null || fail "macOS tool '$t' wasn't found."; done ;;
  Linux) command -v mcopy >/dev/null || fail "on Linux this needs mtools: sudo apt install mtools"; export MTOOLS_SKIP_CHECK=1 ;;
  *) fail "this runs on a Mac (or a Linux PC with mtools)." ;;
esac

# Settings (KEY=value lines in "Pi box settings.txt")
setting(){ sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" "$HERE/Pi box settings.txt" | tr -d '\r' | sed 's/[[:space:]]*$//' | tail -1; }
WIFI_PASSWORD="$(setting WIFI_PASSWORD)"; HOTSPOT="$(setting HOTSPOT)"
BOX_NAME="$(setting BOX_NAME)"; BOX_NAME="${BOX_NAME:-nova}"
LOGIN_NAME="$(setting LOGIN_NAME)"; LOGIN_NAME="${LOGIN_NAME:-pi}"
LOGIN_PASSWORD="$(setting LOGIN_PASSWORD)"; LOGIN_PASSWORD="${LOGIN_PASSWORD:-novaremote}"
TIME_ZONE="$(setting TIME_ZONE)"
if [ -z "$TIME_ZONE" ]; then
  TIME_ZONE="$(readlink /etc/localtime 2>/dev/null | sed -n 's#.*zoneinfo/##p')"
  [ -n "$TIME_ZONE" ] || TIME_ZONE="$(cat /etc/timezone 2>/dev/null || true)"
  TIME_ZONE="${TIME_ZONE:-UTC}"
fi
case "$HOTSPOT" in no|No|NO|off|0) ;; *) [ "${#WIFI_PASSWORD}" -ge 8 ] || fail "WIFI_PASSWORD in Pi box settings.txt needs at least 8 characters." ;; esac
echo "$LOGIN_NAME" | grep -Eq '^[a-z_][a-z0-9_-]{0,31}$' || fail "LOGIN_NAME in Pi box settings.txt: use lower-case letters and numbers only."
echo "$BOX_NAME" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9-]{0,62}$' || fail "BOX_NAME in Pi box settings.txt: letters, numbers and - only."
echo "Box: http://$BOX_NAME.local · Wi-Fi $(setting WIFI_NAME) · login $LOGIN_NAME · time zone $TIME_ZONE"
echo

mkdir -p "$CACHE"
fetch(){ # url file: download to the cache once (kept for the next build)
  [ -s "$2" ] && return 0
  curl -fL --retry 2 --progress-bar "$1" -o "$2.part" || { rm -f "$2.part"; return 1; }
  mv "$2.part" "$2"
}

# 1. Raspberry Pi OS Lite (64-bit), checked against raspberrypi.com's checksum
echo "1/5  Raspberry Pi OS Lite (64-bit)…"
FINAL="$(curl -fsSIL -o /dev/null -w '%{url_effective}' "$OS_URL")" || fail "couldn't reach downloads.raspberrypi.com. Check the internet connection."
IMG_NAME="$(basename "$FINAL")"
case "$IMG_NAME" in *.img.xz) ;; *) fail "unexpected Raspberry Pi OS download: $IMG_NAME" ;; esac
WANT="$(curl -fsSL "$FINAL.sha256" | awk '{print $1; exit}')" || fail "couldn't get the checksum for $IMG_NAME."
[ -s "$CACHE/$IMG_NAME" ] && [ "$(sha256 "$CACHE/$IMG_NAME")" != "$WANT" ] && rm -f "$CACHE/$IMG_NAME"
echo "     $IMG_NAME"
fetch "$FINAL" "$CACHE/$IMG_NAME" || fail "couldn't download $IMG_NAME."
[ "$(sha256 "$CACHE/$IMG_NAME")" = "$WANT" ] || { rm -f "$CACHE/$IMG_NAME"; fail "$IMG_NAME didn't match raspberrypi.com's checksum, so it wasn't used. Run this again."; }

# 2. Node.js for the Pi (Linux, 64-bit ARM), checked against nodejs.org's checksums
echo "2/5  Node.js $NODE_VERSION for the Pi…"
NODE_FILE="node-$NODE_VERSION-linux-arm64.tar.xz"
curl -fsSL "$NODE_BASE/SHASUMS256.txt" -o "$WORK/SHASUMS256.txt" || fail "couldn't reach nodejs.org. Check the internet connection."
NWANT="$(grep " $NODE_FILE\$" "$WORK/SHASUMS256.txt" | cut -d' ' -f1 || true)"
[ -n "$NWANT" ] || fail "nodejs.org doesn't list $NODE_FILE."
[ -s "$CACHE/$NODE_FILE" ] && [ "$(sha256 "$CACHE/$NODE_FILE")" != "$NWANT" ] && rm -f "$CACHE/$NODE_FILE"
fetch "$NODE_BASE/$NODE_FILE" "$CACHE/$NODE_FILE" || fail "couldn't download $NODE_FILE."
[ "$(sha256 "$CACHE/$NODE_FILE")" = "$NWANT" ] || { rm -f "$CACHE/$NODE_FILE"; fail "$NODE_FILE didn't match nodejs.org's checksum, so it wasn't used."; }

# 3. Unpack the image (macOS's own gzip reads .xz; xz is used when it's installed)
echo "3/5  Unpacking the image (about 3 GB; a minute or two)…"
IMG="$WORK/nova-remote.img"
if command -v xz >/dev/null; then xz -dc "$CACHE/$IMG_NAME" > "$IMG" || fail "couldn't unpack $IMG_NAME."
else gzip -dc "$CACHE/$IMG_NAME" > "$IMG" || fail "couldn't unpack $IMG_NAME (this Mac's gzip can't read .xz; install xz, or use a newer macOS)."; fi
SIZE=$(wc -c < "$IMG" | tr -d ' ')
[ "$SIZE" -gt 1000000000 ] || fail "the unpacked image is too small ($SIZE bytes); the download may be damaged. Delete the downloads folder and run this again."
[ "$(od -An -tx1 -j510 -N2 "$IMG" | tr -d ' \n')" = "55aa" ] || fail "the unpacked image doesn't look like a Raspberry Pi card image."

# 4. Nova Relay and its first-power-up setup, staged here, then written to the card's boot partition
echo "4/5  Adding Nova Relay ${VERSION}…"
STAGE="$WORK/stage"; mkdir -p "$STAGE/nova-remote"
cp -R "$SRC" "$STAGE/nova-remote/app"
cp "$HERE/install-pi.sh" "$HERE/firstboot.sh" "$STAGE/nova-remote/"
cp "$HERE/Pi box settings.txt" "$STAGE/nova-remote/settings.txt"
cp "$CACHE/$NODE_FILE" "$STAGE/nova-remote/"
cat > "$STAGE/nova-remote/README.txt" <<README
Nova Relay $VERSION box. At the first power-up the Pi installs Nova Relay from this folder (no internet needed)
and writes setup-log.txt here. After that, this folder isn't used; Nova Relay runs from /opt/nova-remote.
README
q(){ printf "'%s'" "$(printf '%s' "$1" | sed "s/'/''/g")"; }
cat > "$STAGE/user-data" <<USERDATA
#cloud-config
# Nova Relay box, made by Build Pi Image.command (Nova Relay $VERSION). Applied once, at the first power-up.
hostname: $BOX_NAME
manage_etc_hosts: true
timezone: $(q "$TIME_ZONE")
users:
  - name: $LOGIN_NAME
    groups: users,adm,dialout,audio,netdev,video,plugdev,sudo
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    lock_passwd: false
    plain_text_passwd: $(q "$LOGIN_PASSWORD")
enable_ssh: true
ssh_pwauth: true
runcmd:
  - [bash, -c, "if [ -f /boot/firmware/nova-remote/firstboot.sh ]; then bash /boot/firmware/nova-remote/firstboot.sh; else bash /boot/nova-remote/firstboot.sh; fi"]
USERDATA
NEED_KB=$(du -sk "$STAGE" | cut -f1)

check_boot(){ # folder: the boot partition, mounted
  [ -f "$1/cmdline.txt" ] && [ -f "$1/config.txt" ] || fail "the image's first partition isn't a Raspberry Pi boot partition."
  [ -f "$1/user-data" ] || fail "this Raspberry Pi OS image is older than November 2025 (no cloud-init), so it can't set itself up. Delete the downloads folder and run this again for the current one."
}
if [ "$OS_NAME" = "Darwin" ]; then
  ATTACH="$(hdiutil attach -imagekey diskimage-class=CRawDiskImage -nomount "$IMG")" || fail "hdiutil couldn't open the image."
  DISK="$(echo "$ATTACH" | awk 'NR==1{print $1}')"
  BOOTDEV="$(echo "$ATTACH" | awk '/FAT|DOS|Microsoft|Windows/{print $1; exit}')"
  [ -n "$BOOTDEV" ] || fail "couldn't find the image's boot partition."
  mkdir -p "$MNT"
  diskutil mount -mountPoint "$MNT" "$BOOTDEV" >/dev/null || fail "couldn't open the image's boot partition."
  check_boot "$MNT"
  FREE_KB=$(df -k "$MNT" | awk 'NR==2{print $4}')
  [ "$FREE_KB" -gt $((NEED_KB + 4096)) ] || fail "not enough room on the image's boot partition (${FREE_KB} KB free, ${NEED_KB} KB needed)."
  [ -f "$MNT/user-data.orig" ] || cp "$MNT/user-data" "$MNT/user-data.orig"
  rm -rf "$MNT/nova-remote"
  COPYFILE_DISABLE=1 cp -RX "$STAGE/nova-remote" "$MNT/"
  COPYFILE_DISABLE=1 cp -X "$STAGE/user-data" "$MNT/user-data"
  rm -rf "$MNT/.fseventsd" "$MNT/.Spotlight-V100" "$MNT/.Trashes" 2>/dev/null || true
  find "$MNT" -name '._*' -delete 2>/dev/null || true
  sync
  diskutil unmount "$MNT" >/dev/null || fail "couldn't close the image's boot partition."
  hdiutil detach "$DISK" >/dev/null || fail "couldn't close the image."
  DISK=""
else
  START=$(od -An -tu4 -j454 -N4 "$IMG" | tr -d ' ')
  P="$IMG@@$((START * 512))"
  mkdir -p "$MNT"
  for f in cmdline.txt config.txt user-data; do mcopy -n -i "$P" "::/$f" "$MNT/$f" 2>/dev/null || true; done
  check_boot "$MNT"
  mcopy -n -i "$P" "::/user-data.orig" "$WORK/had-orig" 2>/dev/null || mcopy -i "$P" "$MNT/user-data" "::/user-data.orig"
  mdeltree -i "$P" "::/nova-remote" 2>/dev/null || true
  mcopy -s -i "$P" "$STAGE/nova-remote" "::/" || fail "couldn't write to the image's boot partition (full?)."
  mcopy -o -i "$P" "$STAGE/user-data" "::/user-data" || fail "couldn't write the first-power-up setup."
fi

# 5. Compress for Raspberry Pi Imager / balenaEtcher
echo "5/5  Compressing (a few minutes)…"
rm -f "$OUT"
gzip -c "$IMG" > "$OUT.part" && mv "$OUT.part" "$OUT" || fail "couldn't write $(basename "$OUT")."
cleanup
trap - ERR

echo
echo "Done:  $(basename "$OUT")  (next to this file)"
echo
echo "To make a box:"
echo "  1. Raspberry Pi Imager: Choose Device (your Pi) · Choose OS → Use custom → this file · Choose Storage (the card)."
echo "     When it asks about OS customisation, choose No: the card already has the box's settings."
echo "  2. Put the card in the Pi, plug the Aria into a USB port and power it up."
echo "  3. After about 3 minutes, join the Wi-Fi \"$(setting WIFI_NAME)\" and open http://$BOX_NAME.local or http://10.42.0.1"
echo
echo "The downloads are kept in the downloads folder for the next build."
[ "$OS_NAME" = "Darwin" ] && open -R "$OUT"
pause
