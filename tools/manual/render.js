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
/* Contents (Nov 25, Ferris: "a table of contents that allows users to jump to certain pages"): the Doc's Contents list
   links to the Doc's own block ids; here each entry is pointed at the heading with the same words, and gets its page
   number (found in a first render) so the PDF's contents both show the page and jump to it. */
const heads = [...body.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)].map(m => ({id:m[2], text:m[3].replace(/<[^>]+>/g, "").trim()}));
const norm = t => t.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const tocAt = body.indexOf('<h2 id="contents">');
let tocIds = [];
if(tocAt >= 0){
  const olAt = body.indexOf("<ol>", tocAt), olEnd = body.indexOf("</ol>", olAt) + 5;
  let ol = body.slice(olAt, olEnd);
  ol = ol.replace(/<a href="#[^"]*">([\s\S]*?)<\/a>/g, (m, t) => {
    const k = norm(t.replace(/<[^>]+>/g, "")), h = heads.find(x => x.id !== "contents" && (norm(x.text) === k || norm(x.text).startsWith(k)));
    if(!h) return t;
    tocIds.push(h.id);
    return `<a href="#${h.id}"><span class="t">${t}</span><span class="dots"></span><span class="pg" data-for="${h.id}">00</span></a>`;
  });
  body = body.slice(0, olAt) + `<nav class="toc">${ol}</nav>` + body.slice(olEnd);
}
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
p:has(> img) + ol, p:has(> img) + p{break-before:avoid}
h2#contents{border-top:0;margin-top:14pt}
nav.toc{break-after:page} nav.toc ol,nav.toc ul{list-style:none;padding-left:0;margin:0} nav.toc ul{padding-left:16pt}
nav.toc li{margin:0} nav.toc p{margin:0}
nav.toc a{display:flex;align-items:baseline;gap:6pt;color:inherit;text-decoration:none;padding:3pt 0;font-size:11.5pt}
nav.toc ol > li > p > a{font-weight:600} nav.toc ul a{font-size:10.5pt;padding:1.5pt 0;color:#3a444c}
nav.toc .dots{flex:1;border-bottom:1px dotted #9aa3aa;transform:translateY(-3pt)} nav.toc .pg{font-variant-numeric:tabular-nums;min-width:2ch;text-align:right}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Nova Relay User Manual</title><style>${css}</style></head><body>${body}</body></html>`;
(async () => {
  const { execFileSync } = require("child_process");
  const b = await chromium.launch(), p = await b.newPage();
  const tmp = path.join(path.dirname(path.resolve(out)), ".manual-render.html");
  const pdfOpts = {format:"Letter", printBackground:true, displayHeaderFooter:true, headerTemplate:"<span></span>",
    footerTemplate:`<div style="width:100%;font:8pt Barlow,sans-serif;color:#7a848c;padding:0 0.75in;display:flex;justify-content:space-between"><span>Nova Relay User Manual</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    margin:{top:"0.7in", bottom:"0.75in", left:"0.75in", right:"0.75in"}};
  const render = async (doc, file) => { fs.writeFileSync(tmp, doc); await p.goto("file://" + tmp); await p.evaluate(() => document.fonts.ready); await p.pdf({path:file, ...pdfOpts}); };
  /* first render: each listed heading carries an invisible marker (absolutely placed, so the layout doesn't move) */
  const marked = html.replace(/<h([23]) id="([^"]+)">/g, (m, l, id) => tocIds.includes(id) ? `<h${l} id="${id}" style="position:relative">` +
    `<span style="position:absolute;left:0;top:0;font-size:2px;color:#fff">QXMARK${tocIds.indexOf(id)}QX</span>` : m);
  await render(tocIds.length ? marked : html, out);
  if(tocIds.length){
    /* the page each heading starts on: the first page after the contents with a line that is exactly that heading */
    const n = +String(execFileSync("pdfinfo", [out])).match(/Pages:\s+(\d+)/)[1], pages = [];
    for(let i = 1; i <= n; i++) pages.push(String(execFileSync("pdftotext", ["-f", String(i), "-l", String(i), "-layout", out, "-"])).split("\n").map(l => l.trim().toLowerCase().replace(/\s+/g, " ")));
    const pageOf = {}; let missing = [];
    tocIds.forEach((id, n) => { const i = pages.findIndex(ls => ls.some(l => l.includes(`qxmark${n}qx`)));
      if(i < 0) missing.push(heads.find(x => x.id === id).text); else pageOf[id] = i + 1; });
    if(missing.length) console.error("contents: no page found for", missing.join(", "));
    const html2 = html.replace(/<span class="pg" data-for="([^"]+)">00<\/span>/g, (m, id) => `<span class="pg">${pageOf[id] || ""}</span>`);
    await render(html2, out);
  }
  fs.unlinkSync(tmp); await b.close();
  console.log("manual PDF:", out);
})();
