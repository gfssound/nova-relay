import pickle,json,sys
S={s['id']:s for s in json.load(open('nova-remote/schema.json'))}
o=pickle.load(open(sys.argv[1],'rb')); ev=[]
for d in o:
    for t,p in o[d][0]:
        p=list(p); c=p[5]
        if c in (0x10,0x11,0x12,0x16,0x18,0x20): continue
        if c==0x55:
            i=p[6]|(p[7]<<8)
            if i in (58,142,143,144,145,161,162): continue
            ev.append((t,d,'SET %3d %-22s %s'%(i,S.get(i,{}).get('n',str(i)),' '.join('%02X'%x for x in p[8:]))))
        else: ev.append((t,d,'CMD %02X %s'%(c,' '.join('%02X'%x for x in p[6:])[:120])))
ev.sort()
for e in ev: print(*e)
