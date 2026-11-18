#!/bin/bash
# Nova Remote — start on Linux:  ./start-nova-remote.sh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js isn't installed. Install Node.js 18 or newer (https://nodejs.org or your package manager), then run this again."
  exit 1
fi
if [ ! -d node_modules/serialport ] && [ ! -f .install-tried ] && command -v npm >/dev/null 2>&1; then
  echo "First run: installing the serial port library…"
  npm install --omit=dev --no-audit --no-fund || echo "Couldn't install it now. Using the built-in serial tools instead."
  touch .install-tried
fi
if ! id -nG | grep -qw dialout && ! id -nG | grep -qw uucp; then
  echo "Note: to open serial ports you may need to be in the 'dialout' group:  sudo usermod -aG dialout \$USER  (then log out and back in)"
fi
exec node server.js "$@"
