# Nova Relay

Remote control for a Zaxcom Nova recorder from phones, iPads and computers on the cart. A small Node server talks to the
Nova (through an Aria-8 or Zaxcom's direct cable, 38400 baud 8O1) and serves a browser page to every device on the
network. It ships as a Mac app builder, a Raspberry Pi box (SD-card image builder), a Linux AppImage and a Stream Deck
plugin, each with the user manual.

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

Zaxcom, Nova, Aria and NovaTouch are Zaxcom's names. This project contains no Zaxcom code.
