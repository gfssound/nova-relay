const fs=require('fs'); const N=require('../nova-remote/nova.js');
function load(f){ const st={TX:[],RX:[]}; for(const l of fs.readFileSync(f,'utf8').split('\n')){ const m=l.match(/^(\S+)\s+(TX|RX) (.*)$/); if(m) st[m[2]].push(...m[3].trim().split(/\s+/).map(x=>parseInt(x,16))); } return st; }
let ok=0,bad=0,rt=0,rtBad=0, kinds={};
for(const f of ['cap/tap1.log','cap/tap2.log','cap/tap3.log','cap/tap4.log']){
  const st=load(f);
  for(const dir of ['TX','RX']){
    const p=new N.Parser(m=>{ ok++;
      // frame round trip
      const fr=N.frame(m.cmd,m.data);
      if(m.cmd===0x55){ const d=N.decodeSetting(m.data); if(!d){bad++;return;} kinds[d.kind]=(kinds[d.kind]||0)+1;
        if(dir==='TX' && d.kind==='value'){ const e=N.encodeSetting({id:d.id,type:d.type,dims:d.dims,idx:d.idx,value:d.raw}); rt++; if(Buffer.compare(e,m.data)){rtBad++; console.log('mismatch',m.data.toString('hex'),e.toString('hex'));} } }
    });
    p.push(Buffer.from(st[dir]));
    if(dir==='TX') console.log(f,dir,'bad bytes',p.bad);
  }
}
console.log({ok,bad,rt,rtBad,kinds});
// frame check against a real TX hello
const hello=N.frame(0x20,Buffer.from('PCnovaT-0.92.03#01.01','latin1')); console.log(hello.toString('hex'));
