"""Fake Nova on a pseudo-terminal: replays a real Nova Tap capture (the Nova's side) once the cart says hello,
and records every message the cart sends."""
import os, pty, re, sys, time, select, datetime
log_path, out_path, dur = sys.argv[1], sys.argv[2], float(sys.argv[3])
speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
rx = []  # (t, bytes) from the capture, Nova -> PC
t0 = None; first_tx = None
for l in open(log_path):
    m = re.match(r'(\S+)\s+(TX|RX) ([0-9A-F ]+)$', l.rstrip())
    if not m: continue
    t = datetime.datetime.fromisoformat(m.group(1).replace('Z', '+00:00')).timestamp()
    if m.group(2) == 'TX' and first_tx is None: first_tx = t
    if m.group(2) == 'RX' and first_tx is not None: rx.append((t - first_tx, bytes(int(x, 16) for x in m.group(3).split())))
m, s = pty.openpty()
print(os.ttyname(s), flush=True)
out = open(out_path, 'w')
buf = b''; hello_at = None; i = 0; start = time.time()
while time.time() - start < dur:
    r, _, _ = select.select([m], [], [], 0.005)
    if r:
        data = os.read(m, 4096); buf += data
        while True:
            k = buf.find(b'\xaa')
            if k < 0 or len(buf) - k < 6: break
            n = buf[k+2] | (buf[k+3] << 8)
            if len(buf) - k < 6 + n: break
            f = buf[k:k+6+n]; buf = buf[k+6+n:]
            out.write('%.3f %s\n' % (time.time() - start, f.hex(' ').upper())); out.flush()
            # ECHO_TRIM="17:7,19:19": answer trim writes (SET 76, size 22) on another input, like the Nova does
            if os.environ.get('ECHO_TRIM') and f[5] == 0x55 and f[6] == 76 and f[9] == 1:
                mp = dict(tuple(int(x) for x in kv.split(':')) for kv in os.environ['ECHO_TRIM'].split(','))  # dims byte f[10] may be 22 or 32
                n = f[12]
                if n in mp:
                    d = bytes([76, 0, 1, 1, 22, 1, mp[n]]) + f[13:]
                    body = bytes([len(d) & 0xFF, len(d) >> 8, 0, 0x55]) + d
                    os.write(m, bytes([0xAA, sum(body) & 0xFF]) + body)
            if f[5] == 0x20 and hello_at is None and os.environ.get('REQUIRE', '').encode() in f: hello_at = time.time()
    if hello_at is not None:
        el = time.time() - hello_at
        if el > 5: el = 5 + (el - 5) * speed
        while i < len(rx) and rx[i][0] <= el:
            os.write(m, rx[i][1]); i += 1
out.close()
