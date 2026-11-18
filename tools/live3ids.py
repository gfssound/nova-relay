import re,bisect
b=bytearray(); pos=[]; ts=[]
for line in open('cap/live3.log',errors='ignore'):
    m=re.match(r'(\S+)\s+(RAW|RX)\s+((?:[0-9A-F]{2} ?)+)',line)
    if m: pos.append(len(b)); ts.append(m.group(1)[11:23]); b+=bytes.fromhex(m.group(3).replace(' ',''))
i=0; first=None
while i+6<=len(b):
    if b[i]!=0xAA: i+=1; continue
    L=b[i+2]|(b[i+3]<<8); end=i+6+L
    if end>len(b) or L>4000 or (sum(b[i+2:end])&0xFF)!=b[i+1]: i+=1; continue
    d=bytes(b[i+6:end]); t=ts[bisect.bisect_right(pos,i)-1]
    if b[i+5]==0x55 and t>'23:32:10': print(t, d[0]|d[1]<<8, d[2:].hex(' ')[:60])
    i=end
