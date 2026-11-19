#!/bin/bash
# Nova Relay: build "Nova Relay.app" and a .dmg installer on a Mac.
#
# Run this once on any Mac with internet (double-click it; the first time, right-click → Open → Open).
# It downloads the official Node.js from nodejs.org for both Apple Silicon and Intel, checks the downloads
# against nodejs.org's published checksums, puts Node.js inside the app, and makes a .dmg next to this file.
# The finished app needs nothing else installed and no internet.
set -euo pipefail

NODE_VERSION="v22.11.0"            # Node.js LTS. Change here to update.
BUNDLE_ID="com.gfssound.novaremote"

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/app"
VERSION="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$SRC/package.json" | head -1)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/nova-remote-build.XXXXXX")"
APP="$WORK/dmg/Nova Relay.app"
DMG="$HERE/Nova-Relay-$VERSION.dmg"

# Nov 18: NOVA_NO_PAUSE=1 (GitHub's Mac build machine, .github/workflows/mac-app.yml) runs it unattended.
pause(){ [ -t 0 ] && [ -z "${NOVA_NO_PAUSE:-}" ] && { read -r -p "Press Return to close this window." || true; }; return 0; }
fail(){ echo; echo "Build stopped: $*"; echo; pause; exit 1; }
trap 'fail "an unexpected error on line $LINENO."' ERR

{ [ -t 1 ] && [ -z "${NOVA_NO_PAUSE:-}" ] && clear; } || true
echo "Building Nova Relay $VERSION for Mac (Node.js $NODE_VERSION inside)"
echo
[ "$(uname -s)" = "Darwin" ] || fail "this has to run on a Mac."
[ -f "$SRC/server.js" ] || fail "the 'app' folder is missing. Unzip the whole download and run this from inside it."
for t in curl shasum tar sips iconutil hdiutil osacompile codesign plutil; do command -v "$t" >/dev/null || fail "macOS tool '$t' wasn't found."; done

# 1. Node.js for both kinds of Mac, checked against nodejs.org's checksums
echo "1/5  Downloading Node.js…"
BASE="https://nodejs.org/dist/$NODE_VERSION"
curl -fsSL "$BASE/SHASUMS256.txt" -o "$WORK/SHASUMS256.txt" || fail "couldn't reach nodejs.org. Check the internet connection."
for arch in arm64 x64; do
  f="node-$NODE_VERSION-darwin-$arch.tar.gz"
  curl -fL --progress-bar "$BASE/$f" -o "$WORK/$f" || fail "couldn't download $f."
  want="$(grep " $f\$" "$WORK/SHASUMS256.txt" | cut -d' ' -f1 || true)"
  got="$(shasum -a 256 "$WORK/$f" | cut -d' ' -f1)"
  [ -n "$want" ] && [ "$want" = "$got" ] || fail "$f didn't match nodejs.org's checksum, so it wasn't used."
  mkdir -p "$WORK/node-$arch"
  tar -xzf "$WORK/$f" -C "$WORK/node-$arch" --strip-components 1
done

# 2. The app bundle: its own window (no browser, no Terminal), made with macOS's own osacompile.
#    Nov 11 (Ferris): "full stand alone app for the mac without web browser".
echo "2/5  Putting the app together…"
mkdir -p "$WORK/dmg"
cat > "$WORK/window.js" <<'JXA'
// Nova Relay for Mac: the app's own window (Nov 11, 2026).
// Build Mac App.command turns this into a stay-open app with macOS's own osacompile (JavaScript for Automation),
// so building needs nothing beyond macOS. When opened it starts the Nova Relay server hidden (no Terminal window),
// shows the remote in its own window (no browser bars), and the server stops by itself within 2 s of the app
// quitting (server.js --exit-with). Phones, iPads and the Stream Deck still connect over the network as before.
ObjC.import('Cocoa');
ObjC.import('WebKit');

