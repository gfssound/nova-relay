# Nova Relay

Remote control for a Zaxcom Nova recorder from phones, iPads and computers on the cart. A small Node server talks to the
Nova (through an Aria-8 or Zaxcom's direct cable, 38400 baud 8O1) and serves a browser page to every device on the
network. It ships as a Mac app builder, a Raspberry Pi box (SD-card image builder), a Linux AppImage and a Stream Deck
plugin, each with the user manual.

**User manual:** [Nova Relay User Manual.pdf](nova-remote/Nova%20Relay%20User%20Manual.pdf) (pictures of every page, a contents page that jumps to each section). The same file opens from Setup › Help & Troubleshooting in the app.

## Layout

| Folder | What's in it |
| --- | --- |
| `nova-remote/` | The app: `server.js` (link to the Nova, shared setup, WebSocket, HTTP API), `nova.js` (frames and settings), `deck/` (Stream Deck plugged into the Pi), `public/` (the page, icons, manual) |
| `build/cart-remote.html` | The page as a self-running prototype (simulated recorder). UI changes start here |
| `tools/` | `make_local.py` turns the prototype into `nova-remote/public/index.html`; `package.sh` makes every package; Stream Deck, AppImage and Windows builders |
| `pibuild/` | Pi box: card image builder, first-boot setup, `install-pi.sh`, box guide |
| `macbuild/`, `linuxbuild/`, `winbuild/` | Mac app builder and the other desktop installers |
| `streamdeck/` | Stream Deck plugin source |
| `test/` | Playwright and fake-Nova tests (`fake_nova523.py` behaves like firmware 5.23 and replays a capture) |
| `cap/` | Serial captures from the cart, replayed by the tests |

## Working on it

```sh
python3 tools/make_local.py build/cart-remote.html nova-remote/public/index.html   # after changing the prototype
node nova-remote/server.js --port 8080                                              # run it (auto-connects to the Nova)
node test/read_first.js                                                             # tests need Node, Python 3 and Playwright
bash tools/package.sh                                                               # packages into out/
```

Safety rules the code keeps: nothing but hellos goes to the Nova until its settings have been read; only the
NovaTouch-type hello the user chose is sent; the transmitter erase/reprogram commands are never built.

## Known issues

**Take history and sound report miss files in 0.6.9 and earlier. Fixed in 0.6.10.**

When a take runs past the Nova's file-size limit (about 41 minutes that night), the Nova carries on in a new file named
with a letter (take 1 → 1a). The Nova never sends a take-list row or a REC report for that file. So versions up to 0.6.9:

- leave the split files (1a, 2a…) out of the take history and the sound report;
- can show a leftover row from an earlier take list when the Nova starts its list over (for example "1/2, 0:15" in
  place of 1a);
- give the take before the split no length;
- list Start TC as the moment REC was pressed, not the file's own start (the file starts earlier by the pre-roll).

Checked by replaying a real night with three split files through 0.6.5, 0.6.9 and 0.6.10. 0.6.5 and
0.6.9 lost the same files; 0.6.10 lists all eight with the right take names, notes, starts and lengths. Update from
Setup › Updates, or download 0.6.10 from Releases. Until then, check the sound report against the Nova's own take list.
If your take history is missing files that are *not* split files, please open an issue with a serial capture
(Setup › Connection › Link log › Download capture).

Zaxcom, Nova, Aria and NovaTouch are Zaxcom's names. This project contains no Zaxcom code.
