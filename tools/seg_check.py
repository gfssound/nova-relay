import re,glob,bisect
for fn in sorted(glob.glob('cap/*.log')+glob.glob('cap/in7/*.log')):
    if any(x in fn for x in ('_conv','_solo','_pages','_nsolo')): continue
    if '115200' in open(fn,errors='ignore').read(400): continue
    b=bytearray(); pos=[]; ts=[]
    for line in open(fn,errors='ignore'):
        m=re.match(r'(\S+)\s+(RX|RAW)\s+((?:[0-9A-F]{2} ?)+)',line)
        if m: pos.append(len(b)); ts.append(m.group(1)[11:23]); b+=bytes.fromhex(m.group(3).replace(' ',''))
    i=0; out=[]; recording=False
    while i+6<=len(b):
        if b[i]!=0xAA: i+=1; continue
        L=b[i+2]|(b[i+3]<<8); end=i+6+L
        if end>len(b) or L>4000 or (sum(b[i+2:end])&0xFF)!=b[i+1]: i+=1; continue
        cmd=b[i+5]; d=bytes(b[i+6:end]); t=ts[bisect.bisect_right(pos,i)-1]
        if cmd==0x55 and len(d)>2:
            sid=d[0]|d[1]<<8
            if sid in (161,162,132,133): out.append(f"{t} {sid} {d[2:].decode('latin1','replace').replace(chr(0),'|')[:100]}")
            if sid==58 and recording: out.append(f"{t} 58 row {d[2:].hex(' ')[:40]} {d[2:].decode('latin1','replace').replace(chr(0),'|')[8:70]}")
        if cmd==0x58: txt=d.split(b'\0')[0]; 
        if cmd==0x58 and txt in (b'mp3.record',b'mp3.stop'): out.append(f"{t} EVENT {txt.decode()}"); recording=True
        i=end
    if out: print("==",fn); print("\n".join(out[:40]))
