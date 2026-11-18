const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); await p.goto('file://'+path.resolve(process.argv[2])); await p.waitForTimeout(500);
console.log(JSON.stringify(await p.evaluate(() => {
  const pr=get("trackmix.preset")-1, feeds = t => { const o=[]; for(let i=0;i<22;i++) if(get("trackmix.matrix",[pr,t,i])>0) o.push(inLabel(i)); return o.join("+")||"-"; };
  const before = Array.from({length:8},(_,t)=>`T${t+1} ${get("track.name",[t])} <- ${feeds(t)}`);
  ["Mix","Boom1","Boom2","Jesus","Peter","John","Matthew"].forEach((n,t)=>set("track.name",[t],n));
  const rx = () => Array.from({length:4},(_,i)=>`RX${i+1}=${get("input.name",[14+i])}`).join(" ");
  const after = rx();
  // tester then routes Track 4 <- RX1 only, Track 5 <- RX2, 6 <- RX3, 7 <- RX4
  for(const [t,ch] of [[3,14],[4,15],[5,16],[6,17]]) for(let i=0;i<22;i++) set("trackmix.matrix",[pr,t,i], i===ch?1:0);
  return {before, afterRename: after, afterReroute: rx(), tracks: Array.from({length:7},(_,t)=>get("track.name",[t])).join(",")};
}), null, 1)); await b.close(); })();
