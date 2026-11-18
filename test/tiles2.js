const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const errs=[];
for (const [w,hh] of [[1280,800],[1024,768]]) {
  const p=await b.newPage({viewport:{width:w,height:hh}}); p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.join(__dirname,'../build/cart-remote.html')); await p.waitForTimeout(400);
  await p.evaluate(()=>{ go("inputs"); set("input.channel",[],1,"local"); }); await p.waitForTimeout(400);
  const before=await p.evaluate(()=>[get("input.level",[0]),get("input.phase",[0]),get("input.compress.link",[0])]);
  await p.click('.vtile:has-text("Level")'); await p.click('.vtile:has-text("Phase")'); await p.click('.vtile:has-text("Link group")');
  const after=await p.evaluate(()=>[get("input.level",[0]),get("input.phase",[0]),get("input.compress.link",[0])]);
  console.log(w,'before',before,'after',after, 'page height', await p.evaluate(()=>document.documentElement.scrollHeight));
  await p.screenshot({path:path.join(__dirname,`tiles2-${w}.png`)});
  await p.close();
}
console.log('errors',errs); await b.close(); })();
