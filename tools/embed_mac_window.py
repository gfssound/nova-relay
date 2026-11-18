#!/usr/bin/env python3
"""Put macbuild/window.js (the Mac app's window) into Build Mac App.command between the JXA markers, so the
builder stays one file. Run by tools/package.sh."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
cmd = root / "macbuild/Build Mac App.command"
js = (root / "macbuild/window.js").read_text()
assert "\nJXA\n" not in js
s = cmd.read_text()
new, n = re.subn(r"(cat > \"\$WORK/window\.js\" <<'JXA'\n).*?(^JXA\n)", lambda m: m.group(1) + js.rstrip("\n") + "\n" + m.group(2), s, flags=re.S | re.M)
assert n == 1, "JXA block not found"
cmd.write_text(new)
print("window.js embedded (%d lines)" % js.count("\n"))
