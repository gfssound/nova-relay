const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
(async () => {
  const dir = process.argv[2], size = +process.argv[3], shot = process.argv[4];
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".svg")).sort();
  const cells = files.map(f => { const svg = fs.readFileSync(path.join(dir, f), "utf8"), jpg = fs.readFileSync(path.join(dir, f.replace(".svg", ".jpg"))).toString("base64");
    return `<div class=c><img width=${size} height=${size} src="data:image/svg+xml,${encodeURIComponent(svg)}"><img width=${size} height=${size} src="data:image/jpeg;base64,${jpg}"><div>${f.slice(3, -4)}</div></div>`; }).join("");
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  await p.setContent(`<body style="background:#000;color:#999;font:11px sans-serif;margin:8px"><style>.c{display:inline-block;margin:6px;text-align:center}.c img{margin:1px;image-rendering:pixelated}</style>${cells}</body>`);
  await p.screenshot({ path: shot, fullPage: true }); await b.close();
})();
