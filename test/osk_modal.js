const { chromium } = require("playwright"), path = require("path");
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  for (const [w, hgt, name] of [[1280, 720, "mac"], [390, 844, "phone"]]) {
    const pg = await b.newPage({ viewport: { width: w, height: hgt }, hasTouch: true });
    const errs = []; pg.on("pageerror", e => errs.push(e.message));
    await pg.goto("file://" + path.join(__dirname, "../build/cart-remote.html")); await sleep(1200);
    await pg.evaluate(() => { set("ui.osk", [], 1); const hst = get("metadata.history") || []; if(!hst.length) set("metadata.history", [], [{seg:0, scene:"42A", take:"3", note:""}]); openTakeEditor(0); });
    await sleep(400);
    await pg.tap("#hist-note"); await sleep(400);
    const key = async k => { await pg.locator(`.osk [data-k="${k}"]`).first().dispatchEvent("pointerdown"); await pg.evaluate(() => dispatchEvent(new PointerEvent("pointerup"))); };
    for (const k of ["⇧", "g", "o", "o", "d"]) await key(k);
    await pg.screenshot({ path: `shots/osk_modal_${name}.png` });
    const r = await pg.evaluate(() => { const i = document.getElementById("hist-note").getBoundingClientRect(), k = document.querySelector(".osk").getBoundingClientRect(); return { inputBottom: Math.round(i.bottom), kbTop: Math.round(k.top), value: document.getElementById("hist-note").value }; });
    console.log(name, JSON.stringify(r), "visible above keyboard:", r.inputBottom <= r.kbTop, "errors", errs);
    await pg.close();
  }
  await b.close();
})();
