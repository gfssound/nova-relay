// Nov 12: Scream trim in the prototype: choose RX, press, restore; hand-trimmed RX keeps its new value; unknown trims say so.
const { chromium } = require("playwright"), path = require("path");
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1024, 600], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on("pageerror", e => errs.push(e.message));
    await p.goto("file://" + path.join(__dirname, "../build/cart-remote.html")); await sleep(900);
    const btn = () => p.evaluate(() => { const x = document.querySelector(".screambtn"); return x ? x.textContent + " pressed=" + x.getAttribute("aria-pressed") : "none"; });
    console.log(`${w}: button:`, await btn());
    await p.click(".screambtn"); await sleep(300);
    console.log("  no RX chosen -> view:", await p.evaluate(() => current), "| section:", await p.evaluate(() => setupSec));
    await p.screenshot({ path: path.join(__dirname, `../shots/scream_setup_${w}.png`) });
    await p.evaluate(() => { set("ui.znettrim", [], [25, 25, 30, 25, null, null, 25, 25], "remote"); });
    for (const r of [0, 1, 4]) await p.click(`.rxchip >> nth=${r}`);
    await p.evaluate(() => set("ui.scream.level", [], 12)); await sleep(200);
    await p.evaluate(() => go("home")); await sleep(400);
    console.log("  ready:", await btn());
    await p.click(".screambtn"); await sleep(300);
    console.log("  on:", await btn(), "| trims", await p.evaluate(() => JSON.stringify(get("ui.znettrim"))));
    await p.screenshot({ path: path.join(__dirname, `../shots/scream_on_${w}.png`) });
    await p.evaluate(() => set("ui.znettrim", [1], 20)); // hand trim RX 2 while screaming
    await p.click(".screambtn"); await sleep(300);
    console.log("  off:", await btn(), "| trims", await p.evaluate(() => JSON.stringify(get("ui.znettrim"))), "| toast:", await p.evaluate(() => document.querySelector(".toast")?.textContent));
    await p.close();
  }
  console.log("errors", errs); await b.close();
})();
