/* Nov 25 (Ferris: "update the manual to also use pictures of the relay"): the Docs PDF export can't include the
   manual's pictures, so the shipped PDF is made here from the Doc's HTML export, with the pictures from images/
   (images.json maps the Doc's blob ids to files) and the app's own fonts (fonts/, SIL OFL).
   node tools/manual/render.js <manual.html from the Doc's HTML export> <out.pdf> */
const fs = require("fs"), path = require("path"), { chromium } = require("playwright");
const [src, out] = process.argv.slice(2);
if(!src || !out){ console.error("usage: node tools/manual/render.js manual.html out.pdf"); process.exit(2); }
const dir = __dirname, map = JSON.parse(fs.readFileSync(path.join(dir, "images.json"), "utf8"));
let body = fs.readFileSync(src, "utf8");
const missing = [];
body = body.replace(/<img src="(blob\/[^"]+)"([^>]*)>/g, (m, id, rest) => {
  if(!map[id]){ missing.push(id); return m; }
  const phone = /phone/i.test(map[id]) ? ' class="phone"' : /strip/i.test(map[id]) ? ' class="strip"' : "";
  return `<img src="file://${path.join(dir, "images", map[id])}"${rest}${phone}>`;
});
if(missing.length){ console.error("pictures with no file in images.json:", missing.join(", ")); process.exit(1); }
body = body.replace(/<span data-atom="mention"[^>]*>[^<]*<\/span>/g, "Ferris");
body = body.replace(/<time data-atom="date" datetime="(\d{4})-(\d{2})-(\d{2})">[^<]*<\/time>/g, (m, y, mo, d) =>
  `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+mo - 1]} ${+d}, ${y}`);
const font = (fam, file, w, st = "normal") => `@font-face{font-family:"${fam}";src:url("file://${path.join(dir, "fonts", file)}");font-weight:${w};font-style:${st}}`;
const css = [font("Barlow", "Barlow-Regular.ttf", 400), font("Barlow", "Barlow-Italic.ttf", 400, "italic"), font("Barlow", "Barlow-Medium.ttf", 500),
  font("Barlow", "Barlow-SemiBold.ttf", 600), font("Barlow", "Barlow-Bold.ttf", 700),
  font("Saira Condensed", "SairaCondensed-SemiBold.ttf", 600), font("Saira Condensed", "SairaCondensed-Bold.ttf", 700),
  font("Martian Mono", "MartianMono-Regular.ttf", 400)].join("\n") + `
@page{size:Letter;margin:0.7in 0.75in 0.75in}
html{font:400 10.5pt/1.45 "Barlow",sans-serif;color:#1d2328}
h1{font:700 30pt/1.05 "Saira Condensed",sans-serif;letter-spacing:.01em;margin:0 0 4pt;text-transform:uppercase}
h1 + p{color:#5a646c;margin-top:0}
h2{font:700 17pt/1.1 "Saira Condensed",sans-serif;text-transform:uppercase;letter-spacing:.02em;margin:22pt 0 6pt;padding-top:8pt;border-top:2px solid #1d2328;break-after:avoid}
h3{font:600 13pt/1.15 "Saira Condensed",sans-serif;text-transform:uppercase;letter-spacing:.02em;margin:14pt 0 4pt;break-after:avoid}
p{margin:0 0 6pt} ul,ol{margin:0 0 6pt;padding-left:18pt} li{margin:0 0 2.5pt} li>p{margin:0 0 2pt}
strong{font-weight:700} em{font-style:italic;color:#4a545c}
code{font:400 .82em "Martian Mono",monospace;background:#eef1f3;padding:0 .25em;border-radius:3px}
table{border-collapse:collapse;width:100%;margin:4pt 0 10pt;font-size:9.2pt;line-height:1.35}
th,td{border:1px solid #c9d0d5;padding:4pt 6pt;vertical-align:top;text-align:left} th{background:#eef1f3;font-weight:700}
tr,img{break-inside:avoid}
p:has(> img){margin:8pt 0 4pt;text-align:center;break-inside:avoid;break-after:avoid}
img{max-width:100%;max-height:4.6in;border-radius:4px;box-shadow:0 0 0 1px #c9d0d5}
img.phone{max-height:4.2in} img.strip{max-height:3.4in}
p:has(> img) + p > em:only-child{display:block}
p:has(> img) + ol, p:has(> img) + p{break-before:avoid}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Nova Relay User Manual</title><style>${css}</style></head><body>${body}</body></html>`;
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  const tmp = path.join(path.dirname(path.resolve(out)), ".manual-render.html");
  fs.writeFileSync(tmp, html);
  await p.goto("file://" + tmp); await p.evaluate(() => document.fonts.ready);
  await p.pdf({path:out, format:"Letter", printBackground:true, displayHeaderFooter:true, headerTemplate:"<span></span>",
    footerTemplate:`<div style="width:100%;font:8pt Barlow,sans-serif;color:#7a848c;padding:0 0.75in;display:flex;justify-content:space-between"><span>Nova Relay User Manual</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    margin:{top:"0.7in", bottom:"0.75in", left:"0.75in", right:"0.75in"}});
  fs.unlinkSync(tmp); await b.close();
  console.log("manual PDF:", out);
})();
