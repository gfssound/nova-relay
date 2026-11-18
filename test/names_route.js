const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch();
for (const f of [process.argv[2]]) { const p=await b.newPage(); await p.goto('file://'+path.resolve(f)); await p.waitForTimeout(500);
console.log(path.basename(f), JSON.stringify(await p.evaluate(() => {
  const sent=[]; const o=link.send.bind(link); link.send=m=>{ if(m.op==="SET"&&/name/.test(m.k)) sent.push(`${m.k}[${m.idx}]=${m.val}`); o(m); };
  const pr=get("trackmix.preset")-1; const before=get("track.name",[0]);
  for(let i=0;i<22;i++) set("trackmix.matrix",[pr,0,i],0);
  set("trackmix.matrix",[pr,0,0],1);   // Track 1 <- Analog 1 only
  return {before, after:get("track.name",[0]), analog1:get("input.name",[0]), sent};
}))); }
await b.close(); })();
