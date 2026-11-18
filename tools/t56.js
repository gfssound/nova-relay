const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>errs.push('c:'+m.text()));
const html=require('fs').readFileSync('build/cart-remote.html','utf8');
await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>'+html+'</body></html>');await p.waitForTimeout(300);
await p.click('.tab[data-v="meta"]'); await p.waitForTimeout(150);
await p.locator('.notebtn.wide').nth(0).click(); await p.waitForTimeout(100);
await p.fill('#note-pop','boom in shot'); await p.press('#note-pop','Enter'); await p.waitForTimeout(100);
console.log(await p.locator('.modal').count(), await p.evaluate(()=>[V["note.current"], !!modal]), errs.filter(e=>!e.includes('ERR_TUNNEL')));await b.close();})();