var PORT = 8080;
var BASE = 'http://127.0.0.1:' + PORT + '/';
var CMD = 1 << 20, SHIFT = 1 << 17, OPT = 1 << 19, CTRL = 1 << 18;
var app = Application.currentApplication();
app.includeStandardAdditions = true;
var NSApp = $.NSApplication.sharedApplication;
var RES = $.NSBundle.mainBundle.resourcePath.js;
var DATA = $.NSHomeDirectory().js + '/.nova-remote';
var LOG = DATA + '/app.log';
var win = null, web = null, conf = null, handler = null, mainMenu = null, step = 'starting';

function q(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
function sh(cmd) { try { return app.doShellScript(cmd); } catch (e) { return null; } }
function log(t) { sh('mkdir -p ' + q(DATA) + '; echo "$(date "+%H:%M:%S")  [app] "' + q(t) + ' >> ' + q(LOG)); }
function serverUp() { return sh('curl -s -m 1 -o /dev/null -w "%{http_code}" ' + q(BASE)) === '200'; }

function startServer() {
  var pid = $.NSProcessInfo.processInfo.processIdentifier;
  sh('mkdir -p ' + q(DATA) + '; L=' + q(LOG) + '; ' +
     'if [ -f "$L" ] && [ "$(stat -f%z "$L")" -gt 5000000 ]; then mv -f "$L" "$L.old"; fi; ' +
     'if [ "$(uname -m)" = arm64 ]; then N=' + q(RES + '/node/arm64/node') + '; else N=' + q(RES + '/node/x64/node') + '; fi; ' +
     'cd ' + q(RES + '/app') + ' || exit 1; { echo; echo "== Nova Relay app opened $(date)"; } >> "$L"; ' +
     // only the server itself goes to the background, with every output closed, so this returns at once
     'nohup "$N" server.js --no-open --port ' + PORT + ' --exit-with ' + pid + ' >> "$L" 2>&1 < /dev/null &');
}

// Shown while the server starts; it switches to the remote as soon as the server answers.
var START_PAGE = '<!doctype html><html><head><meta charset="utf-8"><style>' +
  'html,body{margin:0;height:100%;background:#0e1013;color:#e9ecef;font:600 17px -apple-system,system-ui,sans-serif}' +
  'body{display:grid;place-items:center;text-align:center}p{color:#8a939c;font-weight:400;max-width:520px;line-height:1.45}' +
  'button{font:600 14px -apple-system,system-ui,sans-serif;padding:9px 16px;margin:4px;border-radius:9px;border:1px solid #2a2f35;background:#1b1f24;color:#e9ecef}' +
  '#err{display:none}</style></head><body><div><div id="wait">Starting Nova Relay…</div>' +
  '<div id="err"><div>Nova Relay didn’t start.</div><p>Another program may be using port ' + PORT + ', or something else went wrong. The log says why.</p>' +
  '<button onclick="post({showLog:1})">Show the log</button><button onclick="post({retry:1})">Try again</button></div></div>' +
  '<script>function post(m){window.webkit.messageHandlers.nova.postMessage(m)}var n=0;' +
  '(function poll(){fetch("/",{cache:"no-store"}).then(function(r){if(r.ok)location.replace("/");else throw 0}).catch(function(){' +
  'if(++n>75){document.getElementById("wait").style.display="none";document.getElementById("err").style.display="block"}else setTimeout(poll,200)})})();' +
  '</script></body></html>';

// Runs in every page of the remote: downloads go to the Downloads folder, outside links open in the web browser.
var PAGE_SCRIPT = '(function(){var h=window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.nova;if(!h)return;' +
  'var post=function(m){h.postMessage(m)},abs=function(u){try{return new URL(u,location.href).href}catch(e){return String(u)}};' +
  'document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;' +
  'var href=abs(a.getAttribute("href")),name=a.getAttribute("download");' +
  'if(name!=null){e.preventDefault();if(/^(blob|data):/.test(href)){fetch(href).then(function(r){return r.text()}).then(function(t){post({save:name||"Nova Relay file.txt",text:t})})}else post({download:href,name:name});return}' +
  'var u;try{u=new URL(href)}catch(x){return}if(a.target==="_blank"||u.origin!==location.origin){e.preventDefault();post({open:href})}},true);' +
  'window.open=function(u){if(u)post({open:abs(u)});return null};})();';

function showStart() { web.loadHTMLStringBaseURL(START_PAGE, $.NSURL.URLWithString(BASE)); }
function toast(t) { try { web.evaluateJavaScriptCompletionHandler('window.toast&&toast(' + JSON.stringify(t) + ')', null); } catch (e) { } }
function openUrl(u) { $.NSWorkspace.sharedWorkspace.openURL($.NSURL.URLWithString(u)); }

// A free name in Downloads: "Name.csv", then "Name 2.csv", "Name 3.csv"…
var FREE_NAME = 'D="$HOME/Downloads"; mkdir -p "$D"; b="${F%.*}"; e="${F##*.}"; [ "$b" = "$F" ] && e=""; o="$D/$F"; i=2; ' +
  'while [ -e "$o" ]; do if [ -n "$e" ]; then o="$D/$b $i.$e"; else o="$D/$F $i"; fi; i=$((i+1)); done; ';
function cleanName(n) { return String(n || '').replace(/[\/:\u0000-\u001f]/g, '-').replace(/^\.+/, '').slice(0, 120); }

function download(url, name) {
  var out = sh('T=$(mktemp -d) && cd "$T" && f=$(curl -sf -OJ -w "%{filename_effective}" ' + q(url) + ') && ' +
    'F=' + q(cleanName(name)) + '; [ -n "$F" ] || F="$f"; ' + FREE_NAME + 'mv "$T/$f" "$o" && rmdir "$T" && echo "$o"');
  if (!out) { toast('That file couldn’t be downloaded'); return; }
  sh('open -R ' + q(out));
  toast('Saved to Downloads: ' + out.split('/').pop());
}
function saveText(name, text) {
  var out = sh('F=' + q(cleanName(name) || 'Nova Relay file.txt') + '; ' + FREE_NAME + 'echo "$o"');
  if (!out || !$(text).writeToFileAtomicallyEncodingError(out, true, 4 /* UTF-8 */, null)) { toast('That file couldn’t be saved'); return; }
  sh('open -R ' + q(out));
  toast('Saved to Downloads: ' + out.split('/').pop());
}

function onPageMessage(m) {
  if (!m) return;
  if (m.download) download(m.download, m.name);
  else if (m.save != null) saveText(m.save, m.text || '');
  else if (m.open) openUrl(m.open);
  else if (m.showLog) sh('open -R ' + q(LOG));
  else if (m.retry) { if (!serverUp()) startServer(); showStart(); }
}

function setZoom(z) {
  z = Math.max(0.5, Math.min(2, Math.round(z * 10) / 10));
  try { web.setPageZoom(z); } catch (e) { }
  $.NSUserDefaults.standardUserDefaults.setDoubleForKey(z, 'pageZoom');
}
function zoomNow() { try { var z = +web.pageZoom; return z > 0 ? z : 1; } catch (e) { return 1; } }

function makeHandler() {
  var v1 = { types: ['void', ['id']] };
  function act(f) { return { types: v1.types, implementation: function (sender) { try { f(); } catch (e) { log('menu: ' + e); } } }; }
  ObjC.registerSubclass({
    name: 'NovaRemoteHandler',
    superclass: 'NSObject',
    // No protocols listed: JXA can't see WebKit's ("protocol does not exist", Nov 11). WebKit and the window just
    // call these methods by name, so they aren't needed.
    methods: {
      'userContentController:didReceiveScriptMessage:': { types: ['void', ['id', 'id']], implementation: function (ucc, msg) {
        try { onPageMessage(ObjC.deepUnwrap(msg.body)); } catch (e) { log('page message: ' + e); } } },
      'windowWillClose:': { types: ['void', ['id']], implementation: function (n) { NSApp.terminate(null); } },
      'nrOpenInBrowser:': act(function () { openUrl(BASE); }),
      'nrReload:': act(function () { if (serverUp()) web.reload; else { startServer(); showStart(); } }),
      'nrZoomIn:': act(function () { setZoom(zoomNow() + 0.1); }),
      'nrZoomOut:': act(function () { setZoom(zoomNow() - 0.1); }),
      'nrZoomReset:': act(function () { setZoom(1); }),
      'nrShowData:': act(function () { sh('mkdir -p ' + q(DATA) + '; open ' + q(DATA)); }),
      'nrManual:': act(function () { sh('open ' + q(RES + '/app/public/manual.pdf')); })
    }
  });
  return $.NovaRemoteHandler.alloc.init;
}

function item(title, action, key, mods, target) {
  var it = $.NSMenuItem.alloc.initWithTitleActionKeyEquivalent(title, action, key || '');
  if (mods != null) it.setKeyEquivalentModifierMask(mods);
  if (target) it.setTarget(target);
  return it;
}
function addMenu(title, items) {
  var m = $.NSMenu.alloc.initWithTitle(title);
  items.forEach(function (i) { m.addItem(i || $.NSMenuItem.separatorItem); });
  var top = $.NSMenuItem.alloc.init;
  top.setTitle(title);
  top.setSubmenu(m);
  mainMenu.addItem(top);
  return m;
}
function makeMenus() {
  mainMenu = $.NSMenu.alloc.initWithTitle('Main');
  addMenu('Nova Relay', [
    item('About Nova Relay', 'orderFrontStandardAboutPanel:', ''), null,
    item('Open in Web Browser', 'nrOpenInBrowser:', 'b', CMD | SHIFT, handler),
    item('Show Nova Relay Folder', 'nrShowData:', '', null, handler), null,
    item('Hide Nova Relay', 'hide:', 'h'),
    item('Hide Others', 'hideOtherApplications:', 'h', CMD | OPT),
    item('Show All', 'unhideAllApplications:', ''), null,
    item('Quit Nova Relay', 'terminate:', 'q')]);
  addMenu('Edit', [
    item('Undo', 'undo:', 'z'), item('Redo', 'redo:', 'z', CMD | SHIFT), null,
    item('Cut', 'cut:', 'x'), item('Copy', 'copy:', 'c'), item('Paste', 'paste:', 'v'), item('Select All', 'selectAll:', 'a')]);
  addMenu('View', [
    item('Reload', 'nrReload:', 'r', null, handler), null,
    item('Actual Size', 'nrZoomReset:', '0', null, handler),
    item('Zoom In', 'nrZoomIn:', '=', null, handler),
    item('Zoom Out', 'nrZoomOut:', '-', null, handler), null,
    item('Enter Full Screen', 'toggleFullScreen:', 'f', CMD | CTRL)]);
  var w = addMenu('Window', [item('Minimize', 'performMiniaturize:', 'm'), item('Zoom', 'performZoom:', '')]);
  addMenu('Help', [item('Nova Relay Manual', 'nrManual:', '?', null, handler)]);
  NSApp.setMainMenu(mainMenu);
  NSApp.setWindowsMenu(w);
}

function makeWindow() {
  step = 'web settings';
  conf = $.WKWebViewConfiguration.alloc.init;
  var ucc = conf.userContentController;
  ucc.addScriptMessageHandlerName(handler, 'nova');
  ucc.addUserScript($.WKUserScript.alloc.initWithSourceInjectionTimeForMainFrameOnly(PAGE_SCRIPT, 0 /* at document start */, true));
  try { conf.setApplicationNameForUserAgent('NovaRemoteMac'); } catch (e) { }
  try { conf.preferences.setValueForKey(true, 'developerExtrasEnabled'); } catch (e) { }

  step = 'window';
  var vf = $.NSScreen.mainScreen.visibleFrame;
  var w = Math.min(1280, vf.size.width), h = Math.min(800, vf.size.height);
  win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer($.NSMakeRect(0, 0, w, h), 15, 2, false);
  win.setReleasedWhenClosed(false);
  win.setTitle('Nova Relay');
  win.setContentMinSize($.NSMakeSize(640, 400));
  win.setCollectionBehavior(1 << 7);  // full screen allowed
  try { win.setAppearance($.NSAppearance.appearanceNamed('NSAppearanceNameDarkAqua')); } catch (e) { }
  win.setBackgroundColor($.NSColor.colorWithSRGBRedGreenBlueAlpha(0.055, 0.063, 0.075, 1));
  win.center;
  win.setFrameAutosaveName('NovaRemoteWindow');  // remembers size and place

  step = 'web view';
  web = $.WKWebView.alloc.initWithFrameConfiguration($.NSMakeRect(0, 0, w, h), conf);
  try { web.setValueForKey(false, 'drawsBackground'); } catch (e) { }
  win.setContentView(web);
  win.setDelegate(handler);
  var z = $.NSUserDefaults.standardUserDefaults.doubleForKey('pageZoom');
  if (z > 0 && z !== 1) setZoom(z);

  step = 'loading';
  if (serverUp()) web.loadRequest($.NSURLRequest.requestWithURL($.NSURL.URLWithString(BASE)));
  else showStart();
  win.makeKeyAndOrderFront(null);
  NSApp.activateIgnoringOtherApps(true);
}

function run() {
  var bundle = $.NSBundle.mainBundle.bundlePath.js;
  // Opened straight from the .dmg or Downloads (macOS runs it from a temporary read-only copy): ask to move it first.
  if (/\/AppTranslocation\/|^\/Volumes\//.test(bundle)) {
    NSApp.activateIgnoringOtherApps(true);
    app.displayAlert('Move Nova Relay to Applications first', { message: 'Drag Nova Relay into the Applications folder, then open it from there.' });
    NSApp.terminate(null);
    return;
  }
  sh('xattr -dr com.apple.quarantine ' + q(bundle) + ' 2>/dev/null');
  if (!serverUp()) startServer();
  try {
    step = 'handler'; handler = makeHandler();
    step = 'menus'; makeMenus();
    makeWindow();
    log('window open');
  } catch (e) {
    // Its own window couldn't open on this Mac: fall back to the web browser, as before.
    log('window failed at ' + step + ': ' + e);
    sh('for i in $(seq 1 75); do curl -s -m 1 -o /dev/null ' + q(BASE) + ' && break; sleep 0.2; done');
    openUrl(BASE);
    NSApp.activateIgnoringOtherApps(true);
    app.displayAlert('Nova Relay opened in your web browser', { message: 'Its own window couldn’t open on this Mac (' + step + ': ' + e + '). Nova Relay keeps running until you quit it from the Dock.' });
  }
}

function reopen() { if (win) win.makeKeyAndOrderFront(null); }
JXA
osacompile -l JavaScript -s -o "$APP" "$WORK/window.js" || fail "macOS couldn't make the app's window (osacompile)."
RES="$APP/Contents/Resources"
mkdir -p "$RES/node/arm64" "$RES/node/x64" "$RES/app"
cp "$WORK/node-arm64/bin/node" "$RES/node/arm64/node"
cp "$WORK/node-x64/bin/node" "$RES/node/x64/node"
# Nov 18 (Ferris's app.log: "Cannot find module './deck/manager.js'"): copy the whole app folder, not a list of
# files: the list missed deck/ (0.6.3), so Macs built from 0.6.3 to 0.6.5 couldn't start. Then check that every
# file the server loads is there, so a missing one stops the build instead of the app.
cp -R "$SRC/." "$RES/app/"
for f in $(grep -ho 'require("\./[^"]*")' "$RES/app/"*.js "$RES/app/deck/"*.js 2>/dev/null | sed 's/require("\.\/\([^"]*\)")/\1/' | sort -u); do
  case "$f" in *.js|*.json) ;; *) f="$f.js" ;; esac
  [ -f "$RES/app/$f" ] || [ -f "$RES/app/deck/$f" ] || fail "the app folder is missing $f. Unzip the whole download again."
