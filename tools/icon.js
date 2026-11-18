const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:512,height:512}});
const bars=[0.55,0.8,0.68,0.92,0.45];
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#0a0b0c"/>
${bars.map((h,i)=>{const x=86+i*72, top=430-h*330; let s='';for(let y=430;y>top;y-=26){const f=(430-y)/330; const c=f>0.8?'#ff4d4f':f>0.6?'#ffc93c':'#2fd27a'; s+=`<rect x="${x}" y="${y-20}" width="52" height="20" rx="3" fill="${c}"/>`;} return s;}).join('')}
<rect x="70" y="106" width="372" height="8" rx="4" fill="#7fb2e5"/>
</svg>`;
await p.setContent(`<html><body style="margin:0;background:#0a0b0c">${svg}</body></html>`);
for(const s of [512,192,180]){ await p.setViewportSize({width:s,height:s}); await p.evaluate(s=>{const e=document.querySelector('svg');e.setAttribute('width',s);e.setAttribute('height',s);},s); await p.screenshot({path:`public/icon-${s}.png`,clip:{x:0,y:0,width:s,height:s}}); }
await b.close();})();
