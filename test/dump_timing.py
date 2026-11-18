import re, sys, datetime
for path in sys.argv[1:]:
    chunks = []
    for l in open(path, errors='replace'):
        m = re.match(r'(\S+)\s+(RX|TX|RAW) ([0-9A-F ]+?)(?:   \|.*)?$', l.rstrip())
        if m and m.group(2) in ('RX', 'RAW'):
            t = datetime.datetime.fromisoformat(m.group(1).replace('Z', '+00:00')).timestamp()
            chunks.append((t, bytes(int(x, 16) for x in m.group(3).split())))
    if not chunks: print(path, 'no RX'); continue
    buf = b''; tt = []; frames = []
    for t, b in chunks:
        buf += b; tt += [t] * len(b)
    i = 0
    while i < len(buf) - 5:
        if buf[i] != 0xAA: i += 1; continue
        n = buf[i+2] | buf[i+3] << 8
        if i + 6 + n > len(buf): break
        f = buf[i:i+6+n]
        if sum(f[2:]) & 0xFF != f[1]: i += 1; continue
        frames.append((tt[i+5+n], f)); i += 6 + n
    t0 = frames[0][0]; seen = {}; nset = 0; total_bytes = 0
    for t, f in frames:
        if f[5] == 0x55:
            sid = f[6] | f[7] << 8
            if 142 <= sid <= 145: continue
            nset += 1
            if sid not in seen: seen[sid] = t - t0
    ids = sorted(seen.values())
    def at(n): return f"{ids[n-1]:.1f}s" if len(ids) >= n else "never"
    first = min(seen.values()) if seen else None
    print(f"{path.split('/')[-1]}: first frame from the Nova at 0 s; first setting {first:.1f}s; 10 IDs {at(10)}, 30 IDs {at(30)}, all {len(ids)} IDs {at(len(ids))}; {nset} setting frames over {ids[-1] if ids else 0:.1f}s")
