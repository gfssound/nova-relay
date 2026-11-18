import sys, os, json
sys.path.insert(0, '/home/claude/ref/python-elgato-streamdeck/src')
from StreamDeck.Devices.StreamDeckOriginal import StreamDeckOriginal
from StreamDeck.Devices.StreamDeckMini import StreamDeckMini
from StreamDeck.Devices.StreamDeckOriginalV2 import StreamDeckOriginalV2
from StreamDeck.Devices.StreamDeckPlus import StreamDeckPlus
class Dev:
    def __init__(s, pid): s.w=[]; s.f=[]; s.pid=pid
    def write(s,b): s.w.append(bytes(b))
    def write_feature(s,b): s.f.append(bytes(b))
    def product_id(s): return s.pid
    def vendor_id(s): return 0x0fd9
    def __getattr__(s, n): return lambda *a, **k: None
img = bytes(range(256)) * 25 + b'\x01\x02\x03'   # 6403 bytes, odd length
out = {}
for name, cls, pid in [('v1', StreamDeckOriginal, 0x60), ('mini', StreamDeckMini, 0x63), ('v2', StreamDeckOriginalV2, 0x80), ('plus', StreamDeckPlus, 0x84)]:
    d = Dev(pid); deck = cls.__new__(cls); deck.device = d
    deck.set_key_image(3, img if name != 'v1' else img[:-1]); deck.set_brightness(55)
    rec = {'key': [w.hex() for w in d.w], 'feat': [f.hex() for f in d.f]}
    if name == 'plus':
        d.w = []; deck.set_touchscreen_image(img, 200, 0, 200, 100); rec['strip'] = [w.hex() for w in d.w]
    out[name] = rec
json.dump(out, open(sys.argv[1], 'w'))
