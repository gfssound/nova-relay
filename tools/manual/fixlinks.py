"""Nov 25 (Ferris: "Contents should be clickable to jump to a page"): Chromium's PDF links point to named
destinations, which some viewers ignore. Point every link straight at its page (an explicit /XYZ destination,
which every viewer follows) and add bookmarks for the same entries, so the viewer's sidebar can jump too.
python3 fixlinks.py <pdf> <json list of [title, level, dest name]>"""
import sys, json
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, NameObject, NumberObject, NullObject, DictionaryObject, TextStringObject

src, entries = sys.argv[1], json.loads(sys.argv[2])
r = PdfReader(src); w = PdfWriter(clone_from=r)
nd = {k.lstrip("/"): v for k, v in r.named_destinations.items()}
pages = {p.indirect_reference.idnum: i for i, p in enumerate(r.pages)}
def target(name):
    d = nd.get(name.lstrip("/"))
    if not d: return None
    return pages[d.page.idnum], float(d.left or 0), float(d.top or 0)
fixed = 0
for i, page in enumerate(w.pages):
    for ref in page.get("/Annots", []) or []:
        a = ref.get_object()
        if a.get("/Subtype") != "/Link": continue
        dest = a.get("/Dest") or (a.get("/A") or {}).get("/D")
        if isinstance(dest, str) or hasattr(dest, "startswith"):
            t = target(str(dest))
            if not t: continue
            pi, left, top = t
            arr = ArrayObject([w.pages[pi].indirect_reference, NameObject("/XYZ"), NumberObject(int(left)), NumberObject(int(top)), NullObject()])
            if "/A" in a: del a["/A"]
            a[NameObject("/Dest")] = arr; fixed += 1
parent = None
for title, level, name in entries:
    t = target(name)
    if not t: continue
    item = w.add_outline_item(title, t[0], parent=None if level == 0 else parent)
    if level == 0: parent = item
w.page_mode = "/UseOutlines"
w.write(src)
print(f"links pointed at pages: {fixed}; bookmarks: {len(entries)}")
