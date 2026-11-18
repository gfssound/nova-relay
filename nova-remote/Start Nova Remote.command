#!/bin/bash
# Nova Remote — double-click to start on a Mac.
cd "$(dirname "$0")"
# Finder starts this with a short PATH; add the usual Node.js install locations.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js isn't installed on this Mac."
  echo "Install the LTS version from https://nodejs.org, then double-click Start Nova Remote again."
  open "https://nodejs.org"
  read -r -p "Press Return to close this window."
  exit 1
fi
# First run only: try to add the serial port library (needs internet once). Without it the
# built-in serial tools are used, so a failure here is fine.
if [ ! -d node_modules/serialport ] && [ ! -f .install-tried ] && command -v npm >/dev/null 2>&1; then
  echo "First run: installing the serial port library…"
  npm install --omit=dev --no-audit --no-fund || echo "Couldn't install it now. Using the built-in serial tools instead."
  touch .install-tried
fi
node server.js "$@"
