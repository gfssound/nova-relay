const { chromium } = require("playwright"), path = require("path");
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.goto("file://" + path.join(__dirname, "../build/cart-remote.html")); await sleep(1200);
  // off: nothing appears
  await pg.evaluate(() => { const i = outNameInput(0, "t-out"); i.style.cssText = "position:fixed;top:120px;left:40px;width:300px;z-index:5"; document.body.append(i); });
  await pg.tap("#t-out"); await sleep(200);
  console.log("off -> keyboard shown:", await pg.evaluate(() => OSK.open));
  await pg.evaluate(() => document.activeElement.blur()); await sleep(200);
  // on
  await pg.evaluate(() => set("ui.osk", [], 1));
  await pg.tap("#t-out"); await sleep(300);
  console.log("on -> shown:", await pg.evaluate(() => OSK.open), "| inputmode while open:", await pg.getAttribute("#t-out", "inputmode"), "| --osk-h:", await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--osk-h")));
  const key = async k => { await pg.locator(`.osk [data-k="${k}"]`).first().dispatchEvent("pointerdown"); await pg.evaluate(() => dispatchEvent(new PointerEvent("pointerup"))); };
  for (const k of ["⇧", "b", "o", "o", "m", "space", "123", "2", "ABC"]) await key(k);
  console.log("typed:", JSON.stringify(await pg.inputValue("#t-out")), "| focus kept:", await pg.evaluate(() => document.activeElement.id));
  await key("⌫");
  console.log("after delete:", JSON.stringify(await pg.inputValue("#t-out")));
  await pg.screenshot({ path: "shots/osk_abc.png" });
  await key("Done"); await sleep(300);
  console.log("Done -> saved name:", JSON.stringify((get => get)(await pg.evaluate(() => (get("ui.outnames") || [])[0]))), "| keyboard open:", await pg.evaluate(() => OSK.open), "| inputmode restored:", await pg.getAttribute("#t-out", "inputmode"));
  // numeric box gets the number pad
  await pg.evaluate(() => { const i = h("input", {type:"text", class:"txt", id:"t-num", inputmode:"numeric", "aria-label":"Timecode"}); i.style.cssText = "position:fixed;top:200px;left:40px;width:200px"; document.body.append(i); });
  await pg.tap("#t-num"); await sleep(300);
  for (const k of ["1", "2", ":", "0"]) await key(k);
  console.log("num layout:", await pg.evaluate(() => document.querySelector(".osk").classList.contains("oknum")), "| typed:", await pg.inputValue("#t-num"));
  await pg.screenshot({ path: "shots/osk_num.png" });
  await pg.locator('.osk [data-k="hide"]').dispatchEvent("pointerdown"); await sleep(300);
  console.log("hide -> open:", await pg.evaluate(() => OSK.open), "| inputmode back:", await pg.getAttribute("#t-num", "inputmode"), "| focus:", await pg.evaluate(() => document.activeElement.tagName));
  // inside a real pop-up: open the all-settings page search
  await pg.evaluate(() => { setupSec = "disp"; go("setup"); }); await sleep(500);
  await pg.screenshot({ path: "shots/osk_setting.png" });
  console.log("errors:", errs);
  await b.close();
})();
