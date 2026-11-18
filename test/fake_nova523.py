"""Fake Nova that behaves like firmware 5.23 about computers (Nov 14, Zaxcom's protocol notes + Ferris's captures):
it sends its full set of settings only when it takes up a NEW computer, i.e. after 3.5 s without hearing a hello;
a computer that comes back sooner only gets the stream (meters, timecode, status, changes). While hellos keep coming
it streams; 3.5 s without one and it drops the computer.

  fake_nova523.py <capture.log> <out.txt> <seconds>
  env DELAY=8   seconds a new computer waits before the Nova answers (the direct cable has taken 10-15 s)
  env MID=1     the Nova still counts a computer as connected when we start (a reconnect inside 3.5 s): the first
                hellos get the stream, with no settings
  env BOOT=10    the Nova is still starting up for its first 10 s: its port echoes whatever arrives ~45 ms later, scrambled
                (Ferris's Pi capture, Nov 15), and doesn't answer
  env ECHO=1     the line loops back everything the computer sends, exactly, and the Nova says nothing
  env FREEZE=1   with BOOT: if anything arrived while it was starting up, it freezes 0.3 s after its first answer
Settings and stream frames come from a real capture's RX lines (settings: its CMD 55 frames other than status 142-145)."""
import os, pty, re, sys, time, select, datetime
cap, out_path, dur = sys.argv[1], sys.argv[2], float(sys.argv[3])
DELAY = float(os.environ.get('DELAY', '0.3'))
MID = os.environ.get('MID') == '1'
DEMO = float(os.environ.get('DEMO', '0'))
BOOT = float(os.environ.get('BOOT', '0')); FREEZE = os.environ.get('FREEZE') == '1'; ECHO = os.environ.get('ECHO') == '1'
import random; random.seed(7)
fed = 0; echoes = []; frozen = False; answered_at = None   # >0: the Nova has the Touch option, which licenses PCnovaT clients only; others are cut off after DEMO s
kind = None; served_at = None
frames = []
for l in open(cap):
    m = re.match(r'(\S+)\s+RX ([0-9A-F ]+)$', l.rstrip())
    if m:
        t = datetime.datetime.fromisoformat(m.group(1).replace('Z', '+00:00')).timestamp()
        frames.append((t, bytes(int(x, 16) for x in m.group(2).split())))
raw = b''.join(b for t, b in frames)   # RX lines are chunks: rebuild whole frames
whole = []; i = 0
while i < len(raw) - 5:
    if raw[i] != 0xAA: i += 1; continue
    n = raw[i + 2] | (raw[i + 3] << 8)
    if i + 6 + n > len(raw): i += 1; continue            # AA SUM LEN SRC DST CMD + LEN payload bytes
    f = raw[i:i + 6 + n]
    if sum(f[2:]) & 0xFF != f[1]: i += 1; continue        # checksum: low byte of the sum from byte 2
    whole.append(f); i += 6 + n
def is_setting(b):
    return len(b) > 7 and b[5] == 0x55 and (b[6] | (b[7] << 8)) not in (142, 143, 144, 145)
seen = set(); dump = []
for b in whole:
    if is_setting(b) and (b[6] | (b[7] << 8)) not in seen: seen.add(b[6] | (b[7] << 8)); dump.append(b)
# Nov 18: the real connect burst when the capture has one: every setting from status "Loading 0%" to "Loading 100%"
# (and the 40 settings after it), sent at the line's speed (PACE bytes/s, default 3800 = 38400 baud), status texts
# included. OLDDUMP=1: one frame per setting, all at once (as before).
is_load = lambda b, t: len(b) > 7 and b[5] == 0x55 and (b[6] | (b[7] << 8)) == 145 and t in b
i0 = next((i for i, b in enumerate(whole) if is_load(b, b'Loading 0%')), None)
i1 = next((i for i, b in enumerate(whole) if is_load(b, b'Loading 100%')), None)
PACE = float(os.environ.get('PACE', '3800'))
if i0 is not None and i1 is not None and os.environ.get('OLDDUMP') != '1':
    burst = [b for b in whole[i0:i1 + 1] if b[5] == 0x55 and (b[6] | (b[7] << 8)) not in (142, 143, 144)]
    after = [b for b in whole[i1 + 1:] if is_setting(b)][:40]
    dump = burst + after