done

# Optional serial library (works without it, using the Mac's own serial tools).
HOSTARCH="$( [ "$(uname -m)" = "arm64" ] && echo arm64 || echo x64 )"
echo "     Adding the serial port library (optional)…"
if (cd "$RES/app" && PATH="$WORK/node-$HOSTARCH/bin:$PATH" npm install --omit=dev --no-audit --no-fund --loglevel=error >/dev/null 2>&1); then
  echo "     Serial port library added."
else
  rm -rf "$RES/app/node_modules" "$RES/app/package-lock.json"
  echo "     Not added. The app will use the Mac's built-in serial tools (that's fine)."
fi
rm -f "$RES/app/package-lock.json"

PL="$APP/Contents/Info.plist"
plutil -replace CFBundleName -string "Nova Relay" "$PL"
plutil -replace CFBundleDisplayName -string "Nova Relay" "$PL"
plutil -replace CFBundleIdentifier -string "$BUNDLE_ID" "$PL"
plutil -replace CFBundleVersion -string "$VERSION" "$PL"
plutil -replace CFBundleShortVersionString -string "$VERSION" "$PL"
plutil -replace CFBundleIconFile -string applet "$PL"
plutil -replace LSMinimumSystemVersion -string 11.0 "$PL"
plutil -replace NSHighResolutionCapable -bool YES "$PL"
plutil -replace OSAAppletShowStartupScreen -bool NO "$PL"
plutil -remove CFBundleIconName "$PL" >/dev/null 2>&1 || true
plutil -replace NSAppTransportSecurity -xml '<dict><key>NSAllowsLocalNetworking</key><true/><key>NSAllowsArbitraryLoads</key><true/></dict>' "$PL"
plutil -lint "$PL" >/dev/null || fail "the app's Info.plist didn't come out right."

