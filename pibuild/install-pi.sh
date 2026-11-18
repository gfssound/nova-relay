#!/bin/bash
# Nova Relay box: turn a Raspberry Pi into a stand-alone Nova Relay.
#
# What it does
#   - installs Node.js (from Raspberry Pi OS) and Nova Relay (from the "app" folder beside this script)
#   - starts Nova Relay at power-up and restarts it if it ever stops
#   - finds the Aria (USB serial) by itself, as on a computer
#   - makes the Pi its own Wi-Fi network (default name NOVA-REMOTE) so phones, iPads and laptops can join
#   - gives it easy addresses: http://nova.local and http://10.42.0.1
#
# Run once on the Pi, with internet (Ethernet cable, or the Pi's Wi-Fi before the hotspot takes over):
#     sudo ./install-pi.sh
# Options:
#     --ssid NAME        Wi-Fi network name             (default NOVA-REMOTE)
#     --password PASS    Wi-Fi password, 8+ characters  (default novaremote)
#     --country CC       two-letter Wi-Fi country code  (default US)
#     --name NAME        box name, for http://NAME.local (default nova)
#     --band 5|2.4       Wi-Fi band for the box's network (default 5: ZaxNet uses 2.4 GHz, so 5 GHz keeps clear of it)
#     --channel N        Wi-Fi channel                  (default 36 on 5 GHz, 6 on 2.4 GHz)
#     --no-hotspot       don't make a Wi-Fi network; join the cart's existing one instead
#     --node-tarball F   install Node.js from this file (node-vXX-linux-arm64.tar.xz) instead of the internet
#     --first-boot       used by the Nova Relay card image on its first power-up (no internet needed)
#     --uninstall        remove Nova Relay and the hotspot
set -euo pipefail

SSID="NOVA-REMOTE"; PASS="novaremote"; COUNTRY="US"; NAME="nova"; HOTSPOT=1; UNINSTALL=0; BAND="5"; CHANNEL=""
NODE_TARBALL=""; FIRST_BOOT=0
while [ $# -gt 0 ]; do
  case "$1" in
    --ssid) SSID="$2"; shift 2 ;;
    --password) PASS="$2"; shift 2 ;;
    --country) COUNTRY="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --band) BAND="${2%GHz}"; BAND="${BAND%ghz}"; shift 2 ;;
    --channel) CHANNEL="$2"; shift 2 ;;
    --no-hotspot) HOTSPOT=0; shift ;;
    --node-tarball) NODE_TARBALL="$2"; shift 2 ;;
    --first-boot) FIRST_BOOT=1; shift ;;
    --uninstall) UNINSTALL=1; shift ;;
    -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)"; exit 1 ;;
  esac
done

HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="/opt/nova-remote"
DATA="/var/lib/nova-remote"
UNIT="/etc/systemd/system/nova-remote.service"
CONN="nova-hotspot"
DNSCONF="/etc/NetworkManager/dnsmasq-shared.d/nova-remote.conf"

fail(){ echo; echo "Install stopped: $*"; exit 1; }
step(){ echo; echo "== $*"; }
[ "$(id -u)" = "0" ] || fail "run it with sudo:  sudo ./install-pi.sh"

if [ "$UNINSTALL" = "1" ]; then
  systemctl disable --now nova-remote 2>/dev/null || true
  rm -f "$UNIT"; systemctl daemon-reload
  nmcli connection delete "$CONN" 2>/dev/null || true
  rm -f "$DNSCONF"
  rm -rf "$DEST"
  rm -f /usr/local/sbin/nova-set-clock /etc/sudoers.d/nova-relay-clock /etc/udev/rules.d/50-nova-relay-streamdeck.rules /etc/udev/rules.d/50-nova-relay-serial.rules
  echo "Nova Relay removed. Its saved settings stay in $DATA (delete that folder to remove them too)."
  exit 0
fi

[ -f "$HERE/app/server.js" ] || fail "the 'app' folder is missing. Unzip the whole kit and run this from inside it."
grep -qi "raspberry\|bcm" /proc/cpuinfo /proc/device-tree/model 2>/dev/null || echo "Note: this doesn't look like a Raspberry Pi. Carrying on anyway."
command -v nmcli >/dev/null || fail "NetworkManager (nmcli) wasn't found. Use Raspberry Pi OS Bookworm or newer."
if [ "$HOTSPOT" = "1" ] && [ "${#PASS}" -lt 8 ]; then fail "the Wi-Fi password needs at least 8 characters."; fi
case "$BAND" in 5) NMBAND=a; [ -n "$CHANNEL" ] || CHANNEL=36 ;; 2.4|2) BAND=2.4; NMBAND=bg; [ -n "$CHANNEL" ] || CHANNEL=6 ;; *) fail "--band must be 5 or 2.4." ;; esac

