const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch(); const errs=[];
 const html=require('fs').readFileSync(process.argv[2],'utf8');
 const doc='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+html+'</body></html>';
 for(const [w,hgt,name] of [[1280,820,'desk'],[400,860,'phone']]){
  const p=await b.newPage({viewport:{width:w,height:hgt}});
  p.on('pageerror',e=>errs.push(name+': '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(name+' console: '+m.text())});
  await p.setContent(doc,{waitUntil:'load'}); await p.waitForTimeout(1500);
  if(name==='desk'){
   await p.click('#bRec'); await p.waitForTimeout(1200);
   await p.screenshot({path:`build/${name}-home.png`});
   await p.click('#bStop'); await p.waitForTimeout(300);
   for(const v of ['inputs','tracks','outputs','phones','timecode','meta','setup','all','log']){
     await p.click(`.tab[data-v="${v}"]`); await p.waitForTimeout(250);
     if(['inputs','tracks','log'].includes(v)) await p.screenshot({path:`build/${name}-${v}.png`});
   }
  } else { await p.screenshot({path:`build/${name}-home.png`}); }
  const ow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth); console.log(name,'overflow',ow);
 }
 console.log('ERRORS',JSON.stringify(errs)); await b.close();
})();