# For troubleshooting only: the server in a Terminal window, as before 0.4.23.
cat > "$RES/Nova Relay.command" <<'RUN'
#!/bin/bash
RES="$(cd "$(dirname "$0")" && pwd)"
if [ "$(uname -m)" = "arm64" ]; then NODE="$RES/node/arm64/node"; else NODE="$RES/node/x64/node"; fi
printf '\033]0;Nova Relay\007'
clear
cd "$RES/app"
"$NODE" server.js "$@"
echo
read -r -p "Nova Relay has stopped. Press Return to close this window." || true
RUN
chmod +x "$RES/Nova Relay.command" "$RES/node/arm64/node" "$RES/node/x64/node"

# 3. Icon from the remote's own icon
echo "3/5  Making the icon…"
ICONSET="$WORK/AppIcon.iconset"; mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  sips -z $s $s "$SRC/public/icon-512.png" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  d=$((s * 2)); sips -z $d $d "$SRC/public/icon-512.png" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$RES/applet.icns" || echo "     (icon skipped)"
rm -f "$RES/Assets.car"

# 4. Local signature, so macOS treats the bundle as one app (not an Apple Developer signature)
echo "4/5  Signing locally…"
codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || codesign --force --sign - "$APP" >/dev/null 2>&1 || fail "macOS couldn't sign the app locally (codesign)."
codesign --verify "$APP" >/dev/null 2>&1 || echo "     (the local signature didn't fully check out; if the app won't open, right-click it and choose Open)"

# 5. The .dmg: the app plus a shortcut to Applications to drag it onto
echo "5/5  Making the .dmg…"
ln -s /Applications "$WORK/dmg/Applications"
rm -f "$DMG"
hdiutil create -volname "Nova Relay $VERSION" -srcfolder "$WORK/dmg" -ov -format UDZO "$DMG" >/dev/null || fail "hdiutil couldn't make the .dmg."
rm -rf "$WORK"
trap - ERR

echo
echo "Done:  $(basename "$DMG")  (next to this file)"
echo
echo "To install: open the .dmg and drag Nova Relay onto Applications."
echo "Nova Relay opens in its own window; quitting it (⌘Q or closing the window) stops it."
echo "Copy the .dmg to the cart Mac to install it there; no internet needed."
[ -z "${NOVA_NO_PAUSE:-}" ] && { open -R "$DMG" || true; }
pause
