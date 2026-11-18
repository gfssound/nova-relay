import json,re,sys,html
raw=json.JSONDecoder().raw_decode(open(sys.argv[1]).read())[0]; x=raw['data']['xml']
out=[]
for m in re.finditer(r"<(paragraph|row|cell|table|list)\b([^>]*?)(/?)>",x):
    pass
# simple: split on paragraph tags
for m in re.finditer(r"<paragraph id='([^']+)'([^>]*?)(?:/>|>(.*?)</paragraph>)",x,re.S):
    pid,attrs,body=m.group(1),m.group(2),m.group(3) or ''
    txt=html.unescape(re.sub(r'<[^>]+>','',body))
    hd=re.search(r"heading='(\d)'",attrs); li=re.search(r"list='([^']+)'",attrs)
    out.append(f"{pid}\t{'H'+hd.group(1) if hd else ('L' if li else '')}\t{txt}")
open(sys.argv[2],'w').write("\n".join(out)); print(len(out))
