import re,glob,collections
cnt=collections.Counter(); where=collections.defaultdict(set)
for fn in sorted(glob.glob('cap/*.log')+glob.glob('cap/in7/*.log')):
    if any(x in fn for x in ('_conv','_solo','_pages','_nsolo')) or '115200' in open(fn,errors='ignore').read(400): continue
    b=bytearray()
    for line in open(fn,errors='ignore'):
        m=re.match(r'\S+\s+(RX|RAW)\s+((?:[0-9A-F]{2} ?)+)',line)
        if m: b+=bytes.fromhex(m.group(2).replace(' ',''))
    i=0
    while i+6<=len(b):
        if b[i]!=0xAA: i+=1; continue
        L=b[i+2]|(b[i+3]<<8); end=i+6+L
        if end>len(b) or L>4000 or (sum(b[i+2:end])&0xFF)!=b[i+1]: i+=1; continue
        d=bytes(b[i+6:end])
        if b[i+5]==0x50 and d[0] in (0x81,0x82,0x03): k=(d[0],d[2]); cnt[k]+=1; where[k].add(fn.split('/')[-1])
        if b[i+5]==0x10 and L==17: cnt[('c10b8-15', d[8:16]!=bytes(8))]+=1
        i=end
for k,n in sorted(cnt.items(),key=str): print(k,n,sorted(where.get(k,[]))[:6])
