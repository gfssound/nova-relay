#!/bin/bash
# Nova Relay card image: first power-up. Run once by cloud-init (see user-data on the card's boot partition).
# Installs Nova Relay from the card with no internet, using the settings the image was built with, and leaves a
# copy of the log on the boot partition (nova-remote/setup-log.txt) so it can be read on a Mac or PC.
FW=/boot/firmware; [ -d "$FW/nova-remote" ] || FW=/boot
D="$FW/nova-remote"
LOG=/var/log/nova-remote-setup.log

# The settings chosen when the image was built (Pi box settings.txt), as KEY=value lines.
SSID="NOVA-REMOTE"; PASSWORD="novaremote"; COUNTRY="US"; NAME="nova"; BAND="5"; CHANNEL=""; HOTSPOT="yes"
if [ -f "$D/settings.txt" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"; case "$line" in ''|'#'*) continue ;; esac
    key="${line%%=*}"; val="${line#*=}"
    key="$(echo "$key" | tr -d '[:space:]')"; val="$(echo "$val" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
    case "$key" in
      WIFI_NAME) SSID="$val" ;; WIFI_PASSWORD) PASSWORD="$val" ;; WIFI_COUNTRY) COUNTRY="$val" ;;
      BOX_NAME) NAME="$val" ;; WIFI_BAND) BAND="$val" ;; WIFI_CHANNEL) CHANNEL="$val" ;; HOTSPOT) HOTSPOT="$val" ;;
    esac
  done < "$D/settings.txt"
fi

ARGS=(--first-boot --node-tarball "$(ls "$D"/node-*-linux-arm64.tar.xz | head -1)" --ssid "$SSID" --password "$PASSWORD" --country "$COUNTRY" --name "$NAME" --band "$BAND")
[ -n "$CHANNEL" ] && ARGS+=(--channel "$CHANNEL")
case "$HOTSPOT" in no|No|NO|off|0) ARGS+=(--no-hotspot) ;; esac

{
  echo "Nova Relay first power-up, $(date)"
  bash "$D/install-pi.sh" "${ARGS[@]}"
  rc=$?
  echo
  [ "$rc" = "0" ] && echo "Finished: Nova Relay is installed." || echo "Setup stopped (code $rc). The lines above say why."
} > "$LOG" 2>&1
cp "$LOG" "$D/setup-log.txt" 2>/dev/null || true
sync
