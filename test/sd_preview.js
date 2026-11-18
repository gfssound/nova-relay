const { chromium } = require('playwright'); const path = require('path');
const { DRAW, renderKey } = require(path.resolve('streamdeck/com.gfssound.novaremote.sdPlugin/bin/plugin.js'));
const names = ['MIX01','MIX02','BOOM01','LAV01','LAV02','LAV03','LAV04','LAV05','LAV06','LAV07','A1','A2','A3','A4','PLAYBACK','COMMS'];
const armed = [1,2,3,4,5,6,15,16];
const st = (o = {}) => ({ ok: true, recorder: 'nova', state: 'STOPPED', recording: false, tc: '18:17:38:13', elapsed: 0, scene: '401', take: '2', slate: '401/2', tone: false, hp: 1, hpName: 'MIX',
  armed, armedCount: armed.length, tracks: names.map((n, i) => ({ track: i + 1, name: n, armed: armed.includes(i + 1) })), slateMic: false, comMic: false, comKnown: true, pfl: [], faders: [], ...o });
const K = (s = {}) => ({ settings: s, msg: '' });
const row1 = [DRAW.rec(st(), K()), DRAW.stop(st(), K()), DRAW.tone(st(), K()), DRAW.slate(st(), K()), DRAW.com(st(), K())];
const row2 = [DRAW.rec(st({ recording: true, elapsed: 83 }), K()), DRAW.stop(st({ recording: true }), K()), DRAW.tone(st({ tone: true }), K()), DRAW.slate(st({ slateMic: true }), K()), DRAW.com(st({ comKnown: false }), K())];
const back = renderKey({ big: '←', bigMax: 48, bottom: 'Back', bottomColor: '#8a9097' });
const folder = [back, ...Array.from({ length: 14 }, (_, i) => DRAW.arm(st(), K({ track: String(i + 1) })))];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 860, height: 1120 } });
  const grid = (svgs, cols) => `<div style="display:grid;grid-template-columns:repeat(${cols},144px);gap:16px">${svgs.map(s => `<div>${s}</div>`).join('')}</div>`;
  await p.setContent(`<body style="margin:0;padding:20px;background:#000;color:#bbb;font:15px Helvetica,Arial">
    <div style="margin:0 0 10px">Main page: idle, then REC rolling, tone on, Slate held, Com not learned yet</div>${grid(row1, 5)}<div style="height:16px"></div>${grid(row2, 5)}
    <div style="margin:26px 0 10px">ARM folder on a 15-key Stream Deck (keys numbered themselves 1–14; Back is Stream Deck's own)</div>${grid(folder, 5)}</body>`);
  await p.screenshot({ path: 'test/sd-keys-v2.png' }); await b.close(); })();
