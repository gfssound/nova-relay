#!/bin/bash
# Nova Relay card image: first power-up. Run once by cloud-init (see user-data on the card's boot partition).
# Installs Nova Relay from the card with no internet, using the settings the image was built with, and leaves a
# copy of the log on the boot partition (nova-remote/setup-log.txt) so it can be read on a Mac or PC.
FW="${NOVA_FW:-/boot/firmware}"; [ -d "$FW/nova-remote" ] || FW=/boot   # NOVA_FW: tests only
LOG="${NOVA_LOG:-/var/log/nova-remote-setup.log}"
D="$FW/nova-remote"

# The box's settings, as KEY=value lines: nova-remote/settings.txt on the card's boot drive ("bootfs"). They come from
# Pi box settings.txt when the image is built, and (Nov 18, Ferris: "raspberry pi won't always be created via a mac
# ... Some users are on windows, some linux") can be changed on the card after writing it, on any computer, before
# the first power-up: everything below (Wi-Fi, the box's name, its login, its time zone) is applied from this file.
SSID="NOVA-REMOTE"; PASSWORD="novaremote"; COUNTRY="US"; NAME="nova"; BAND="5"; CHANNEL=""; HOTSPOT="yes"
LOGIN_NAME=""; LOGIN_PASSWORD=""; TIME_ZONE=""
if [ -f "$D/settings.txt" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"; case "$line" in ''|'#'*) continue ;; esac
    key="${line%%=*}"; val="${line#*=}"
    key="$(echo "$key" | tr -d '[:space:]')"; val="$(echo "$val" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
    case "$key" in
      WIFI_NAME) SSID="$val" ;; WIFI_PASSWORD) PASSWORD="$val" ;; WIFI_COUNTRY) COUNTRY="$val" ;;
      BOX_NAME) NAME="$val" ;; WIFI_BAND) BAND="$val" ;; WIFI_CHANNEL) CHANNEL="$val" ;; HOTSPOT) HOTSPOT="$val" ;;
      LOGIN_NAME) LOGIN_NAME="$val" ;; LOGIN_PASSWORD) LOGIN_PASSWORD="$val" ;; TIME_ZONE) TIME_ZONE="$val" ;;
    esac
  done < "$D/settings.txt"
fi

ARGS=(--first-boot --node-tarball "$(ls "$D"/node-*-linux-arm64.tar.xz | head -1)" --ssid "$SSID" --password "$PASSWORD" --country "$COUNTRY" --name "$NAME" --band "$BAND")
[ -n "$CHANNEL" ] && ARGS+=(--channel "$CHANNEL")
case "$HOTSPOT" in no|No|NO|off|0) ARGS+=(--no-hotspot) ;; esac

# The login (SSH) and time zone from the settings file. The image's own login (made when the card first starts, from
# the build's settings: nova-remote/built-login) is renamed or re-passworded to match, so a card whose settings were
# changed on Windows or Linux after writing it gets the login written there.
login_and_zone(){
  BUILT="$(cat "$D/built-login" 2>/dev/null | tr -d '\r\n ')"; BUILT="${BUILT:-pi}"
  if [ -n "$LOGIN_NAME" ] && ! echo "$LOGIN_NAME" | grep -Eq '^[a-z_][a-z0-9_-]{0,31}$'; then
    echo "LOGIN_NAME \"$LOGIN_NAME\" isn't usable (lower-case letters and numbers only); keeping the login $BUILT."; LOGIN_NAME=""
  fi
  if [ -n "$LOGIN_NAME" ] && [ "$LOGIN_NAME" != "$BUILT" ] && id "$BUILT" >/dev/null 2>&1 && ! id "$LOGIN_NAME" >/dev/null 2>&1; then
    usermod -l "$LOGIN_NAME" -d "/home/$LOGIN_NAME" -m "$BUILT" && groupmod -n "$LOGIN_NAME" "$BUILT" 2>/dev/null
    for f in /etc/sudoers.d/*; do [ -f "$f" ] && sed -i "s/^$BUILT /$LOGIN_NAME /" "$f"; done
    echo "Login: renamed $BUILT to $LOGIN_NAME."
  fi
  U="${LOGIN_NAME:-$BUILT}"
  if [ -n "$LOGIN_PASSWORD" ] && id "$U" >/dev/null 2>&1; then echo "$U:$LOGIN_PASSWORD" | chpasswd && echo "Login: password set for $U."; fi
  if [ -n "$TIME_ZONE" ]; then
    if [ -f "/usr/share/zoneinfo/$TIME_ZONE" ]; then timedatectl set-timezone "$TIME_ZONE" 2>/dev/null || ln -sf "/usr/share/zoneinfo/$TIME_ZONE" /etc/localtime; echo "Time zone: $TIME_ZONE."
    else echo "TIME_ZONE \"$TIME_ZONE\" isn't a time zone this Pi knows (examples: America/Chicago, Europe/London); left as it was."; fi
  fi
}

{
  echo "Nova Relay first power-up, $(date)"
  login_and_zone
  bash "$D/install-pi.sh" "${ARGS[@]}"
  rc=$?
  echo
  [ "$rc" = "0" ] && echo "Finished: Nova Relay is installed." || echo "Setup stopped (code $rc). The lines above say why."
} > "$LOG" 2>&1
cp "$LOG" "$D/setup-log.txt" 2>/dev/null || true
sync
