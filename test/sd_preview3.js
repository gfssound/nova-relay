const { chromium } = require('playwright'); const path = require('path');
const { DRAW } = require(path.resolve('streamdeck/com.gfssound.novaremote.sdPlugin/bin/plugin.js'));
const names = ['MIX01','MIX02','BOOM01','LAV01','LAV02','LAV03','LAV04','LAV05','LAV06','LAV07','A1','A2','A3','A4','PLAYBACK','COMMS'];
const armed = [3,4,5];
const st = { ok: true, recorder: 'nova', state: 'STOPPED', recording: false, tc: '18:17:38:13', elapsed: 0, scene: '075', take: '3', slate: '075/3', armed, armedCount: 3,
  tracks: names.map((n, i) => ({ track: i + 1, name: n, armed: armed.includes(i + 1) })), sceneNext: '075', takeNext: '4', noteNext: 'WILD', noteCurrent: '', noteTarget: 'next',
  notePresets: ['WILD','MOS','FALSE START','NG','PICKUP','ROOM TONE','SFX','BEST','SAFETY','CHECK'], lastTake: { seg: 77, scene: '075', take: '3', note: 'NG', length: 94 },
  receivers: [{ rx: 1, freq: '545.2', znetTrim: 26, tx: 'On' }, { rx: 2, freq: '564.9', znetTrim: 31, tx: 'Standby' }],
  inputs: Array.from({ length: 22 }, (_, i) => ({ input: i + 1, track: i === 14 ? 'BOOM01' : i === 15 ? 'LAV01' : '', trim: i === 14 ? 6 : 0, pageKnown: true })), page: 15,
  outs: Array.from({ length: 8 }, (_, o) => ({ out: o + 1, name: o === 2 ? 'BOOM IFB' : '', tone: false, slate: false, com1: o === 2, com2: false, routes: o === 4 ? [{ sx: 32, v: 1 }] : [] })),
  hp: 2, hpName: 'COMMS', slateMic: false, comMic: false, comKnown: true };
const K = s => ({ settings: s, msg: '' });
const meterK = K({ source: 't3' }); globalThis.meters = null;
const plugin = require(path.resolve('streamdeck/com.gfssound.novaremote.sdPlugin/bin/plugin.js'));
const keys = [
  DRAW.scene(st, K({ mode: 'number' })), DRAW.scene(st, K({ mode: 'letter' })), DRAW.take(st, K({ mode: 'up' })), DRAW.note(st, K({ preset: '1' })), DRAW.note(st, K({ preset: '4' })),
  DRAW.lasttake(st, K({})), DRAW.armset(st, K({ name: 'Interview', tracks: '3,4,5' })), DRAW.armset(st, K({ name: 'Walk & talk', tracks: '3,6,7' })), DRAW.rec({ ...st, armedCount: 0, armed: [] }, K({})), DRAW.rx(st, K({ rx: '1' })),
  DRAW.rx(st, K({ rx: '2' })), DRAW.page(st, K({ input: '15' })), DRAW.route(st, K({ out: '3', what: 'com1' })), DRAW.route(st, K({ out: '5', what: 'track-3' })), DRAW.jam(st, K({ mode: 'tc' })),
];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 860, height: 760 } });
  const strip = (t, v, ind) => `<div style="width:200px;height:100px;background:#111;border-radius:8px;padding:10px;box-sizing:border-box;color:#ddd;font:12px Helvetica"><div>${t}</div><div style="font:bold 22px Helvetica;margin:8px 0">${v}</div><div style="height:8px;background:#333;border-radius:4px"><div style="width:${ind}%;height:8px;background:#fff;border-radius:4px"></div></div></div>`;
  await p.setContent(`<body style="margin:0;padding:20px;background:#000;color:#bbb;font:15px Helvetica,Arial">
    <div style="display:grid;grid-template-columns:repeat(5,144px);gap:16px">${keys.map(s => `<div>${s}</div>`).join('')}</div>
    <div style="margin:22px 0 10px">Stream Deck + touch strip (Input trim dial, Headphones dial)</div>
    <div style="display:flex;gap:16px">${strip('TRIM · RX 1 · BOOM01', '+6 dB', 52)}${strip('HEADPHONES · 2', 'COMMS', 9)}</div></body>`);
  await p.screenshot({ path: 'test/sd-keys-v3.png' }); await b.close(); })();
