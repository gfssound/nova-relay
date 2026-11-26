const {chromium}=require('playwright');
const URL='file://'+require('path').join(__dirname,'../../../build/cart-remote.html');
const LEVELS={0:-21,1:-30,14:-17,15:-24,16:-52,17:-20,18:-64,19:-27};
async function open(b,{w=1440,h=900,phone=false}={}){
  const ctx=await b.newContext(phone?{viewport:{width:w,height:h},deviceScaleFactor:3,isMobile:true,hasTouch:true}:{viewport:{width:w,height:h},deviceScaleFactor:2});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.errs=errs;
  await p.goto(URL); await p.waitForTimeout(600);
  await p.evaluate(()=>{ set('ui.exp.wireless',[],0); set('ui.exp.presets',[],0); set('ui.exp.warn',[],0); set('ui.meters.faders',[],0); });
  await p.waitForTimeout(700); await p.reload(); await p.waitForTimeout(700);
  await p.addStyleTag({content:`.brand small,#phoneBtn,#tabletBtn,.toast{display:none!important} #linkPill,#linkPill *{max-width:none!important;overflow:visible!important;text-overflow:clip!important}`});
  await p.evaluate((L)=>{
    const t0=sim.tick.bind(sim); sim.tick=function(t){ t0(t); for(let i=0;i<22;i++) this.inDb[i]= (i in L)? L[i]+ (Math.random()-.5)*0.6 : -92; };
    const lp=document.querySelector('#linkPill span'); if(lp) lp.textContent='Nova · 2 devices';
  }, LEVELS);
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(300);
  return p;
}
/* numbered callouts: items [{n, el: css or {text, within}, at:'l'|'r'|'t'|'b'|'tl'|'tr'|'c'}] */
async function marks(p, items){
  await p.evaluate((items)=>{
    document.querySelectorAll('.mk-callout').forEach(e=>e.remove());
    const find=it=>{ if(typeof it.el==='string') return document.querySelectorAll(it.el)[it.i||0];
      const scope=[...document.querySelectorAll(it.el.within||'*')]; return scope.find(e=>e.children.length<=it.el.kids && e.textContent.trim().toUpperCase().startsWith(it.el.text.toUpperCase()) && e.getBoundingClientRect().width>0); };
    for(const it of items){ const e=find(it); if(!e){ console.log('NOEL',it.n); continue; } const r=e.getBoundingClientRect(), s=26;
      let x=r.left-s-4, y=r.top+r.height/2-s/2;
      if(it.at==='r'){ x=r.right+4; } if(it.at==='t'){ x=r.left+r.width/2-s/2; y=r.top-s-4; } if(it.at==='b'){ x=r.left+r.width/2-s/2; y=r.bottom+4; }
      if(it.at==='tl'){ x=r.left-s/2+2; y=r.top-s/2+2; } if(it.at==='tr'){ x=r.right-s/2-2; y=r.top-s/2+2; } if(it.at==='c'){ x=r.left+r.width/2-s/2; y=r.top+r.height/2-s/2; }
      if(it.dx) x+=it.dx; if(it.dy) y+=it.dy;
      const m=document.createElement('div'); m.className='mk-callout'; m.textContent=it.n;
      Object.assign(m.style,{position:'fixed',left:x+'px',top:y+'px',width:s+'px',height:s+'px',borderRadius:'50%',background:'#ffd43b',color:'#111',font:'800 15px Barlow, sans-serif',display:'grid',placeItems:'center',boxShadow:'0 0 0 3px #111, 0 2px 8px #000a',zIndex:9999,pointerEvents:'none'});
      document.body.append(m); }
  }, items);
}
module.exports={open,marks,chromium};
