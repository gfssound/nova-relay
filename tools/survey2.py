import re,glob,collections,bisect
files=sorted(glob.glob('cap/*.log')+glob.glob('cap/in7/*.log'))
want={15,18,25,34,43,77,132,133,138,161,162,134,144}
vals=collections.defaultdict(set); ctx=[]
for fn in files:
    if any(x in fn for x in ('_conv','_solo','_pages','_nsolo')): continue
    if '115200' in open(fn,errors='ignore').read(400): continue
    b=bytearray(); pos=[]; ts=[]
    for line in open(fn,errors='ignore'):
        m=re.match(r'(\S+)\s+(RX|RAW)\s+((?:[0-9A-F]{2} ?)+)',line)
        if m: pos.append(len(b)); ts.append(m.group(1)); b+=bytes.fromhex(m.group(3).replace(' ',''))
    i=0
    while i+6<=len(b):
        if b[i]!=0xAA: i+=1; continue
        L=b[i+2]|(b[i+3]<<8); end=i+6+L
        if end>len(b) or L>4000 or (sum(b[i+2:end])&0xFF)!=b[i+1]: i+=1; continue
        cmd=b[i+5]; d=bytes(b[i+6:end])
        if cmd==0x50 and d[0] in (0x96,0x97,0x98) and len(ctx)<30: ctx.append((fn.split('/')[-1],ts[bisect.bisect_right(pos,i)-1],d.hex(' ')))
        if cmd==0x55 and len(d)>2:
            sid=d[0]|d[1]<<8
            if sid in want and len(vals[sid])<5: vals[sid].add(d[2:].decode('latin1','replace').replace('\x00','|')[:110] if sid in (132,133,134,161,162,144) else d[2:].hex(' ')[:90])
        if cmd==0x10 and L==8 and len(vals['c10 short'])<4: vals['c10 short'].add(d.hex(' '))
        i=end
for k,v in vals.items(): print(k, list(v))
print(); [print(c) for c in ctx]
