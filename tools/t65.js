const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:800}});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{
  // fake port that emits a few messages and one framing error
  const chunks=[new Uint8Array([0x02,0x53,0x45,0x54,0x20,0x37,0x36,0x0D]),new Uint8Array([0x02,0x4D,0x54,0x52,0x01,0x7F,0x33,0x0D]),'ERR',new Uint8Array([0x41,0x43,0x4B,0x0D,0x0A])];
  class R{constructor(){this.i=0}async read(){await new Promise(r=>setTimeout(r,60));if(this.i>=chunks.length)return new Promise(()=>{});const c=chunks[this.i++];if(c==='ERR'){const e=new Error('framing');e.name='FramingError';throw e;}return{value:c,done:false}}releaseLock(){}async cancel(){}}
  const port={readable:{getReader:()=>new R()},writable:{getWriter:()=>({write:async()=>{},releaseLock(){}})},open:async()=>{},close:async()=>{},getInfo:()=>({usbVendorId:0x0403,usbProductId:0x6001})};
  Object.defineProperty(navigator,'serial',{value:{requestPort:async()=>port,addEventListener(){}}});
});
await p.goto('file://'+process.cwd()+'/serialmon/nova-serial-monitor.html'); await p.waitForTimeout(200);
await p.click('#connect'); await p.waitForTimeout(700);
const r={status:await p.textContent('#statusText'),inB:await p.textContent('#sIn'),err:await p.textContent('#sErr'),text:await p.textContent('#sText'),lines:await p.locator('#log > div').allTextContents(),verdict:await p.textContent('#verdict')};
await p.click('#toggleSend'); await p.fill('#sendText','02 41 0d'); await p.click('#send'); r.tx=(await p.locator('#log > div').last().textContent());
await p.screenshot({path:'build/serialmon.png'});
console.log(JSON.stringify(r,null,1),errs);await b.close();})();