stream = [b for b in whole if not is_setting(b) and b[5] != 0x20 and b'Loading' not in b][:600]   # the loading texts come with the settings only
m, s = pty.openpty()
print(os.ttyname(s), flush=True)
out = open(out_path, 'w')
def note(txt): out.write('%.3f # %s\n' % (time.time() - start, txt)); out.flush()
buf = b''; start = time.time()
last_hello = None; pc = False; mid = MID; dump_at = None; si = 0; last_send = 0
while time.time() - start < dur:
    r, _, _ = select.select([m], [], [], 0.005)
    now = time.time()
    if r:
        try: data = os.read(m, 4096)
        except OSError: data = b''
        if ECHO and data:   # Nov 15: a line that loops back what the computer sends (the Pi on a weak supply)
            echoes.append((now + 0.045, data)); note('echoing %d bytes' % len(data)); data = b''
        if BOOT and now - start < BOOT:
            fed += len(data)
            echoes.append((now + 0.045, bytes((b | random.choice([0, 2, 4, 6, 16, 64])) ^ random.choice([0, 0, 1, 8]) for b in data)))
            note('starting up: got %d bytes (%d so far), echoing them scrambled' % (len(data), fed)); data = b''
        if frozen: data = b''
        buf += data
        while True:
            k = buf.find(b'\xaa')
            if k < 0 or len(buf) - k < 6: break
            n = buf[k + 2] | (buf[k + 3] << 8)
            if len(buf) - k < 6 + n: break
            f = buf[k:k + 6 + n]; buf = buf[k + 6 + n:]
            out.write('%.3f %s\n' % (now - start, f.hex(' ').upper())); out.flush()
            if f[5] == 0x20 and n > 1:                      # a hello with text
                txt = f[6:].split(b'\0')[0].decode('latin1', 'replace')
                if kind != txt: kind = txt; note('hello as ' + txt)
                if mid: pc = True; mid = False; note('hello from a computer it still counts as connected: stream, no settings')
                elif not pc and dump_at is None: dump_at = now + DELAY; note('new computer: settings in %.1f s' % DELAY)
                last_hello = now
    while echoes and echoes[0][0] <= now:
        os.write(m, echoes.pop(0)[1])
    if BOOT and FREEZE and fed and answered_at and not frozen and now - answered_at > 0.3:
        frozen = True; pc = False; dump_at = None; note('FROZE (it was sent %d bytes while starting up)' % fed)
    if frozen: continue
    if pc and last_hello is not None and now - last_hello > 3.5:
        pc = False; note('no hello for 3.5 s: dropped the computer')
    if dump_at is not None and last_hello is not None and now - last_hello > 3.5:
        dump_at = None; note('the new computer went quiet before the answer')
    if dump_at is not None and now >= dump_at:
        if os.environ.get('OLDDUMP') == '1' or PACE <= 0:
            for b in dump: os.write(m, b)
        else:   # at the line's speed, still listening for hellos (and anything else) meanwhile
            t_end = now + sum(len(b) for b in dump) / PACE; k = 0
            while k < len(dump):
                os.write(m, dump[k]); k += 1
                time.sleep(len(dump[k - 1]) / PACE)
                r2, _, _ = select.select([m], [], [], 0)
                if r2:
                    try: d2 = os.read(m, 4096)
                    except OSError: d2 = b''
                    buf += d2
                    while True:
                        q = buf.find(b'\xaa')
                        if q < 0 or len(buf) - q < 6: break
                        n2 = buf[q + 2] | (buf[q + 3] << 8)
                        if len(buf) - q < 6 + n2: break
                        f2 = buf[q:q + 6 + n2]; buf = buf[q + 6 + n2:]
                        out.write('%.3f %s\n' % (time.time() - start, f2.hex(' ').upper())); out.flush()
                        if f2[5] == 0x20: last_hello = time.time()
        note('SETTINGS SENT (%d)' % len(dump)); dump_at = None; pc = True; served_at = time.time()
        if answered_at is None: answered_at = time.time()
    if DEMO and pc and served_at and not (kind or '').startswith('PCnovaT') and now - served_at > DEMO:
        if pc: note('DEMO MODE HAS ENDED for ' + str(kind)); pc = False; served_at = None; dump_at = None; last_hello = None; mid = False
        DEMO_DONE = True
    if pc and now - last_send >= 0.02 and stream:
        os.write(m, stream[si % len(stream)]); si += 1; last_send = now