step "1/6  Installing Node.js"
NODE_DIR="/opt/nova-remote-node"
if [ -n "$NODE_TARBALL" ]; then
  # Nov 10: the card image carries Node.js for the Pi (checked against nodejs.org's checksums when the image was
  # built), so the first power-up needs no internet.
  [ -f "$NODE_TARBALL" ] || fail "Node.js file not found: $NODE_TARBALL"
  rm -rf "$NODE_DIR"; mkdir -p "$NODE_DIR"
  tar -xJf "$NODE_TARBALL" -C "$NODE_DIR" --strip-components=1 || fail "couldn't unpack $NODE_TARBALL."
  ln -sf "$NODE_DIR/bin/node" /usr/local/bin/node
  hash -r
  "$NODE_DIR/bin/node" -v >/dev/null 2>&1 || fail "the Node.js on the card doesn't run on this Pi (it needs a 64-bit Raspberry Pi OS)."
fi
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -lt 18 ]; then
  apt-get update -qq || fail "couldn't reach the package servers. Connect the Pi to the internet (Ethernet is easiest) and run this again."
  apt-get install -y -qq nodejs avahi-daemon >/dev/null || fail "couldn't install Node.js."
fi
command -v avahi-daemon >/dev/null || [ "$FIRST_BOOT" = "1" ] || apt-get install -y -qq avahi-daemon >/dev/null || true
echo "     Node.js $(node -v)"

step "2/6  Copying Nova Relay to $DEST"
id nova >/dev/null 2>&1 || useradd --system --home "$DATA" --shell /usr/sbin/nologin nova
usermod -aG dialout nova
rm -rf "$DEST"; mkdir -p "$DEST" "$DATA"
cp -R "$HERE/app/." "$DEST/"
chown -R root:root "$DEST"; chown -R nova:nova "$DATA"
VERSION="$(node -p "require('$DEST/package.json').version")"
echo "     Nova Relay $VERSION"

step "3/6  Naming the box ($NAME.local)"
if [ "$(hostname)" != "$NAME" ]; then
  hostnamectl set-hostname "$NAME"
  sed -i "s/^127\.0\.1\.1.*/127.0.1.1\t$NAME/" /etc/hosts || true
  grep -q "127.0.1.1" /etc/hosts || echo -e "127.0.1.1\t$NAME" >> /etc/hosts
fi
systemctl enable --now avahi-daemon >/dev/null 2>&1 || true

step "4/6  Starting Nova Relay at power-up"
# Clock (Nov 14, 0.6.1): a Pi has no battery clock, so on the cart (no internet) it starts at the last saved time. The
# server sets it from a connected phone/iPad's time (--set-clock) through this helper: root-owned, accepts only a plain
# number of seconds in a sane range, and is the only thing user nova may run with sudo.
cat > /usr/local/sbin/nova-set-clock <<'HELPER'
#!/bin/sh
# Nova Relay box: set the system clock to the given time (seconds since 1970). Called by the Nova Relay server.
case "$1" in ''|*[!0-9]*) echo "usage: nova-set-clock <unix-seconds>" >&2; exit 2 ;; esac
[ "$1" -ge 1793491200 ] && [ "$1" -le 4102444800 ] || { echo "time out of range" >&2; exit 2; }
date -s "@$1" >/dev/null || exit 1
command -v fake-hwclock >/dev/null 2>&1 && fake-hwclock save >/dev/null 2>&1
exit 0
HELPER
chown root:root /usr/local/sbin/nova-set-clock; chmod 755 /usr/local/sbin/nova-set-clock
echo "nova ALL=(root) NOPASSWD: /usr/local/sbin/nova-set-clock" > /etc/sudoers.d/nova-relay-clock
chmod 440 /etc/sudoers.d/nova-relay-clock
visudo -cf /etc/sudoers.d/nova-relay-clock >/dev/null 2>&1 || { rm -f /etc/sudoers.d/nova-relay-clock; echo "   (couldn't add the clock permission; the box's clock won't follow your phone)"; }
# Stream Deck (Nov 14, 0.6.3): Nova Relay drives a Stream Deck plugged into the box itself (no Stream Deck app); user
# nova needs to open it. Elgato's USB vendor ID is 0fd9; the rule covers every Stream Deck model.
cat > /etc/udev/rules.d/50-nova-relay-streamdeck.rules <<'RULE'
# Nova Relay box: let Nova Relay (user nova) use a Stream Deck plugged into this Pi.
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0fd9", MODE="0660", GROUP="nova"
RULE
# Nov 18 (Ferris: settings on the Nova changed when the box connected): nothing else on the box may write to the
# Nova's port. ModemManager (on some Raspberry Pi OS images) sends modem commands to every new USB serial port, which
# the Nova could read as setting changes; this rule tells it to leave them alone. The serial console is never on USB.
cat > /etc/udev/rules.d/50-nova-relay-serial.rules <<'RULE'
# Nova Relay box: no modem probing on USB serial ports (the Nova's cable is one).
SUBSYSTEM=="tty", KERNEL=="ttyUSB[0-9]*|ttyACM[0-9]*", ENV{ID_MM_DEVICE_IGNORE}="1", ENV{ID_MM_PORT_IGNORE}="1"
RULE
if systemctl list-unit-files ModemManager.service >/dev/null 2>&1 && systemctl is-enabled ModemManager >/dev/null 2>&1; then
  systemctl disable --now ModemManager >/dev/null 2>&1 && echo "   ModemManager switched off (it probes USB serial ports, including the Nova's)."
