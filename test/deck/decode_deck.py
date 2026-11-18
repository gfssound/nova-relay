"""Nov 14: read what Nova Relay wrote to a stand-in Stream Deck (the .out file of 1024- or 8191-byte reports) and
rebuild the key pictures and touch strip as the panel would show them.

  decode_deck.py <hidrawN.out> <pid hex> <out.png> [from-byte]
Prints one line per key: how many pictures it got. Checks every report's header as it goes."""
import io, sys
from PIL import Image

out, pid, png = sys.argv[1], int(sys.argv[2], 16), sys.argv[3]
start = int(sys.argv[4]) if len(sys.argv) > 4 else 0
M = {0x80: ("v2", 5, 3, 72, (0, True, True)), 0x63: ("mini", 3, 2, 80, (90, False, True)), 0x84: ("plus", 4, 2, 120, (0, False, False)),
     0x6c: ("v2", 8, 4, 96, (0, True, True)), 0x60: ("v1", 5, 3, 72, (0, True, True))}
gen, cols, rows, px, (rot, fx, fy) = M[pid]
packet = 8191 if gen == "v1" else 1024
data = open(out, "rb").read()[start:]
assert len(data) % packet == 0, f"{len(data)} bytes isn't a whole number of {packet}-byte reports"
keys, counts, strip, cur, scur, errors = {}, {}, {}, {}, {}, []
for o in range(0, len(data), packet):
    r = data[o:o + packet]
    if r[0] != 2: errors.append(f"report at {o}: id {r[0]}"); continue
    if gen in ("v2", "plus") and r[1] == 0x07:
        key, last, n, page = r[2], r[3], r[4] | r[5] << 8, r[6] | r[7] << 8
        if page != len(cur.get(key, [])): errors.append(f"key {key}: page {page} out of order"); cur[key] = []
        cur.setdefault(key, []).append(r[8:8 + n])
        if last: keys[key] = b"".join(cur.pop(key)); counts[key] = counts.get(key, 0) + 1
    elif gen == "plus" and r[1] == 0x0C:
        x, w, h, last, page, n = r[2] | r[3] << 8, r[6] | r[7] << 8, r[8] | r[9] << 8, r[10], r[11] | r[12] << 8, r[13] | r[14] << 8
        scur.setdefault(x, []).append(r[16:16 + n])
        if last: strip[x] = (w, h, b"".join(scur.pop(x)))
    elif gen == "mini" and r[1] == 0x01:
        page, last, key = r[2], r[4], r[5] - 1
        if page != len(cur.get(key, [])): errors.append(f"key {key}: page {page} out of order"); cur[key] = []
        cur.setdefault(key, []).append(r[16:])
        if last: keys[key] = b"".join(cur.pop(key)); counts[key] = counts.get(key, 0) + 1
    elif gen == "v1" and r[1] == 0x01:
        page, last, k = r[2], r[4], r[5] - 1
        c = k % cols; key = k - c + (cols - 1 - c)
        cur.setdefault(key, []).append(r[16:])
        if last: keys[key] = b"".join(cur.pop(key)); counts[key] = counts.get(key, 0) + 1
    else: errors.append(f"report at {o}: command {r[1]:#x}")
sheet = Image.new("RGB", (cols * (px + 8) + 8, rows * (px + 8) + 8 + (110 if strip else 0)), (40, 40, 40))
for key, img in keys.items():
    if key >= cols * rows: errors.append(f"picture for key {key}"); continue
    im = Image.open(io.BytesIO(img)).convert("RGB")
    if gen in ("mini", "v1"): im = Image.open(io.BytesIO(img[:54 + ((px * 3 + 3) // 4 * 4) * px])).convert("RGB")
    # undo the panel's turn: flips first, then the rotation back
    if fy: im = im.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    if fx: im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if rot: im = im.rotate(-rot, expand=True)
    assert im.size == (px, px), (key, im.size)
    sheet.paste(im, (8 + (key % cols) * (px + 8), 8 + (key // cols) * (px + 8)))
for x, (w, h, img) in strip.items():
    sheet.paste(Image.open(io.BytesIO(img)).convert("RGB").resize((w * (cols * (px + 8)) // 800, h * (cols * (px + 8)) // 800)), (8 + x * (cols * (px + 8)) // 800, rows * (px + 8) + 8))
sheet.save(png)
print("pictures per key:", " ".join(f"{k}:{counts[k]}" for k in sorted(counts)), "| strip parts:", len(strip), "| problems:", "; ".join(errors[:5]) or "none")
