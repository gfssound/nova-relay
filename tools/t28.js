const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(400);
const r={};
await p.click('.tab[data-v="routing"]'); r.tabs=await p.locator('.routeseg button').allTextContents();
await p.locator('.routeseg button',{hasText:'Outputs'}).click(); await p.waitForTimeout(150); r.outPanels=await p.locator('#view .panel').count();
await p.locator('.routeseg button',{hasText:'Presets'}).click(); await p.waitForTimeout(200);
r.editors=await p.locator('.ped').count();
// edit MIX L + R (index 2): add track 3 post, toggle Slate, rename
const ed=p.locator('.ped').nth(2);
await ed.locator('.ocell').nth(2).click(); await p.locator('.ped').nth(2).locator('.ocell').nth(2).click();
await p.locator('.ped').nth(2).locator('button.chip',{hasText:'Slate'}).click();
const nm=p.locator('#pe-name-2'); await nm.fill('mix + boom'); await nm.press('Enter');
r.edited=await p.evaluate(()=>V["ui.outpresets"][2]);
// duplicate name rejected
await p.locator('#pe-name-3').fill('mix l'); await p.locator('#pe-name-3').press('Enter'); r.dupe=await p.evaluate(()=>V["ui.outpresets"][3].name);
// load on OUT 7
await p.selectOption('#pe-load-2','6'); r.out7=await p.evaluate(()=>({r:V["outputmix.matrix"][0][6].slice(0,4),slate:V["outputmix.slate"][0][6]}));
r.used=await p.locator('.ped').nth(2).locator('.opused').textContent();
// new blank
await p.locator('button',{hasText:'New blank preset'}).click(); r.count=await p.evaluate(()=>V["ui.outpresets"].length);
await p.waitForTimeout(2500);
await p.screenshot({path:'build/presets-tab.png'});
// persisted tab
r.mode=await p.evaluate(()=>routeMode);
// matrix dropdown shows renamed
await p.locator('.routeseg button',{hasText:'Outputs'}).click(); await p.waitForTimeout(150);
r.out7label=await p.evaluate(()=>{const s=document.getElementById('f-outpreset-6');return s.options[s.selectedIndex].text});
r.overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
console.log(JSON.stringify(r),errs);await b.close();})();