fi
udevadm control --reload-rules >/dev/null 2>&1 || true
udevadm trigger --subsystem-match=hidraw >/dev/null 2>&1 || true
URLS="http://$NAME.local"; [ "$HOTSPOT" = "1" ] && URLS="$URLS,http://10.42.0.1"
cat > "$UNIT" <<UNITFILE
[Unit]
Description=Nova Relay (control surface for a Zaxcom Nova)
After=network-online.target
Wants=network-online.target

[Service]
User=nova
Group=nova
SupplementaryGroups=dialout
Environment=NOVA_REMOTE_DATA=$DATA
Environment=NOVA_REMOTE_URLS=$URLS
ExecStart=/usr/bin/env node $DEST/server.js --port 80 --no-open --set-clock --deck
AmbientCapabilities=CAP_NET_BIND_SERVICE
Restart=always
RestartSec=2
WorkingDirectory=$DEST

[Install]
WantedBy=multi-user.target
UNITFILE
systemctl daemon-reload
systemctl enable nova-remote >/dev/null
systemctl restart nova-remote

step "5/6  Checking it's running"
ok=0; for i in $(seq 1 20); do if curl -fsS -o /dev/null http://127.0.0.1/ 2>/dev/null; then ok=1; break; fi; sleep 0.5; done
[ "$ok" = "1" ] && echo "     Nova Relay answers on port 80." || { journalctl -u nova-remote -n 20 --no-pager; fail "Nova Relay didn't start (log above)."; }

if [ "$HOTSPOT" = "1" ]; then
  step "6/6  Making the Wi-Fi network \"$SSID\""
  raspi-config nonint do_wifi_country "$COUNTRY" 2>/dev/null || iw reg set "$COUNTRY" 2>/dev/null || true
  rfkill unblock wifi 2>/dev/null || true
  mkdir -p "$(dirname "$DNSCONF")"
  printf 'address=/%s.lan/10.42.0.1\naddress=/nova.remote/10.42.0.1\n' "$NAME" > "$DNSCONF"
  nmcli connection delete "$CONN" >/dev/null 2>&1 || true
  nmcli connection add type wifi ifname wlan0 con-name "$CONN" autoconnect yes ssid "$SSID" \
    802-11-wireless.mode ap 802-11-wireless.band "$NMBAND" 802-11-wireless.channel "$CHANNEL" \
    ipv4.method shared ipv4.addresses 10.42.0.1/24 ipv6.method disabled \
    wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$PASS" connection.autoconnect-priority 100 >/dev/null
  echo
  echo "     $BAND GHz, channel $CHANNEL."
  echo "     The Pi switches its Wi-Fi to \"$SSID\" now. If you're connected to the Pi over Wi-Fi, this session"
  echo "     will drop: join \"$SSID\" (password: $PASS) and you're done."
  [ "$FIRST_BOOT" = "1" ] || sleep 2
  if ! nmcli connection up "$CONN" >/dev/null 2>&1; then
    [ "$BAND" = "5" ] || fail "couldn't start the Wi-Fi network. Check the country code (--country) and try again."
    # Some Pis (Zero 2 W, Pi 3B) can't host a 5 GHz network. Fall back to 2.4 GHz, and say why that matters.
    echo
    echo "     This Pi couldn't start a 5 GHz network (a Pi Zero 2 W or 3B can't; check --country on a Pi 4 or 5)."
    echo "     Using 2.4 GHz channel 6 instead. ZaxNet also uses 2.4 GHz, so a Pi 4 or 5 on 5 GHz is better."
    BAND=2.4; CHANNEL=6
    nmcli connection modify "$CONN" 802-11-wireless.band bg 802-11-wireless.channel 6
    nmcli connection up "$CONN" >/dev/null || fail "couldn't start the Wi-Fi network. Check the country code (--country) and try again."
  fi
else
  step "6/6  No hotspot (--no-hotspot): the box stays on the Wi-Fi or Ethernet it already uses"
fi

echo
echo "Done. Nova Relay $VERSION is running and starts by itself at power-up."
if [ "$HOTSPOT" = "1" ]; then
  echo "  1. Join the Wi-Fi network \"$SSID\" (password: $PASS; $BAND GHz, channel $CHANNEL)"
  echo "  2. Open  http://$NAME.local   or   http://10.42.0.1"
else
  echo "  Open  http://$NAME.local   (or this Pi's address on your network)"
fi
echo "  Plug the Aria into any USB port; Nova Relay finds it by itself."
echo "  Stream Deck: plug it into the box and set up its keys in Setup › Stream Deck."
