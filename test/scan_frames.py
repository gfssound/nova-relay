import re,sys
from collections import Counter
def frames(path, after=''):
    raw=b''
    for l in open(path, errors='replace'):
        m=re.match(r'(\S+)\s+(RAW|RX) ([0-9A-F ]+?)(?:   \|.*)?$',l.rstrip())
        if m and m.group(1)>=after: raw+=bytes(int(x,16) for x in m.group(3).split())
    i=0
    while i<len(raw)-5:
        if raw[i]!=0xAA: i+=1; continue
        n=raw[i+2]|raw[i+3]<<8
        if n>4096 or i+6+n>len(raw): i+=1; continue
        fr=raw[i:i+6+n]
        if sum(fr[2:])&0xFF!=fr[1]: i+=1; continue
        yield fr; i+=6+n
for path in sys.argv[1:]:
    p48=Counter(); q98=Counter(); first=[]
    for fr in frames(path):
        d=fr[6:]
        if fr[5]==0x55:
            sid=d[0]|d[1]<<8
            if len(first)<6: first.append(sid)
            if sid==71: p48[d.hex(' ')]+=1
        if fr[5]==0x50 and d[0]==0x98: q98[d.hex(' ')]+=1
    print(path.split('/')[-1], '| first settings', first, '| 48V frames', p48.most_common(3), '| power reports', q98.most_common(2))
