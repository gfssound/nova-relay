const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:820}});p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(600);
const r={flags:await p.locator('.sflags').count(), strips:await p.locator('.strip').count()};
// scale aligned with LED: compare canvas tops
r.align=await p.evaluate(()=>{const c=[...document.querySelectorAll('.led')].map(e=>{const b=e.getBoundingClientRect();return [Math.round(b.top),Math.round(b.height)]});return c.slice(0,3);});
await p.screenshot({path:'build/noflags.png'});
await p.locator('.routeseg button',{hasText:'Outputs'}).click(); await p.waitForTimeout(200); r.out=await p.locator('.strip').count();
console.log(JSON.stringify(r),errs);await b.close();})();
