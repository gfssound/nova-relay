import re,sys,pickle,datetime
def parse(path):
    st={'TX':[], 'RX':[]}
    for l in open(path):
        m=re.match(r'(\S+)\s+(TX|RAW) ([0-9A-F ]+?)(\s+\|.*)?$',l.rstrip())
        if m:
            d='RX' if m.group(2)=='RAW' else 'TX'
            t=m.group(1)[11:23]
            for x in m.group(3).split(): st[d].append((t,int(x,16)))
    out={}
    for d,seq in st.items():
        b=[x for _,x in seq]; pk=[];i=0;skip=0
        while i<len(b):
            if b[i]!=0xAA: i+=1;skip+=1;continue
            if i+6>len(b): break
            n=b[i+2]|(b[i+3]<<8); end=i+6+n
            p=b[i:end]
            if len(p)<6+n or p[1]!=(sum(p[2:])&0xFF): i+=1;skip+=1;continue
            pk.append((seq[i][0],p)); i=end
        out[d]=(pk,skip,len(b))
    return out
o=parse(sys.argv[1])
for d,(pk,skip,n) in o.items(): print(d,n,'bytes',len(pk),'packets, skipped',skip)
pickle.dump(o,open(sys.argv[2],'wb'))
