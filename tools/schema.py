import re,json,sys
out=[]
for line in open(sys.argv[1]):
    m=re.match(r'#define SETTING_(\w+)\s+(\d+)\s*//\s*(\w+)(\{[\d,]*\})?\s+([\w.]+)\s*(.*)',line)
    if not m: continue
    name,id_,typ,dims,key,rest=m.groups()
    d={"id":int(id_),"n":name,"t":typ,"k":key}
    if dims: d["d"]=[int(x) for x in dims.strip('{}').split(',')]
    rest=rest.strip()
    mm=re.search(r'menu:(.*)$',rest)
    if mm: d["m"]=mm.group(1).split(':')
    rr=re.search(r'range\{([^}]*)\}\s*(.*)$',rest)
    if rr:
        parts=rr.group(1).split(',')
        d["r"]=[float(parts[0]),float(parts[1])]
        st=[p for p in parts if p.startswith('step=')]
        d["s"]=float(st[0][5:]) if st else 1
        if rr.group(2).strip(): d["u"]=rr.group(2).strip()
    out.append(d)
json.dump(out,open(sys.argv[2],'w'),separators=(',',':'))
print(len(out))
