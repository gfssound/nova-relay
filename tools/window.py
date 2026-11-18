import re,bisect,sys,json
fn,t0,t1=sys.argv[1],sys.argv[2],sys.argv[3]
html=open('build/cart-remote.html').read(); S={s['id']:s['k'] for s in json.loads(re.search(r'const SCHEMA = (\[.*?\]);\n',html).group(1))}
b=bytearray(); pos=[]; ts=[]
for line in open(fn,errors='ignore'):
    if ' NOTE ' in line and t0<=line[11:23]<=t1: print('   ', line.strip()[11:150])
    m=re.match(r'(\S+)\s+(RX|RAW)\s+((?:[0-9A-F]{2} ?)+)',line)
    if m: pos.append(len(b)); ts.append(m.group(1)[11:23]); b+=bytes.fromhex(m.group(3).replace(' ',''))
i=0
while i+6<=len(b):
    if b[i]!=0xAA: i+=1; continue
    L=b[i+2]|(b[i+3]<<8); end=i+6+L
    if end>len(b) or L>4000 or (sum(b[i+2:end])&0xFF)!=b[i+1]: i+=1; continue
    c=b[i+5]; d=bytes(b[i+6:end]); t=ts[bisect.bisect_right(pos,i)-1]
    if t0<=t<=t1 and c not in (0x10,0x11,0x12,0x16,0x18,0x20):
        if c==0x55:
            sid=d[0]|d[1]<<8
            if sid not in (142,143,144,145): print(t,'55',sid,S.get(sid,'?'),d[2:].hex(' ')[:70])
        elif c==0x50 and d[0] in (1,2): pass
        else: print(t,hex(c),d.hex(' ')[:60])
    i=end
