import re,glob,bisect,sys,collections
sys.path.insert(0,'.')
hits=[]; allout=collections.Counter(); notes={}
for fn in sorted(glob.glob('cap/*.log')+glob.glob('cap/in7/*.log')):
    if any(x in fn for x in ('_conv','_solo','_pages','_nsolo')) or '115200' in open(fn,errors='ignore').read(400): continue
    b=bytearray(); pos=[]; ts=[]; nl=[]
    for line in open(fn,errors='ignore'):
        if ' NOTE ' in line: nl.append(line.strip()[:110])
        m=re.match(r'(\S+)\s+(RX|RAW)\s+((?:[0-9A-F]{2} ?)+)',line)
        if m: pos.append(len(b)); ts.append(m.group(1)[11:23]); b+=bytes.fromhex(m.group(3).replace(' ',''))
    notes[fn]=nl
    i=0
    while i+6<=len(b):
        if b[i]!=0xAA: i+=1; continue
        L=b[i+2]|(b[i+3]<<8); end=i+6+L
        if end>len(b) or L>4000 or (sum(b[i+2:end])&0xFF)!=b[i+1]: i+=1; continue
        d=bytes(b[i+6:end])
        if b[i+5]==0x55 and len(d)>4 and d[0]==24 and d[1]==0:
            t=ts[bisect.bisect_right(pos,i)-1]
            nd=d[3]; dims=list(d[4:4+nd]); p=4+nd; nidx=d[p]; idx=list(d[p+1:p+1+nidx]); val=d[p+1+nidx:]
            allout[(tuple(dims),nidx)]+=1
            if nidx==3:
                o,src=idx[1],idx[2]
                if o<4: hits.append((fn.split('/')[-1],t,dims,o+1,src,val.hex()))
            elif nidx==2 and idx[1]<4:
                rest=val; pairs=[(rest[k],rest[k+1]) for k in range(0,len(rest)-1,2)]
                big=[p_ for p_ in pairs if p_[0]>=22]
                if big: hits.append((fn.split('/')[-1],t,dims,idx[1]+1,'row',big))
        i=end
print(allout)
seen=set()
for h in hits:
    k=(h[0],h[3],str(h[4]),str(h[5]))
    if (h[4]=='row' or h[4]>=22) and k not in seen: seen.add(k); print(h)
print('OUT1-4 single-source reports:',len([h for h in hits if h[4]!='row']), 'sources:',sorted({(h[2][2],h[4]) for h in hits if h[4]!='row'}))
