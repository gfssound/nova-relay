import re,sys,pickle
def parse(path):
    st={'TX':[], 'RX':[]}
    for l in open(path):
        m=re.match(r'(\S+)\s+(TX|RX) (.*)',l.rstrip())
        if m:
            t=m.group(1)[11:23]
            for x in m.group(3).split(): st[m.group(2)].append((t,int(x,16)))
    out={}
    for d,seq in st.items():
        b=[x for _,x in seq]; pk=[];i=0;skip=0
        while i<len(b):
            if b[i]!=0xAA: i+=1;skip+=1;continue
            if i+6>len(b): break
            n=b[i+2]; end=i+6+n
            p=b[i:end]
            if p[1]!=(sum(p[2:])&0xFF): i+=1;skip+=1;continue
            pk.append((seq[i][0],p)); i=end
        out[d]=(pk,skip,len(b))
    return out
if __name__=='__main__':
    o=parse(sys.argv[1])
    for d,(pk,skip,n) in o.items(): print(d,n,'bytes',len(pk),'packets, skipped',skip)
    pickle.dump(o,open(sys.argv[2],'wb'))
