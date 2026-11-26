const {open,marks,chromium}=require('./base');
const T=(text,kids=0,within)=>({text,kids,within});
(async()=>{const b=await chromium.launch(); const out=[];
 // 1 main screen with callouts
 let p=await open(b); await p.evaluate(()=>go('home')); await p.waitForTimeout(1600);
 const names=await p.evaluate(()=>[...document.querySelectorAll('.strip:not(.scale) .snm')].map(e=>e.textContent));
 const anna=names.indexOf('ANNA');
 await marks(p,[
  {n:1,el:'#linkPill',at:'l'},{n:2,el:'#stPriBox',at:'b',dy:2},{n:3,el:'#dayBtn',at:'b',dy:2},
  {n:4,el:'#tabs .tab',i:8,at:'r'},{n:5,el:'.routeseg',at:'r'},{n:6,el:T('All TX',0),at:'l'},
  {n:7,el:'.scale',at:'b',dy:-30},{n:8,el:'.strip:not(.scale) .scrib',i:anna,at:'tr'},
  {n:9,el:'.tc',at:'b',dx:40},{n:10,el:T('SCENE',2,'.transport *'),at:'tr'},{n:11,el:T('TAKE',2,'.transport *'),at:'tr'},{n:12,el:T('HEADPHONES',2,'.transport *'),at:'tr'},
  {n:13,el:T('TONE',3,'.transport button'),at:'tl'},{n:14,el:T('STOP',3,'.transport button'),at:'tl'},{n:15,el:T('REC',3,'.transport button'),at:'tl'}]);
 await p.waitForTimeout(200); await p.screenshot({path:'01-main.png'}); out.push(p.errs);
 // 2 one strip close up (ANNA) with callouts, plus DEV for STBY
 await p.evaluate(()=>document.querySelectorAll('.mk-callout').forEach(e=>e.remove()));
 const box=await p.evaluate(i=>{const s=[...document.querySelectorAll('.strip:not(.scale)')]; const a=s[i].getBoundingClientRect(), c=s[i+2].getBoundingClientRect(); return {x:a.left-50,y:a.top-22,width:c.right-a.left+100,height:a.height+44};},anna);
 await p.evaluate(i=>{ const st=[...document.querySelectorAll('.strip:not(.scale)')][i]; const vis=q=>[...st.querySelectorAll(q)].find(e=>e.getBoundingClientRect().width>0);
   vis('.scrib').dataset.mk='name'; vis('.zpill').dataset.mk='pill'; vis('.xtrim').dataset.mk='trim'; vis('canvas.led').dataset.mk='meter'; vis('.xnm').dataset.mk='num'; vis('.pflb').dataset.mk='pfl'; },anna);
 await marks(p,[
  {n:1,el:'[data-mk=name]',at:'tl'},{n:2,el:'[data-mk=pill]',at:'b',dx:-20},{n:3,el:'[data-mk=trim]',at:'b',dx:-4},
  {n:4,el:'[data-mk=meter]',at:'l',dx:2,dy:-60},{n:5,el:'[data-mk=num]',at:'r'},{n:6,el:'[data-mk=pfl]',at:'l',dx:2}]);
 await p.waitForTimeout(200); await p.screenshot({path:'02-strip.png',clip:box});
 await p.context().close();
 // 3 plain pages
 for(const [v,f,sec] of [['arm','03-arm.png'],['meta','04-meta.png'],['names','05-names.png'],['inputs','06-inputs.png'],['routing','07-routing.png'],['timecode','08-timecode.png'],['setup','09-setup.png','meters']]){
   p=await open(b); if(sec) await p.evaluate(s=>{setupSec=s;},sec); await p.evaluate(v=>go(v),v); await p.waitForTimeout(1200);
   await p.evaluate(()=>{ [...document.querySelectorAll('main *')].forEach(e=>{ const t=(e.textContent||'').trim(); if(e.children.length<=3 && /^FADERS ON METERS/i.test(t)) (e.closest('button,.tile,label')||e).remove(); if(e.tagName==='P' && t.startsWith('Faders on meters')) e.remove(); }); });
   await p.waitForTimeout(200); await p.screenshot({path:f}); out.push(v+':'+p.errs.length); await p.context().close(); }
 // 4 phone
 p=await open(b,{w:390,h:844,phone:true}); await p.evaluate(()=>go('home')); await p.waitForTimeout(1500); await p.screenshot({path:'10-phone.png'}); out.push(p.errs); await p.context().close();
 console.log(names, out); await b.close();})();
