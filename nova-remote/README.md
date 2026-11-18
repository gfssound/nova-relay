# Nova Remote — cart app

Nova Remote runs on the cart computer (Mac, Windows or Linux). Use it on that computer, and from any
phone or iPad on the same Wi-Fi. Every device sees the same settings, meters and takes, live.

It works without internet. Connected to the Nova (through the Aria-8), it shows the Nova's real setup,
meters, timecode and takes, and sends your changes to it. With no Nova connected it runs on a simulated
recorder, so you can try things out anywhere.

## Mac app (nothing to install)

There's also a Mac app version with Node.js built in: **Nova Remote.app**, installed from a .dmg. Build the
.dmg once with **Build Mac App.command** from the Mac download (see its READ ME FIRST). Then on any Mac,
open the .dmg, drag **Nova Remote** to **Applications** and open it. It shows the same window as below; close
the window to stop it. The rest of this guide applies to the app too, except steps 1 and 2.

## 1. Install Node.js (once)

Download the **LTS** version from https://nodejs.org and install it. Node.js 18 or newer is required.

## 2. Start Nova Remote

| Computer | How to start |
|---|---|
| **Mac** | Double-click **Start Nova Remote.command**. The first time, macOS may block it: right-click it, choose **Open**, then **Open** again. |
| **Windows** | Double-click **Start Nova Remote.bat**. If Windows Firewall asks, allow access on **private networks** so phones and iPads can connect. |
| **Linux** | In a terminal in this folder: `./start-nova-remote.sh` |

A window opens with the addresses to use, and the remote opens in your browser. **Leave that window open.
Closing it stops Nova Remote.**

The first time it starts, it tries to install a serial-port library from the internet. If there's no
internet, that's fine: it uses the computer's built-in serial tools instead.

## 3. Use it on a phone or iPad

1. Put the phone or iPad on the **same Wi-Fi** as the cart computer.
2. In Safari or Chrome, open the address shown in the start window, for example `http://192.168.1.20:8080`.
   The same addresses are listed in the remote under **Setup → Cart & Recorder Link**.
3. To make it feel like an app, tap **Share → Add to Home Screen** (iPhone/iPad) or **⋮ → Add to Home screen**
   (Android). It then opens full-screen with its own icon.

## Where things are saved

- **On the cart computer, shared by every device:** settings, routing, output presets, the color bank,
  output names, bit depth and take history. The folder is `~/.nova-remote` on Mac and Linux, and `C:\Users\<you>\.nova-remote` on Windows.
- **On each device:** Help text, the meter reference line and Daylight mode, so each person can choose their own.
- **Remote-only (the Nova doesn't have them):** output names and bit depth. Set bit depth in Setup → Recording to
  match the Nova; it isn't reported over serial.

## Connecting to the Nova

Nova Remote connects by itself: when it starts, and whenever the connection drops, it looks for the Nova on
the port that worked last time and then on each USB serial port, at the right settings. Just make sure
NovaTouch is closed. To connect by hand instead:

1. Quit NovaTouch (only one program can use the port at a time).
2. Leave the Nova's RS-422 setting on **Aria/Oasis**, with the Aria-8 connected to the computer by USB as usual.
3. In the remote, open **Setup → Cart & Recorder Link**, pick the Aria's port (on a Mac, `/dev/cu.usbserial-…`)
   and click **Connect**. The defaults, 38400 baud with odd parity, are right for the Nova.
4. Within a couple of seconds the status pill at the top says **Nova**, and the remote loads the Nova's setup:
   track names, arming, routing, headphone mixes, tone, note presets, scene/take and take history.

**What comes from the Nova:** track meters (armed tracks only, with their real track numbers), OUT 1–6
meters, RX 1–8 input meters, timecode, record state and the take timer, scene/take, take history, battery and drive time left,
and every setting it reports, including changes made on the Nova's own panel.

**What is sent to the Nova:** arming, track names, input-to-track routes and output routes (pre- or post-fade; OUT 1–4 from inputs, OUT 5–6 from tracks and OUT 1–4, as on the Nova), Com 1/Com 2/Slate/Tone on outputs, input settings (Mic/Line, 48V, trim (on RX inputs this is track trim in Nomad mode or transmitter gain in ZaxNet mode; RX trim is still being tested), HPF, notch filters,
delay and compressor on/off), headphone routing, which headphone preset is active and which presets are on,
tone on/off and level, note presets, and the next scene, take and note.
**REC** and **STOP** send the same button messages the Aria-8 sends, and the remote checks that the Nova
really started or stopped. Pressing REC while recording starts a new take, as on the Aria.
Every message sent is shown in the **Link log** with its bytes. Ones whose format was worked out from the
Nova's own messages rather than seen from NovaTouch are marked "format inferred".

**Nova 1 or Nova 2:** the remote reads the model from the Nova's greeting and remembers it. On a Nova 1
(AES 1–4 only) AES 5–8 are hidden from the input list and routing screens.

**Input pages follow the Nova:** opening an input's page on the Nova or with an Aria input button opens that
input on the remote, and closing it there closes it here. Opening or closing an input on the remote does the
same on the Nova, by pressing that input's Aria button for you. The remote learns which button opens which
input the first time you press it on the Aria (saved on the cart computer).

**Not yet:**
- The newer firmware option that feeds a single track to OUT 1–4 isn't reported over the link; set that on the Nova.
- Headphone solo, delay times, notch Q and the compressor's attack/threshold/ratio settings change on the remote
  only, and the Link log says so, until their formats are confirmed.
- Input meters: only the wireless inputs (RX 1–8) have them so far; the Nova doesn't send levels for the others.
- Colors are the remote's own; the Nova doesn't have them.

**Reload from Nova** (in Setup) fetches the Nova's whole setup again. Every session's raw serial traffic is
also saved to a `serial-capture-….log` file in the folder above, for troubleshooting.

## Troubleshooting

- **A phone or iPad can't connect.** Check it's on the same Wi-Fi, not mobile data. Some hotspots and guest
  networks stop devices from seeing each other; use a normal router or the computer's own hotspot. On
  Windows, allow Nova Remote through the firewall on private networks.
- **"Port 8080 is already in use".** Nova Remote is probably already running. Or start it on another port:
  `node server.js --port 8090`.
- **Linux: can't open the serial port.** Add yourself to the `dialout` group with
  `sudo usermod -aG dialout $USER`, then log out and back in.
- **Start options:** `--port 8090` changes the port, `--no-open` doesn't open a browser, `--no-auto` turns off
  connecting to the Nova automatically, and
  `--data /some/folder` saves settings somewhere else.
