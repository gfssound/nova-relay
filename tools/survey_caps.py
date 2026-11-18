import re,glob,collections,json,sys,os
root=sys.argv[1]
files=sorted(set(glob.glob(root+'/*.log')+glob.glob(root+'/in7/*.log')))
files=[f for f in files if '_conv' not in f and '_solo' not in f and '_pages' not in f and '_nsolo' not in f]
cmds=collections.Counter(); cmdfiles=collections.defaultdict(set); cmdlens=collections.defaultdict(collections.Counter)
ids=collections.Counter(); idfiles=collections.defaultdict(set); idtx=collections.Counter()
f50=collections.Counter(); f50ex={}; f58=collections.Counter(); f52=collections.Counter(); c25=collections.Counter()
other=collections.defaultdict(list)
for fn in files:
    head=open(fn,errors='ignore').read(400)
    if '115200' in head: continue
    bufs={'RX':bytearray(),'TX':bytearray()}
    for line in open(fn,errors='ignore'):
        m=re.match(r'\S+\s+(TX|RX|RAW)\s+((?:[0-9A-F]{2} ?)+)',line)
        if not m: continue
        d='TX' if m.group(1)=='TX' else 'RX'
        bufs[d]+=bytes.fromhex(m.group(2).replace(' ',''))
    for d,b in bufs.items():
        i=0
        while i+6<=len(b):
            if b[i]!=0xAA: i+=1; continue
            L=b[i+2]|(b[i+3]<<8); end=i+6+L
            if end>len(b) or L>4000: i+=1; continue
            if (sum(b[i+2:end])&0xFF)!=b[i+1]: i+=1; continue
            cmd=b[i+5]; data=bytes(b[i+6:end])
            key=(d,cmd); cmds[key]+=1; cmdfiles[key].add(os.path.basename(fn)); cmdlens[key][L]+=1
            if cmd==0x55 and len(data)>=2:
                sid=data[0]|(data[1]<<8); ids[(d,sid)]+=1; idfiles[(d,sid)].add(os.path.basename(fn))
            elif cmd==0x50 and data:
                k=(d,data[:1].hex()); f50[k]+=1; f50ex.setdefault(k,set()).add(data.hex(' ')) if len(f50ex.get(k,()))<6 else None
            elif cmd==0x58: f58[(d,data.split(b'\0')[0].decode('latin1'))]+=1
            elif cmd==0x52: f52[(d,data.split(b'\0')[0].decode('latin1'))]+=1
            elif cmd==0x25: c25[(d,data.hex(' '))]+=1
            elif cmd not in (0x10,0x11,0x12,0x16,0x18,0x20,0x13):
                if len(other[key])<5: other[key].append(data.hex(' '))
            i=end
print("FILES",len(files))
print("\nCMDS"); [print(f"{d} {c:02X} n={n} lens={dict(cmdlens[(d,c)].most_common(4))} files={len(cmdfiles[(d,c)])}") for (d,c),n in sorted(cmds.items(),key=lambda x:(x[0][1],x[0][0]))]
print("\nOTHER examples"); [print(f"{d} {c:02X}",v) for (d,c),v in other.items()]
print("\nCMD50 fields"); [print(k,n,sorted(f50ex[k])[:6]) for k,n in sorted(f50.items())]
print("\nCMD58",dict(f58)); print("\nCMD52",dict(f52)); print("\nCMD25",dict(c25))
json.dump({'rx':sorted({s for (d,s) in ids if d=='RX'}),'tx':sorted({s for (d,s) in ids if d=='TX'}),'rxn':{s:n for (d,s),n in ids.items() if d=='RX'}},open('/tmp/claude-0/-home-claude/10fb85d4-efc5-5dbf-a537-af46f5c1d13e/scratchpad/tools/ids_seen.json','w'))
