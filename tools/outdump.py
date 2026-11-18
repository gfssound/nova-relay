import re,sys
for fn in sys.argv[1:]:
    b=bytearray()
    for line in open(fn,errors='ignore'):
        m=re.match(r'(\S+)\s+(RX|RAW)\s+((?:[0-9A-F]{2} ?)+)',line)
        if m: b+=bytes.fromhex(m.group(3).replace(' ',''))
    i=0; rows={}
    while i+6<=len(b):
        if b[i]!=0xAA: i+=1; continue
        L=b[i+2]|(b[i+3]<<8); end=i+6+L
        if end>len(b) or L>4000 or (sum(b[i+2:end])&0xFF)!=b[i+1]: i+=1; continue
        d=bytes(b[i+6:end])
        if b[i+5]==0x55 and d[:2]==b'\x18\x00' and d[3]==3 and d[7]==2:
            o=d[9]; rest=d[10:]; rows.setdefault(o,[(rest[k],rest[k+1]) for k in range(0,len(rest)-1,2)])
        if b[i+5]==0x55 and d[:2]==b'\x18\x00' and d[3]==3 and d[7]==0: rows.setdefault('all',d[8:].hex(' '))
        i=end
    print(fn.split('/')[-1], {k:v for k,v in sorted(rows.items(),key=str)})
