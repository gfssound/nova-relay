
"use strict";
/* ---------- Parameter schema (from the recorder's published settings table) ---------- */
const SCHEMA = [{"id":1,"n":"SAMPLE_RATE","t":"Menu","k":"sample.rate","m":["48000","48048","88200","96000"]},{"id":2,"n":"RECORD_PREROLL","t":"Number","k":"record.preroll","r":[0.0,10.0],"s":1,"u":"sec"},{"id":3,"n":"RECORD_TRACKS","t":"Menu","k":"record.tracks","d":[32],"m":["","X"]},{"id":4,"n":"TONE_LEVEL","t":"Number","k":"tone.level","r":[-20.0,-12.0],"s":2.0,"u":"dB"},{"id":5,"n":"TONE_ENABLE","t":"Menu","k":"tone.enable","m":["OFF","ON"]},{"id":6,"n":"HOME_METERS_COUNT","t":"Number","k":"home.meters.count","r":[8.0,20.0],"s":1},{"id":7,"n":"TRACK_NAME","t":"Text","k":"track.name","d":[16]},{"id":8,"n":"TRACK_COLOR","t":"Number","k":"track.color","d":[16],"r":[0.0,16777215.0],"s":1},{"id":9,"n":"TRACKMIX_PRESET","t":"Number","k":"trackmix.preset","r":[1.0,8.0],"s":1},{"id":10,"n":"TRACKMIX_NAMES","t":"Text","k":"trackmix.names","d":[8]},{"id":11,"n":"TRACKMIX_PHASE","t":"Menu","k":"trackmix.phase","m":["Normal","Invert"]},{"id":12,"n":"TRACKMIX_FADER","t":"Menu","k":"trackmix.fader","m":["Pre","Post"]},{"id":13,"n":"TRACKMIX_MATRIX","t":"Number","k":"trackmix.matrix","d":[8,16,22],"r":[0.0,7.0],"s":1},{"id":14,"n":"TRACKMIX_ISOMATRIX","t":"Number","k":"trackmix.isomatrix","d":[8,24],"r":[0.0,32767.0],"s":1},{"id":15,"n":"TRACKMIX_COMP","t":"Menu","k":"trackmix.comp","d":[8,16],"m":["OUT","IN"]},{"id":16,"n":"TRACKMIX_TONE","t":"Menu","k":"trackmix.tone","d":[8,16],"m":["","X"]},{"id":17,"n":"TRACKMIX_SLATE","t":"Menu","k":"trackmix.slate","d":[8,16],"m":["","X"]},{"id":18,"n":"TRACKMIX_NEVERCLIP","t":"Menu","k":"trackmix.neverclip","d":[8,16],"m":["","X"]},{"id":19,"n":"TRACKMIX_WHICH","t":"Menu","k":"trackmix.which","m":["TRACK 1","TRACK 2","TRACK 3","TRACK 4","TRACK 5","TRACK 6","TRACK 7","TRACK 8","TRACK 9","TRACK 10","TRACK 11","TRACK 12","TRACK 13","TRACK 14","TRACK 15","TRACK 16"]},{"id":20,"n":"OUTPUTMIX_PRESET","t":"Number","k":"outputmix.preset","r":[1.0,1.0],"s":1},{"id":21,"n":"OUTPUTMIX_NAMES","t":"Text","k":"outputmix.names","d":[1]},{"id":22,"n":"OUTPUTMIX_PHASE","t":"Menu","k":"outputmix.phase","m":["Normal","Invert"]},{"id":23,"n":"OUTPUTMIX_FADER","t":"Menu","k":"outputmix.fader","m":["Pre","Post"]},{"id":24,"n":"OUTPUTMIX_MATRIX","t":"Number","k":"outputmix.matrix","d":[1,8,50],"r":[0.0,7.0],"s":1},{"id":25,"n":"OUTPUTMIX_COMP","t":"Menu","k":"outputmix.comp","d":[1,8],"m":["OUT","IN"]},{"id":26,"n":"OUTPUTMIX_TONE","t":"Menu","k":"outputmix.tone","d":[1,8],"m":["","X"]},{"id":27,"n":"OUTPUTMIX_SLATE","t":"Menu","k":"outputmix.slate","d":[1,8],"m":["","X"]},{"id":28,"n":"OUTPUTMIX_COM1","t":"Menu","k":"outputmix.com1","d":[1,8],"m":["","X"]},{"id":29,"n":"OUTPUTMIX_COM2","t":"Menu","k":"outputmix.com2","d":[1,8],"m":["","X"]},{"id":30,"n":"OUTPUTMIX_TRK1","t":"Menu","k":"outputmix.trk1","d":[1,8],"m":["","X"]},{"id":31,"n":"OUTPUTMIX_TRK2","t":"Menu","k":"outputmix.trk2","d":[1,8],"m":["","X"]},{"id":32,"n":"OUTPUTMIX_NEVERCLIP","t":"Menu","k":"outputmix.neverclip","d":[1,8],"m":["","X"]},{"id":33,"n":"OUTPUTMIX_WHICH","t":"Menu","k":"outputmix.which","m":["OUT 1","OUT 2","OUT 3","OUT 4","OUT 5","OUT 6"]},{"id":34,"n":"OUTPUTMIX_PAN_FOLLOW","t":"Menu","k":"outputmix.pan.follow","m":["OFF","3-4","5-6","3-6"]},{"id":35,"n":"SOURCEROUTE_PHASE","t":"Menu","k":"sourceroute.phase","m":["Normal","Invert"]},{"id":36,"n":"SOURCEROUTE_FADER","t":"Menu","k":"sourceroute.fader","m":["Pre","Post"]},{"id":37,"n":"MIXER_BANK","t":"Menu","k":"mixer.bank","m":["Bank 1","Bank 2","Bank 3"]},{"id":38,"n":"MIXER_ENABLE","t":"Menu","k":"mixer.enable","d":[16],"m":["OFF","ON"]},{"id":39,"n":"MIXER_SOURCE","t":"Base","k":"mixer.source","d":[5,16]},{"id":40,"n":"OUTPUT_SOURCE","t":"Number","k":"output.source","d":[8],"r":[0.0,32.0],"s":1},{"id":41,"n":"HPMIX_PRESET","t":"Number","k":"hpmix.preset","r":[1.0,12.0],"s":1},{"id":42,"n":"HPMIX_NAMES","t":"Text","k":"hpmix.names","d":[12]},{"id":43,"n":"HPMIX_PHASE","t":"Menu","k":"hpmix.phase","m":["Normal","Invert"]},{"id":44,"n":"HPMIX_ENABLE","t":"Menu","k":"hpmix.enable","d":[12],"m":["OFF","ON"]},{"id":45,"n":"HPMIX_TRACKS","t":"Menu","k":"hpmix.tracks","d":[12,20],"m":["","L","R","LR","/L","/R","/LR","L/R","/L/R"]},{"id":46,"n":"HPMIX_OUTPUTS","t":"Menu","k":"hpmix.outputs","d":[12,8],"m":["","L","R","LR","/L","/R","/LR","L/R","/L/R"]},{"id":47,"n":"HPMIX_RETURNS","t":"Menu","k":"hpmix.returns","d":[12,2],"m":["","L","R","LR","/L","/R","/LR","L/R","/L/R"]},{"id":48,"n":"HPMIX_ZNET_SELECT","t":"Number","k":"hpmix.znet.select","d":[12],"r":[-1.0,5.0],"s":1},{"id":49,"n":"TAPEMIX_PHASE","t":"Menu","k":"tapemix.phase","m":["Normal","Invert"]},{"id":50,"n":"TAPEMIX_TRACKS","t":"Menu","k":"tapemix.tracks","d":[20],"m":["","X","/X"]},{"id":51,"n":"TAPEMIX_OUTPUTS","t":"Menu","k":"tapemix.outputs","d":[8],"m":["","X","/X"]},{"id":52,"n":"TAPEMIX_RETURNS","t":"Menu","k":"tapemix.returns","d":[2],"m":["","X","/X"]},{"id":53,"n":"MONOMIX_PHASE","t":"Menu","k":"monomix.phase","m":["Normal","Invert"]},{"id":54,"n":"MONOMIX_TRACKS","t":"Menu","k":"monomix.tracks","d":[20],"m":["","X","/X"]},{"id":55,"n":"MONOMIX_OUTPUTS","t":"Menu","k":"monomix.outputs","d":[8],"m":["","X","/X"]},{"id":56,"n":"MONOMIX_RETURNS","t":"Menu","k":"monomix.returns","d":[2],"m":["","X","/X"]},{"id":57,"n":"METADATA_CONTINUITY","t":"Menu","k":"metadata.continuity","m":["Approve","Allow"]},{"id":58,"n":"METADATA_HISTORY","t":"Table","k":"metadata.history","d":[10]},{"id":59,"n":"SCENE_CURRENT","t":"Text","k":"scene.current"},{"id":60,"n":"SCENE_NEXT","t":"Text","k":"scene.next"},{"id":61,"n":"SCENE_CONTINUITY","t":"Text","k":"scene.continuity"},{"id":62,"n":"TAKE_CURRENT","t":"Text","k":"take.current"},{"id":63,"n":"TAKE_NEXT","t":"Text","k":"take.next"},{"id":64,"n":"TAKE_CONTINUITY","t":"Text","k":"take.continuity"},{"id":65,"n":"NOTE_CURRENT","t":"Text","k":"note.current"},{"id":66,"n":"NOTE_NEXT","t":"Text","k":"note.next"},{"id":67,"n":"NOTE_PRESET","t":"Text","k":"note.preset","d":[10]},{"id":68,"n":"INPUT_CHANNEL","t":"Number","k":"input.channel","r":[1.0,22.0],"s":1},{"id":69,"n":"INPUT_WARNING","t":"Number","k":"input.warning","d":[22],"r":[0.0,1.0],"s":1},{"id":70,"n":"INPUT_LEVEL","t":"Menu","k":"input.level","d":[22],"m":["MIC","LINE"]},{"id":71,"n":"INPUT_POWER48V","t":"Menu","k":"input.power48V","d":[22],"m":["OFF","ON"]},{"id":72,"n":"INPUT_DELAY_ENABLE","t":"Menu","k":"input.delay.enable","d":[22],"m":["OFF","ON"]},{"id":73,"n":"INPUT_DELAY_TIME","t":"Number","k":"input.delay.time","d":[22],"r":[0.0,100.0],"s":0.1,"u":"ms"},{"id":74,"n":"INPUT_HPF_ENABLE","t":"Menu","k":"input.hpf.enable","d":[22],"m":["OFF","ON"]},{"id":75,"n":"INPUT_HPF_FREQ","t":"Number","k":"input.hpf.freq","d":[22],"r":[40.0,230.0],"s":10.0,"u":"Hz"},{"id":76,"n":"INPUT_TRIM_LEVEL","t":"Number","k":"input.trim.level","d":[22],"r":[-20.0,30.0],"s":1,"u":"dB"},{"id":77,"n":"INPUT_TRIM_MODE","t":"Menu","k":"input.trim.mode","d":[22],"m":["NOMAD","ZAXNET"]},{"id":78,"n":"INPUT_ZAXNET_ID","t":"Number","k":"input.zaxnet.id","d":[22],"r":[1.0,30.0],"s":1},{"id":79,"n":"INPUT_COMPRESS_ENABLE","t":"Menu","k":"input.compress.enable","d":[22],"m":["OFF","ON"]},{"id":80,"n":"INPUT_COMPRESS_ATTACK","t":"Number","k":"input.compress.attack","d":[3],"r":[1.0,100.0],"s":1,"u":"mS"},{"id":81,"n":"INPUT_COMPRESS_DECAY","t":"Number","k":"input.compress.decay","d":[3],"r":[1.0,100.0],"s":1,"u":"mS"},{"id":82,"n":"INPUT_COMPRESS_THRESH","t":"Number","k":"input.compress.thresh","d":[3],"r":[-20.0,0.0],"s":1,"u":"dB"},{"id":83,"n":"INPUT_COMPRESS_RATIO","t":"Number","k":"input.compress.ratio","d":[3],"r":[1.1,20.0],"s":0.1,"u":":1"},{"id":84,"n":"INPUT_COMPRESS_GAIN","t":"Number","k":"input.compress.gain","d":[3],"r":[-12.0,12.0],"s":1,"u":"dB"},{"id":85,"n":"INPUT_SOURCE","t":"Number","k":"input.source","d":[22],"r":[0.0,64.0],"s":1},{"id":86,"n":"INPUT_EQ","t":"Menu","k":"input.eq","d":[22],"m":["OFF","ON"]},{"id":87,"n":"INPUT_CL","t":"Menu","k":"input.cl","d":[22],"m":["OFF","ON"]},{"id":88,"n":"INPUT_HPF","t":"Menu","k":"input.hpf","d":[22],"m":["OFF","ON"]},{"id":89,"n":"INPUT_NTC1","t":"Menu","k":"input.ntc1","d":[22],"m":["OFF","ON"]},{"id":90,"n":"INPUT_NTC2","t":"Menu","k":"input.ntc2","d":[22],"m":["OFF","ON"]},{"id":91,"n":"INPUT_PHASE","t":"Menu","k":"input.phase","d":[22],"m":["Normal","Invert"]},{"id":92,"n":"INPUT_DLY","t":"Menu","k":"input.dly","d":[22],"m":["OFF","ON"]},{"id":93,"n":"INPUT_NAME","t":"Text","k":"input.name","d":[22]},{"id":94,"n":"INPUT_COLOR","t":"Number","k":"input.color","d":[22],"r":[0.0,16777215.0],"s":1},{"id":95,"n":"INPUT_NOTCH_ENABLE","t":"Menu","k":"input.notch.enable","d":[22,2],"m":["OFF","ON"]},{"id":96,"n":"INPUT_NOTCH_FREQ","t":"Number","k":"input.notch.freq","d":[22,2],"r":[20.0,15000.0],"s":1,"u":"Hz"},{"id":97,"n":"INPUT_NOTCH_Q","t":"Number","k":"input.notch.q","d":[22,2],"r":[0.1,5.0],"s":0.1},{"id":98,"n":"NAMES_CHARACTER_NAME","t":"Text","k":"names.character.name","d":[16]},{"id":99,"n":"NAMES_CHARACTER_COLOR","t":"Number","k":"names.character.color","d":[16],"r":[0.0,16777215.0],"s":1},{"id":100,"n":"NAMES_PRESET_NAME","t":"Text","k":"names.preset.name","d":[16]},{"id":101,"n":"NAMES_PRESET_COLOR","t":"Number","k":"names.preset.color","d":[16],"r":[0.0,16777215.0],"s":1},{"id":102,"n":"TIMECODE_OUT","t":"Menu","k":"timecode.out","m":["Disk","Generator"]},{"id":103,"n":"TIMECODE_DISPLAYED","t":"Menu","k":"timecode.displayed","m":["Disk","Generator"]},{"id":104,"n":"TIMECODE_FRAMERATE","t":"Menu","k":"timecode.framerate","m":["23.98","24","25","29.97NDF","29.97DF","30NDF","30DF"]},{"id":105,"n":"TIMECODE_INCUSERBITS","t":"Menu","k":"timecode.incuserbits","m":["OFF","ON"]},{"id":106,"n":"TIMECODE_RUNMODE","t":"Menu","k":"timecode.runmode","m":["Free Run","Rec-Run","C-Jam All","C-Jam TC","C-Jam UB"]},{"id":107,"n":"TIMECODE_AUTOJAM","t":"Menu","k":"timecode.autojam","m":["OFF","ON"]},{"id":108,"n":"TIMECODE_READER_TC","t":"Timecode","k":"timecode.reader.tc"},{"id":109,"n":"TIMECODE_READER_UB","t":"Userbits","k":"timecode.reader.ub"},{"id":110,"n":"TIMECODE_GENERATOR_TC","t":"Timecode","k":"timecode.generator.tc"},{"id":111,"n":"TIMECODE_GENERATOR_UB","t":"Userbits","k":"timecode.generator.ub"},{"id":112,"n":"MIRROR_DRIVE","t":"Menu","k":"mirror.drive","m":["Internal DVD","Firewire #1"]},{"id":113,"n":"MIRROR_FIREWIRE_POWER","t":"Menu","k":"mirror.firewire.power","m":["OFF","ON"]},{"id":114,"n":"MIRROR_FILETYPE","t":"Menu","k":"mirror.filetype","m":["Wav Mono","Wav Poly","Wav Mono F","Wav Poly F","ZAX File"]},{"id":115,"n":"MIRROR_RESOLUTION","t":"Menu","k":"mirror.resolution","m":["16 bits","24 bits"]},{"id":116,"n":"MIRROR_SRC","t":"Menu","k":"mirror.src","m":["Off","44100","47952","48000","48048","88200","96000","96096","192000"]},{"id":117,"n":"MIRROR_MODE","t":"Menu","k":"mirror.mode","m":["OFF","ON"]},{"id":118,"n":"MIRROR_STARTSEG","t":"Number","k":"mirror.startseg","r":[0.0,999.0],"s":1},{"id":119,"n":"MIRROR_ENDSEG","t":"Number","k":"mirror.endseg","r":[0.0,999.0],"s":1},{"id":120,"n":"MIRROR_TIMESTAMP","t":"Menu","k":"mirror.timestamp","m":["Pull Up","Pull Down"]},{"id":121,"n":"MIRROR_TRACKS","t":"Number","k":"mirror.tracks","d":[32],"r":[0.0,1.0],"s":1},{"id":122,"n":"SETUP_TRANSPORT","t":"Menu","k":"setup.transport","m":["Auto-load","Normal","T.C. Chase"]},{"id":123,"n":"SETUP_GPI1_REMOTEROLL","t":"Menu","k":"setup.gpi1.remoteroll","m":["Off","Rising Edge","Falling Edge"]},{"id":124,"n":"SETUP_SERIAL_REMOTEROLL","t":"Menu","k":"setup.serial.remoteroll","m":["Off","On"]},{"id":125,"n":"SETUP_SERIAL_MODE","t":"Menu","k":"setup.serial.mode","m":["RS-422","RS-232"]},{"id":126,"n":"SETUP_MASTER_MODE","t":"Menu","k":"setup.master.mode","m":["Off","Play Switches"]},{"id":127,"n":"SCRIPT_FILE","t":"Text","k":"script.file"},{"id":128,"n":"SCRIPT_SHOW_ACTIONS","t":"Menu","k":"script.show.actions","m":["OFF","ON"]},{"id":129,"n":"SCRIPT_EDIT_ENABLE","t":"Menu","k":"script.edit.enable","m":["OFF","ON"]},{"id":130,"n":"SCRIPT_SCROLL_STEP","t":"Menu","k":"script.scroll.step","m":["1/4","1/3","1/2","3/4","1"]},{"id":131,"n":"SCRIPT_FONT","t":"Menu","k":"script.font","m":["Normal","Medium","Large"]},{"id":132,"n":"STORE_CURRENT","t":"Text","k":"store.current"},{"id":133,"n":"STORE_SEGMENT","t":"Text","k":"store.segment"},{"id":134,"n":"STORE_FOLDER","t":"Text","k":"store.folder"},{"id":135,"n":"SERIAL_PORT","t":"SerialPort","k":"serial.port"},{"id":136,"n":"CAMERA_NAME","t":"Menu","k":"camera.name","m":["A","B","C","D","E","F","G"]},{"id":137,"n":"HOME_METERS_SOURCE","t":"Menu","k":"home.meters.source","m":["TRACKS","OUT"]},{"id":138,"n":"MP3RECORD_MODE","t":"Menu","k":"mp3record.mode","m":["Nomad Follow","Manual"]},{"id":139,"n":"WIRELESSRX_CENTERFREQ","t":"Number","k":"wirelessrx.centerfreq","r":[550.0,590.0],"s":1,"u":"MHz"},{"id":140,"n":"CONTROLLER_BACKLIGHT","t":"Number","k":"controller.backlight","r":[0.0,30.0],"s":1},{"id":141,"n":"NEVERCLIP_ATTENUATION","t":"Menu","k":"neverclip.attenuation","m":["OFF","-6dB","-12dB","-18dB","-24dB"]},{"id":142,"n":"BATTERY_STATUS","t":"Base","k":"battery.status"},{"id":143,"n":"DRIVE_TIME_REMAINING","t":"Base","k":"drive.time.remaining"},{"id":144,"n":"DRIVE_TIME_ELAPSED","t":"Base","k":"drive.time.elapsed"},{"id":145,"n":"STATUS_TEXT","t":"Base","k":"status.text"},{"id":146,"n":"METERS_METER_HOLD","t":"Number","k":"meters.meter.hold","r":[0.01,5.0],"s":0.01,"u":"s"},{"id":147,"n":"METERS_METER_DECAY","t":"Number","k":"meters.meter.decay","r":[0.01,5.0],"s":0.01,"u":"s"},{"id":148,"n":"METERS_PEAK_HOLD","t":"Number","k":"meters.peak.hold","r":[0.01,5.0],"s":0.01,"u":"s"},{"id":149,"n":"METERS_PEAK_DECAY","t":"Number","k":"meters.peak.decay","r":[0.01,5.0],"s":0.01,"u":"s"},{"id":150,"n":"PLAYER_CLIP","t":"Number","k":"player.clip","r":[0.0,13.0],"s":1},{"id":151,"n":"PLAYER_CLIPS","t":"Table","k":"player.clips","d":[14]},{"id":152,"n":"UI_UPDATE_PERIOD","t":"Number","k":"ui.update.period","r":[5.0,100.0],"s":1,"u":"ms"},{"id":153,"n":"INPUT_CONFIGURE","t":"Number","k":"input.configure","r":[1.0,22.0],"s":1},{"id":154,"n":"INPUT_COMPRESS_LINK","t":"Menu","k":"input.compress.link","d":[22],"m":["NONE","GROUP A","GROUP B","GROUP C"]},{"id":155,"n":"HPMIX2_PHASE","t":"Menu","k":"hpmix2.phase","m":["Normal","Invert"]},{"id":156,"n":"HPMIX2_TRACKS","t":"Menu","k":"hpmix2.tracks","d":[20],"m":["","L","R","LR","/L","/R","/LR","L/R","/L/R"]},{"id":157,"n":"HPMIX2_OUTPUTS","t":"Menu","k":"hpmix2.outputs","d":[8],"m":["","L","R","LR","/L","/R","/LR","L/R","/L/R"]},{"id":158,"n":"HPMIX2_RETURNS","t":"Menu","k":"hpmix2.returns","d":[2],"m":["","L","R","LR","/L","/R","/LR","L/R","/L/R"]},{"id":159,"n":"METERS_COUNT","t":"Number","k":"meters.count","r":[8.0,14.0],"s":1},{"id":160,"n":"METERS_SOURCE","t":"Number","k":"meters.source","d":[16],"r":[-1.0,22.0],"s":1},{"id":161,"n":"MP3_RECORD_FILE","t":"Table","k":"mp3.record.file"},{"id":162,"n":"MP3_RECORD_METADATA","t":"Table","k":"mp3.record.metadata"},{"id":163,"n":"FADERS_ZAXNET_ID","t":"Number","k":"faders.zaxnet.id","d":[5,16],"r":[1.0,30.0],"s":1},{"id":164,"n":"FADERS_MODE","t":"Menu","k":"faders.mode","d":[5,16],"m":["","T","Z"]}];
const S = {}; SCHEMA.forEach(s => S[s.k] = s);
/* Remote-only preferences: stored in this browser, never sent to the recorder. */
const LOCAL = [
  {id:0, n:"REFLINE_ENABLE", t:"Menu", k:"ui.refline.enable", m:["OFF","ON"], local:true},
  {id:0, n:"REFLINE_LEVEL", t:"Number", k:"ui.refline.level", r:[-60,0], s:1, u:"dB", local:true},
  {id:0, n:"COLOR_BANK", t:"Base", k:"ui.colorbank", local:true},
  {id:0, n:"OUT_PRESETS", t:"Base", k:"ui.outpresets", local:true},
  {id:0, n:"INPUT_LAYOUT", t:"Base", k:"ui.inlayout", local:true},
  {id:0, n:"TRACKMIX_MODE", t:"Base", k:"ui.tmxmode", local:true},
  {id:0, n:"COMP_FIX", t:"Base", k:"ui.compfix", local:true},
  {id:0, n:"TAKE_MODEL", t:"Base", k:"ui.takemodel", local:true},
  /* Com 1 per track: not in the recorder's 01.01 settings table, so it is kept in the remote for now. */
  {id:0, n:"HELP_TEXT", t:"Menu", k:"ui.helptext", m:["OFF","ON"], local:true},
  {id:0, n:"TRACK_COM1", t:"Menu", k:"ui.track.com1", d:[16], m:["","X"], local:true}];
LOCAL.forEach(s => S[s.k] = s);
const DEVICE_KEYS = new Set(["timecode.generator.tc","timecode.reader.tc","battery.status","drive.time.remaining","drive.time.elapsed","status.text"]);

/* ---------- Store ---------- */
function build(dims, f){ if(!dims || !dims.length) return f(); const [n,...rest] = dims; return Array.from({length:n}, () => build(rest, f)); }
function stepDec(s){ return s.s >= 1 ? 0 : (s.s >= 0.1 ? 1 : 2); }
function clampNum(s, v){
  if(!s.r) return +v || 0;
  v = Math.min(s.r[1], Math.max(s.r[0], +v || 0));
  v = Math.round((v - s.r[0]) / s.s) * s.s + s.r[0];
  return +v.toFixed(4);
}
function def(s){
  switch(s.t){
    case "Menu": return 0;
    case "Number": return clampNum(s, 0);
    case "Text": return "";
    case "Timecode": return 0;
    case "Userbits": return "00000000";
    default: return null;
  }
}
const V = {}; SCHEMA.forEach(s => V[s.k] = build(s.d, () => def(s)));
V["ui.refline.enable"] = 1; V["ui.refline.level"] = -18;
V["ui.track.com1"] = Array(16).fill(0);
V["ui.helptext"] = 0;
V["ui.colorbank"] = [0xe7a43c,0xd98b2b,0xe5484d,0xe56f8f,0xb07cd8,0x4aa3df,0x2fb8c4,0x46c28a,0xc9d94a,0x8fa3ad,0xe8e8e6,0x5c6b74];
function get(k, idx = []){ let a = V[k]; for(const i of idx){ if(a == null) return undefined; a = a[i]; } return a; }
function setRaw(k, idx, val){ if(!idx.length){ V[k] = val; return; } let a = V[k]; for(let j = 0; j < idx.length - 1; j++) a = a[idx[j]]; a[idx[idx.length-1]] = val; }
function normalize(s, v){
  if(s.t === "Menu"){ v = Math.round(+v || 0); return Math.max(0, Math.min(s.m.length - 1, v)); }
  if(s.t === "Number") return clampNum(s, v);
  if(s.t === "Text") return String(v ?? "").slice(0, 40);
  return v;
}

let viewBinds = [], globalBinds = [];
function prefixMatch(a, b){ const n = Math.min(a.length, b.length); for(let i = 0; i < n; i++) if(a[i] !== b[i]) return false; return true; }
function bind(k, idx, fn, global = false){ (global ? globalBinds : viewBinds).push({k, idx, fn}); fn(get(k, idx)); }
function notify(k, idx){ for(const list of [globalBinds, viewBinds]) for(const b of list) if(b.k === k && prefixMatch(b.idx, idx)) b.fn(get(k, b.idx)); }

function set(k, idx, val, origin = "ui"){
  const s = S[k]; if(!s) return;
  if(k === "record.tracks" && origin === "ui" && sim.state === "RECORDING"){
    log("ev", `Arm change blocked: track ${idx[0] + 1} stays ${get(k, idx) ? "armed" : "disarmed"} until recording stops`);
    flashLock(); return;
  }
  val = normalize(s, val);
  if(get(k, idx) === val) return;
  setRaw(k, idx, val); notify(k, idx);
  if(!DEVICE_KEYS.has(k)) saveSoon();
  if(origin === "ui" && !s.local) link.send({op:"SET", id:s.id, k, idx, val});
  else if(s.local && !PER_DEVICE.has(k) && origin !== "remote") net.send({t:"set", k, idx, val});
  linkColors(k, idx, val, origin);
}
/* Colors: a track fed by exactly one input always shares that input's color, in both directions.
   Mixed tracks (two or more inputs) keep their own color. */
function pairedInput(t){
  const p = Math.max(0, get("trackmix.preset") - 1); let found = null, n = 0;
  for(let i = 0; i < IN_COUNT; i++) if(get("trackmix.matrix", [p, t, i]) > 0){ n++; found = i; }
  return n === 1 ? found : null;
}
/* Names follow the same pairing as colors. On a routing change the input's name wins,
   unless the input has no name yet, in which case it takes the track's name. */
const LINKED = [["track.color", "input.color"], ["track.name", "input.name"]];
function syncAllColors(origin){
  for(let t = 0; t < 16; t++){
    const ch = pairedInput(t); if(ch == null) continue;
    set("track.color", [t], get("input.color", [ch]), origin);
    const iname = get("input.name", [ch]);
    if(iname) set("track.name", [t], iname, origin); else set("input.name", [ch], get("track.name", [t]), origin);
  }
}
let colorSyncing = false;
function linkColors(k, idx, val, origin){
  if(colorSyncing || !["track.color","input.color","track.name","input.name","trackmix.matrix","trackmix.preset"].includes(k)) return;
  colorSyncing = true;
  try{
    for(const [tk, ik] of LINKED){
      if(k !== tk && k !== ik) continue;
      let ch = null;
      if(k === tk){ ch = pairedInput(idx[0]); if(ch != null) set(ik, [ch], val, origin); }
      else ch = idx[0];
      if(ch != null) for(let t = 0; t < 16; t++) if(pairedInput(t) === ch) set(tk, [t], val, origin);
    }
    if(k === "trackmix.matrix" || k === "trackmix.preset") syncAllColors(origin);
  } finally { colorSyncing = false; }
}
const label = s => s.n.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const menuText = (k, idx = []) => { const s = S[k]; return s.m[get(k, idx)] ?? ""; };
const fmtNum = (s, v) => (+v).toFixed(stepDec(s));

/* ---------- Persistence (this browser only) ---------- */
const STORE_KEY = "cart-remote-state-v1";
let saveT = null;
function saveSoon(){ clearTimeout(saveT); saveT = setTimeout(() => {
  try{ const o = {}; for(const k in V) if(PER_DEVICE.has(k)) o[k] = V[k]; localStorage.setItem(STORE_KEY, JSON.stringify(o)); }catch(e){}
}, 400); }
function load(){ try{ const o = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if(!o) return false;
  for(const k in o) if(S[k] && (S[k].local ? o[k] != null : JSON.stringify(shape(o[k])) === JSON.stringify(shape(V[k])))) V[k] = o[k];
  return true; }catch(e){ return false; } }
function shape(v){ return Array.isArray(v) ? [v.length, shape(v[0])] : 0; }

/* ---------- Link layer ---------- */
const LOG = []; let logPaused = false; const logSubs = new Set();
const idxText = idx => idx.length ? "[" + idx.map(i => i + 1).join(",") + "]" : "";
function log(dir, text){
  if(logPaused) return;
  const d = new Date(); const t = d.toTimeString().slice(0,8) + "." + String(d.getMilliseconds()).padStart(3,"0");
  const e = {dir, line: `${t}  ${dir.toUpperCase().padEnd(3)} ${text}`};
  LOG.push(e); if(LOG.length > 600) LOG.shift();
  logSubs.forEach(f => f(e));
}
function describe(msg){
  if(msg.op === "SET"){ const s = S[msg.k]; let v = msg.val; if(s.t === "Menu") v = `${msg.val} (${s.m[msg.val] || "—"})`; else if(s.t === "Text") v = JSON.stringify(v); return `SET ${String(s.id).padStart(3)} ${s.n}${idxText(msg.idx)} = ${v}`; }
  if(msg.op === "CMD") return `CMD ${msg.name}`;
  return JSON.stringify(msg);
}
/* The real recorder link would replace SimLink with a serial or network transport that
   encodes the same {op,id,idx,val} messages in the recorder's wire format. */
const link = {
  mode: "cart",
  send(msg){
    log("tx", describe(msg));
    if(msg.op === "SET"){ const s = S[msg.k]; net.send({t:"set", k:msg.k, idx:msg.idx, val:msg.val, log:describe(msg), ack:`ACK ${String(s.id).padStart(3)} ${s.n}${idxText(msg.idx)}`}); }
    else if(msg.op === "CMD") net.send({t:"cmd", name:msg.name});
  },
  fromDevice(text){ log("rx", text); }
};

/* ---------- Connection to the cart computer ----------
   The cart computer holds the shared settings and runs the recorder link. Every device
   (this one, phones, iPads) sends its changes there and receives everyone else's. */
const PER_DEVICE = new Set(["ui.helptext", "ui.refline.enable", "ui.refline.level"]);
const cart = {urls:[], serial:null, ports:[], devices:1, ready:false};
const cartSubs = new Set();
const cartChanged = () => cartSubs.forEach(f => { try{ f(); }catch(e){} });
function deviceName(){
  const ua = navigator.userAgent;
  if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return "cart computer";
  if(/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iPad";
  if(/iPhone/.test(ua)) return "iPhone";
  if(/Android/.test(ua)) return "Android";
  if(/Mac/.test(ua)) return "Mac"; if(/Win/.test(ua)) return "Windows PC"; if(/Linux/.test(ua)) return "Linux PC";
  return "device";
}
function sharedSnapshot(){ const o = {}; for(const k in V) if(!PER_DEVICE.has(k) && !DEVICE_KEYS.has(k)) o[k] = V[k]; return o; }
function setCartStatus(on){
  const pill = $("linkPill"); if(!pill) return;
  pill.classList.toggle("off", !on);
  $("linkText").textContent = on ? `Cart \u00b7 ${cart.devices} device${cart.devices === 1 ? "" : "s"}` : "Reconnecting to cart\u2026";
}
let connectTimer = null;
const net = {
  ws:null, open:false,
  connect(){
    let ws;
    try{ ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws"); }catch(e){ setTimeout(() => this.connect(), 2000); return; }
    this.ws = ws;
    clearTimeout(connectTimer);
    connectTimer = setTimeout(() => { if(!cart.ready) $("connText").textContent = "Can't reach the cart computer. Check that Nova Remote is running there and that this device is on the same Wi-Fi."; }, 4000);
    ws.onopen = () => { this.open = true; ws.send(JSON.stringify({t:"hello", name:deviceName()})); };
    ws.onmessage = e => { let m; try{ m = JSON.parse(e.data); }catch(_){ return; } onCart(m); };
    ws.onclose = () => { const was = this.open; this.open = false; setCartStatus(false); if(was) log("er", "Lost the connection to the cart computer. Reconnecting\u2026"); setTimeout(() => this.connect(), 1500); };
    ws.onerror = () => {};
  },
  send(obj){ if(this.open && this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj)); }
};
function applyCartState(sv){
  for(const k in sv) if(S[k] && !PER_DEVICE.has(k)) V[k] = sv[k];
  for(const k in S) notify(k, []);
  go(current); renderTransport();
}
function onCart(m){
  switch(m.t){
    case "state":
      if(m.V) applyCartState(m.V); else net.send({t:"init", V:sharedSnapshot()});
      if(m.live) sim.live(m.live);
      cart.urls = m.urls || []; cart.serial = m.serial || null; cart.devices = m.devices || 1;
      if(!cart.ready){ cart.ready = true; $("connecting").hidden = true; log("ev", `Connected to the cart computer (Nova Remote ${m.version || ""}). Recorder: simulated.`); }
      setCartStatus(true); cartChanged();
      break;
    case "set": set(m.k, m.idx, m.val, "remote"); break;
    case "live": sim.live(m); break;
    case "log": log(m.dir, m.text); break;
    case "serial": cart.serial = m.serial; cartChanged(); break;
    case "ports": cart.ports = m.list || []; cartChanged(); break;
    case "devices": cart.devices = m.count || 1; setCartStatus(true); break;
  }
}
/* Keep phone and iPad screens awake while the remote is open. */
let wakeLock = null;
async function keepAwake(){ try{ if("wakeLock" in navigator && !wakeLock && document.visibilityState === "visible"){ wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => wakeLock = null); } }catch(e){} }
document.addEventListener("pointerdown", keepAwake, {once:true});
document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") keepAwake(); });

/* ---------- Simulated recorder ---------- */
const FPS = [{n:24,r:24000/1001,l:"23.98"},{n:24,r:24,l:"24"},{n:25,r:25,l:"25"},{n:30,r:30000/1001,l:"29.97 NDF"},{n:30,r:30000/1001,l:"29.97 DF",df:true},{n:30,r:30,l:"30 NDF"},{n:30,r:30,l:"30 DF",df:true}];
function framesToTC(f, fr){
  f = Math.floor(f); const n = fr.n;
  if(fr.df){ const D = Math.floor(f / 17982), M = f % 17982; f += 18 * D + 2 * Math.floor(Math.max(0, M - 2) / 1798); }
  const ff = f % n, ss = Math.floor(f / n) % 60, mm = Math.floor(f / (n * 60)) % 60, hh = Math.floor(f / (n * 3600)) % 24;
  const p = x => String(x).padStart(2, "0");
  return `${p(hh)}:${p(mm)}:${p(ss)}${fr.df ? ";" : ":"}${p(ff)}`;
}
const fmtDur = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s/3600), m = Math.floor(s/60)%60, x = s%60; return h ? `${h}:${String(m).padStart(2,"0")}:${String(x).padStart(2,"0")}` : `${m}:${String(x).padStart(2,"0")}`; };

/* The simulated recorder runs on the cart computer. This mirror follows its live updates
   (about 15 a second) and keeps the timecode moving smoothly in between. */
const sim = {
  state: "STOPPED", genFrames: 0, elapsed: 0, playStart: 0, playClip: null,
  inDb: new Float32Array(22).fill(-90), lastT: performance.now(),
  init(){ const now = new Date(); this.genFrames = (now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds()) * this.fr().r; },
  fr(){ return FPS[get("timecode.framerate")] || FPS[0]; },
  live(m){
    const was = this.state;
    this.state = m.state; this.genFrames = m.genFrames; this.elapsed = m.elapsed;
    for(let i = 0; i < 22; i++) this.inDb[i] = m.inDb && m.inDb[i] != null ? m.inDb[i] : -90;
    V["drive.time.remaining"] = m.drive; V["battery.status"] = {volts:m.volts};
    if(was !== this.state) renderTransport();
  },
  tick(t){
    const dt = Math.min(0.1, (t - this.lastT) / 1000); this.lastT = t;
    this.genFrames += dt * this.fr().r;
    if(this.state !== "STOPPED") this.elapsed += dt;
  }
};
/* Input layout: RX 1–8 (wireless), Analog 1–4, Return 1–2, AES 1–8 = all 22 of the recorder's input slots. */
const IN_COUNT = 22;
const INPUT_LABELS = [...Array.from({length:8}, (_, i) => `RX ${i + 1}`), ...Array.from({length:4}, (_, i) => `ANALOG ${i + 1}`), "RETURN 1", "RETURN 2", ...Array.from({length:8}, (_, i) => `AES ${i + 1}`)];
const inLabel = i => INPUT_LABELS[i] || `IN ${i + 1}`;
/* RX and AES inputs arrive as AES digital: no mic/line level and no 48 V. */
const isDigitalIn = i => i < 8 || i >= 14;
/* Only the analog inputs carry phantom power; returns have mic/line but no 48 V. */
const has48V = i => i >= 8 && i < 12;
const inFull = (i, v = get("input.name", [i])) => v ? `${inLabel(i)} \u00b7 ${v}` : inLabel(i);
const INPUT_ACTIVITY = [1,1,1,1,0,0,1,1, 2,2,0,0, 0,0, 0,0,0,0, 0,0,0,0]; // 2 = boom/plant (more room), 1 = lav, 0 = idle

const lin = db => Math.pow(10, db / 20), dbOf = l => l > 1e-6 ? 20 * Math.log10(l) : -120;
/* Route value 7 is treated as unity and each step below drops 3 dB; 0 is unrouted. */
function trackDb(t){
  if(get("tone.enable") && toneOn(t, "trackmix.tone")) return get("tone.level");
  if(sim.state === "PLAYING" && !sim.playClip) return -120;
  const p = get("trackmix.preset") - 1; let sum = 0;
  for(let i = 0; i < IN_COUNT; i++){ const v = get("trackmix.matrix", [p, t, i]); if(v > 0) sum += Math.pow(lin(sim.inDb[i]), 2); }
  return Math.min(0, dbOf(Math.sqrt(sum)));
}
function toneOn(t, key){ const p = Math.max(0, get("trackmix.preset") - 1); return key === "trackmix.tone" ? get(key, [p, t]) === 1 : true; }
function outDb(o){
  if(get("tone.enable") && get("outputmix.tone", [0, o]) === 1) return get("tone.level");
  let sum = 0;
  for(let t = 0; t < 16; t++) if(get("outputmix.matrix", [0, o, t]) > 0) sum += Math.pow(lin(trackDb(t)), 2);
  return Math.min(0, dbOf(Math.sqrt(sum)));
}
const sourceName = v => v === 0 || v > 16 ? (v > 16 ? `Input ${v - 16} (not routable)` : "Off") : v <= 16 ? `Track ${v} · ${get("track.name", [v-1]) || ""}` : `Input ${v - 16} · ${get("input.name", [v - 17]) || ""}`;

/* ---------- Seed: an example cart setup ---------- */
/* Lavs on RX 1–4 and 7–8, boom and plant on Analog 1–2; each feeds its own track, and all of them feed MIX L/R. */
function seedInputs(){
  const names = ["ANNA","MARCUS","DEV","RUTH","","","LAV 7","LAV 8","BOOM","PLANT"];
  const col = {0:0x46c28a, 1:0x4aa3df, 2:0xb07cd8, 3:0xe56f8f, 6:0x8fa3ad, 7:0x8fa3ad, 8:0xe7a43c, 9:0xd98b2b};
  for(let i = 0; i < 22; i++){
    const rx = i < 8, boom = i === 8 || i === 9, analog = i >= 8 && i < 12;
    V["input.name"][i] = names[i] || ""; V["input.color"][i] = col[i] ?? 0x5c6b74;
    V["input.level"][i] = analog ? 0 : 1; V["input.power48V"][i] = boom ? 1 : 0;
    V["input.hpf.enable"][i] = rx || boom ? 1 : 0; V["input.hpf.freq"][i] = boom ? 80 : 100;
    V["input.trim.level"][i] = boom ? 12 : 0; V["input.source"][i] = i + 1; V["input.zaxnet.id"][i] = 1;
    V["input.phase"][i] = 0; V["input.delay.enable"][i] = 0; V["input.delay.time"][i] = 0;
    V["input.notch.enable"][i] = [0, 0]; V["input.notch.freq"][i] = [60, 120]; V["input.notch.q"][i] = [1.0, 1.0];
    V["input.compress.link"][i] = boom ? 1 : rx ? 2 : 0; V["input.compress.enable"][i] = rx || boom ? 1 : 0;
  }
  V["input.compress.attack"] = [5, 3, 10]; V["input.compress.decay"] = [60, 40, 80];
  V["input.compress.thresh"] = [-6, -8, -4]; V["input.compress.ratio"] = [3, 4, 2]; V["input.compress.gain"] = [0, 2, 0];
  const feed = {2:8, 3:9, 4:0, 5:1, 6:2, 7:3, 8:6, 9:7}, mix = [0, 1, 2, 3, 6, 7, 8, 9];
  for(let p = 0; p < 8; p++) for(let t = 0; t < 16; t++) for(let i = 0; i < 22; i++){
    let v = 0;
    if(t < 2 && mix.includes(i)) v = p === 1 && i === 9 ? 0 : 2;
    if(feed[t] === i) v = 1;
    V["trackmix.matrix"][p][t][i] = v;
  }
}
function seed(){
  const cols = [0xe7a43c,0xd98b2b,0x46c28a,0x4aa3df,0xb07cd8,0xe56f8f,0x8fa3ad,0x8fa3ad];
  seedInputs();
  const trk = ["MIX L","MIX R","BOOM","PLANT","ANNA","MARCUS","DEV","RUTH","LAV 7","LAV 8","TRK 11","TRK 12","TRK 13","TRK 14","TRK 15","TRK 16"];
  trk.forEach((n, i) => { V["track.name"][i] = n; V["track.color"][i] = i < 2 ? 0xe7a43c : (cols[i-2] ?? 0x5c6b74); });
  V["trackmix.names"] = ["DIALOG","WALK & TALK","CAR RIG","WILD LINES","PRESET 5","PRESET 6","PRESET 7","PRESET 8"];
  for(let p = 0; p < 8; p++){ V["trackmix.tone"][p][0] = 1; V["trackmix.tone"][p][1] = 1; }
  V["trackmix.preset"] = 1;
  ["MIXER","BOOM OP","DIRECTOR","SCRIPT","CLIENT","CAM A","CAM B","UTILITY","PRESET 9","PRESET 10","PRESET 11","PRESET 12"].forEach((n, i) => V["hpmix.names"][i] = n);
  V["hpmix.enable"] = V["hpmix.enable"].map((_, i) => i < 6 ? 1 : 0);
  V["hpmix.tracks"][0][0] = 1; V["hpmix.tracks"][0][1] = 2;
  V["hpmix.tracks"][1][2] = 3; V["hpmix.returns"][1][0] = 1; V["hpmix.returns"][1][1] = 2;
  V["hpmix.tracks"][2][0] = 3; V["hpmix.tracks"][2][1] = 3;
  V["hpmix.tracks"][3][0] = 3; V["hpmix.tracks"][3][1] = 3;
  V["hpmix.tracks"][4][0] = 1; V["hpmix.tracks"][4][1] = 2;
  V["hpmix.preset"] = 1; V["hpmix.znet.select"] = V["hpmix.znet.select"].map(() => -1);
  V["output.source"] = [1, 2, 1, 2, 3, 0, 0, 0];
  V["outputmix.tone"][0] = [1,1,1,1,0,0,0,0];
  V["scene.current"] = "42A"; V["take.current"] = "2"; V["note.current"] = "";
  V["note.preset"] = ["WILD","MOS","FALSE START","NG","PICKUP","ROOM TONE","SFX","BEST","SAFETY","CHECK"];
  V["names.character.name"] = ["ANNA","MARCUS","DEV","RUTH","","","","","","","","","","","",""];
  V["record.tracks"] = V["record.tracks"].map((_, i) => i < 10 ? 1 : 0);
  V["home.meters.count"] = 12; V["home.meters.source"] = 0;
  V["meters.meter.hold"] = 0.3; V["meters.meter.decay"] = 1.2; V["meters.peak.hold"] = 1.5; V["meters.peak.decay"] = 2.5;
  V["tone.level"] = -18; V["record.preroll"] = 5; V["ui.update.period"] = 30; V["controller.backlight"] = 18;
  V["timecode.runmode"] = 0; V["timecode.displayed"] = 1; V["timecode.out"] = 1;
  V["input.channel"] = 1; V["input.configure"] = 1; V["meters.count"] = 12;
  V["wirelessrx.centerfreq"] = 570; V["trackmix.which"] = 0; V["outputmix.preset"] = 1;
  V["store.folder"] = "SHOOT DAY 14"; V["camera.name"] = 0;
  V["metadata.history"] = [
    {scene:"42A", take:"2", note:"BEST", start:"", startFrames:0, dur:94, tracks:10},
    {scene:"42A", take:"1", note:"FALSE START", start:"", startFrames:0, dur:12, tracks:10},
    {scene:"41", take:"6", note:"", start:"", startFrames:0, dur:131, tracks:10}, null,null,null,null,null,null,null];
}
function seedDevice(){
  V["drive.time.remaining"] = 7.6 * 3600; V["battery.status"] = {volts:14.6};
  V["status.text"] = "Ready";
  const fr = sim.fr(); let f = sim.genFrames;
  V["metadata.history"].forEach(h => { if(h && !h.start){ f -= (h.dur + 180) * fr.r; h.startFrames = f; h.start = framesToTC(f, fr); } });
}

/* ---------- DOM helpers ---------- */
function h(tag, props, ...kids){
  const el = document.createElement(tag);
  for(const [k, v] of Object.entries(props || {})){
    if(k === "class") el.className = v;
    else if(k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if(k === "style") el.style.cssText = v;
    else if(v === true) el.setAttribute(k, "");
    else if(v !== false && v != null) el.setAttribute(k, v);
  }
  for(const c of kids.flat(9)) if(c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const $ = id => document.getElementById(id);
const fid = (s, idx) => "f-" + s.k.replace(/\./g, "-") + (idx.length ? "-" + idx.join("-") : "");
const hex = n => "#" + (n >>> 0).toString(16).padStart(6, "0").slice(-6);
function holdRepeat(btn, fn){
  let t1, t2; const stop = () => { clearTimeout(t1); clearInterval(t2); };
  btn.addEventListener("pointerdown", e => { e.preventDefault(); fn(); t1 = setTimeout(() => t2 = setInterval(fn, 70), 380); });
  ["pointerup","pointerleave","pointercancel"].forEach(ev => btn.addEventListener(ev, stop));
  btn.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); fn(); } });
}

/* ---------- Controls, generated from the schema ---------- */
function ctl(k, idx = [], o = {}){
  const s = S[k];
  if(s.t === "Menu") return menuCtl(s, idx, o);
  if(s.t === "Number") return s.r && s.r[1] === 16777215 ? colorCtl(s, idx) : numCtl(s, idx, o);
  if(s.t === "Text") return textCtl(s, idx, o);
  return roCtl(s, idx);
}
function menuCtl(s, idx, o){
  const m = s.m;
  if(m.length === 2 && m[0] === ""){
    const b = h("button", {type:"button", class:"chip" + (o.red ? " red" : ""), "aria-pressed":"false", title:o.title || label(s), onclick:() => set(s.k, idx, get(s.k, idx) ? 0 : 1)}, o.label || m[1]);
    bind(s.k, idx, v => b.setAttribute("aria-pressed", v ? "true" : "false")); return b;
  }
  if(/^(off|on)$/i.test(m[0]) && m.length === 2 && /^on$/i.test(m[1]) && !o.seg){
    const b = h("button", {type:"button", class:"chip" + (o.red ? " red" : ""), "aria-pressed":"false", onclick:() => set(s.k, idx, get(s.k, idx) ? 0 : 1)}, o.label || "");
    bind(s.k, idx, v => { b.setAttribute("aria-pressed", v ? "true" : "false"); if(!o.label) b.textContent = v ? "ON" : "OFF"; }); return b;
  }
  if(m.length <= 5 && !o.select){
    const g = h("div", {class:"seg", role:"group", "aria-label":label(s)});
    m.forEach((opt, i) => g.append(h("button", {type:"button", class:"seg-b", onclick:() => set(s.k, idx, i)}, opt || "—")));
    bind(s.k, idx, v => [...g.children].forEach((b, i) => b.setAttribute("aria-pressed", i === v ? "true" : "false"))); return g;
  }
  const sel = h("select", {id:fid(s, idx), class:"sel", "aria-label":label(s), onchange:e => set(s.k, idx, +e.target.value)}, m.map((opt, i) => h("option", {value:i}, opt || "—")));
  bind(s.k, idx, v => { if(document.activeElement !== sel) sel.value = v; }); return sel;
}
function numCtl(s, idx, o){
  const out = h("output", {for:fid(s, idx)});
  const step = d => set(s.k, idx, get(s.k, idx) + d * s.s);
  const minus = h("button", {type:"button", "aria-label":"Decrease " + label(s)}, "−");
  const plus = h("button", {type:"button", "aria-label":"Increase " + label(s)}, "+");
  holdRepeat(minus, () => step(-1)); holdRepeat(plus, () => step(1));
  const fmt = o.fmt || (v => fmtNum(s, v) + (s.u ? " " + s.u : ""));
  if(o.compact){
    const w = h("div", {class:"num compact"}, minus, out, plus);
    bind(s.k, idx, v => out.textContent = fmt(v)); return w;
  }
  const r = h("input", {type:"range", id:fid(s, idx), min:s.r[0], max:s.r[1], step:s.s, "aria-label":label(s), oninput:e => set(s.k, idx, +e.target.value)});
  const w = h("div", {class:"num"}, minus, r, plus, out);
  bind(s.k, idx, v => { r.value = v; out.textContent = fmt(v); }); return w;
}
/* Color swatch: tap to open the color bank (saved colors), with a custom picker and Save to bank. */
const BANK_MAX = 16;
function colorCtl(s, idx){
  const fill = h("span", {class:"swfill"});
  const btn = h("button", {type:"button", class:"swbtn", id:fid(s, idx), "aria-label":label(s), "aria-haspopup":"dialog"}, fill);
  bind(s.k, idx, v => { fill.style.background = hex(v || 0); btn.title = hex(v || 0).toUpperCase(); });
  btn.addEventListener("click", e => { e.stopPropagation(); openPicker(btn, s.k, idx); });
  return btn;
}
function addToBank(c){
  const b = (get("ui.colorbank") || []).slice(); if(b.includes(c)) return false;
  b.push(c); while(b.length > BANK_MAX) b.shift(); set("ui.colorbank", [], b, "local"); return true;
}
let picker = null, pickerFor = null;
function closePicker(refocus){
  if(!picker) return; picker.remove(); picker = null;
  const f = pickerFor; pickerFor = null; if(refocus && f && f.isConnected) f.focus();
}
function openPicker(anchor, k, idx){
  if(pickerFor === anchor){ closePicker(true); return; }
  closePicker();
  const cur = () => get(k, idx) || 0;
  const grid = h("div", {class:"bankgrid"});
  const drawBank = () => grid.replaceChildren(...(get("ui.colorbank") || []).map(c => h("button", {type:"button", class:"bsw", style:`background:${hex(c)}`,
    "aria-label":"Use " + hex(c).toUpperCase(), "aria-pressed":c === cur() ? "true" : "false", onclick:() => { set(k, idx, c); closePicker(true); }})));
  drawBank();
  const custom = h("input", {type:"color", id:"picker-custom", value:hex(cur()), "aria-label":"Custom color",
    oninput:e => { set(k, idx, parseInt(e.target.value.slice(1), 16)); drawBank(); }});
  const note = h("span", {class:"hint"});
  const save = h("button", {type:"button", class:"btn", onclick:() => { note.textContent = addToBank(cur()) ? "Saved" : "Already in bank"; drawBank(); }}, "Save to Bank");
  picker = h("div", {class:"picker", role:"dialog", "aria-label":"Choose a color"},
    h("span", {class:"lbl"}, "Color Bank"), grid,
    h("div", {class:"flex"}, custom, h("label", {for:"picker-custom", class:"hint"}, "Custom"), save), note);
  picker.addEventListener("click", e => e.stopPropagation());
  document.body.append(picker); pickerFor = anchor;
  const r = anchor.getBoundingClientRect(), pw = picker.offsetWidth, ph = picker.offsetHeight;
  const x = Math.min(innerWidth - pw - 12, Math.max(12, r.left));
  let y = r.bottom + 6; if(y + ph > innerHeight - 12) y = Math.max(12, r.top - ph - 6);
  picker.style.left = x + "px"; picker.style.top = y + "px";
  const first = picker.querySelector('.bsw[aria-pressed="true"]') || picker.querySelector(".bsw"); if(first) first.focus();
}
document.addEventListener("click", () => closePicker());
document.addEventListener("keydown", e => {
  if(e.key !== "Escape") return;
  if(picker){ closePicker(true); return; }
  if(modal) closeModal();
});
/* ---------- Headphone solo (while a track pop-up is open) ----------
   The recorder's settings table has no solo setting, so this is sent as a command; its wire form is unconfirmed. */
let soloCh = null, refreshHp = () => {};
function setSolo(ch){
  if(ch === soloCh) return;
  soloCh = ch;
  link.send({op:"CMD", name:ch == null ? "HP SOLO OFF" : `HP SOLO INPUT ${ch + 1} (${inLabel(ch)})`});
  refreshHp();
}
/* ---------- Track pop-up: linked input meters and settings ---------- */
let modal = null;
function routedInputs(t){
  const p = Math.max(0, get("trackmix.preset") - 1), out = [];
  for(let i = 0; i < IN_COUNT; i++) if(get("trackmix.matrix", [p, t, i]) > 0) out.push(i);
  return out;
}
function closeModal(){
  if(!modal) return;
  closePicker();
  modal.el.remove();
  if(soloCh != null) setSolo(null);
  viewBinds = viewBinds.filter(b => !b.modal);
  frameHooks = frameHooks.filter(f => !f.modal);
  const back = modal.from; modal = null;
  if(back && back.isConnected) back.focus();
}
function modalMeter(id, dbFn){
  const mask = h("div", {class:"mask"}), ref = h("div", {class:"ref"}), pk = h("div", {class:"pk"}), val = h("span", {class:"mono"});
  const hk = dt => {
    const b = ballistic(id, dbFn(), dt);
    mask.style.width = ((1 - fpct(b.d)) * 100).toFixed(2) + "%";
    pk.style.left = `calc(${(fpct(b.p) * 100).toFixed(2)}% - 2px)`; pk.style.opacity = b.p > FLOOR ? 1 : 0;
    ref.hidden = !get("ui.refline.enable"); ref.style.left = `calc(${(fpct(get("ui.refline.level")) * 100).toFixed(2)}% - 1px)`;
    val.textContent = b.d <= FLOOR + 1 ? "\u2212\u221e" : (b.d > 0 ? "+" : "") + b.d.toFixed(0) + " dB";
  };
  hk.modal = true;
  const ticks = h("div", {class:"mticks", "aria-hidden":"true"}, TICKS.map(d => h("span", {style:`left:${(fpct(d) * 100).toFixed(2)}%;color:${d >= -20 ? tickColor(d) : "inherit"};transform:translateX(${d === 0 ? "-100%" : d === -60 ? "0" : "-50%"})`}, String(d))));
  return {hook:hk, val, el:h("div", {class:"stack", style:"gap:4px"}, h("div", {class:"mmeter", "aria-hidden":"true"}, mask, ref, pk), ticks)};
}
function inputQuick(ch){
  const m = modalMeter("mq" + ch, () => sim.inDb[ch]); m.hook.mdetail = true; frameHooks.push(m.hook);
  const nm = h("span", {class:"lbl"}); bind("input.name", [ch], v => nm.textContent = inFull(ch, v));
  return h("div", {class:"stack"},
    h("div", {class:"flex", style:"justify-content:space-between"}, nm, m.val),
    m.el,
    h("div", {class:"msettings"},
      row("Input name", h("div", {style:"flex:1;min-width:0"}, ctl("input.name", [ch], {aria:"Input name"}))),
      row("Color", colorCtl(S["input.color"], [ch])),
      ...(isDigitalIn(ch) ? [] : [row("Level", ctl("input.level", [ch]))]),
      ...(has48V(ch) ? [row("48 V", ctl("input.power48V", [ch], {red:true}))] : []),
      row("Phase", ctl("input.phase", [ch])),
      row("Trim", ctl("input.trim.level", [ch])),
      row("High-pass", ctl("input.hpf.enable", [ch])),
      row("HPF freq", ctl("input.hpf.freq", [ch])),
      row("Delay", ctl("input.delay.enable", [ch])),
      row("Delay time", ctl("input.delay.time", [ch])),
      row("Compressor", ctl("input.compress.enable", [ch]), ctl("input.compress.link", [ch], {select:true}))),
    h("div", null, h("button", {type:"button", class:"btn", onclick:() => { closeModal(); set("input.channel", [], ch + 1, "local"); go("inputs"); }}, "All settings for this input")));
}
function openTrackModal(t, from){
  closeModal(); closePicker();
  const before = viewBinds.length;
  const inputs = routedInputs(t);
  let sel = inputs.length ? inputs[0] : null;
  const title = h("h3", {id:"mtitle"}); bind("track.name", [t], v => title.textContent = `Track ${t + 1} \u00b7 ${v || "TRK " + (t + 1)}`);
  const closeBtn = h("button", {type:"button", class:"mclose", "aria-label":"Close", onclick:() => closeModal()}, "\u00d7");
  const trackMeter = modalMeter("mt" + t, () => trackDb(t)); frameHooks.push(trackMeter.hook);
  const list = h("div", {class:"minputs"});
  const soloNote = h("span", {class:"solonote", role:"status"});
  const detail = h("div", {class:"stack"});
  const drawDetail = () => {
    viewBinds = viewBinds.filter(b => !b.mdetail); frameHooks = frameHooks.filter(f => !f.mdetail);
    const b0 = viewBinds.length;
    detail.replaceChildren(sel == null
      ? h("div", {class:"stack"}, h("p", {class:"hint keep"}, "No inputs are routed to this track in the current preset."),
          h("div", null, h("button", {type:"button", class:"btn", onclick:() => { closeModal(); go("routing"); }}, "Open Routing")))
      : inputQuick(sel));
    viewBinds.slice(b0).forEach(b => { b.mdetail = true; b.modal = true; });
    [...list.children].forEach((c, i) => c.setAttribute("aria-pressed", inputs[i] === sel ? "true" : "false"));
    setSolo(sel);
    soloNote.textContent = sel == null ? "" : `\u25cf Soloed in headphones: ${inFull(sel)}`;
  };
  inputs.forEach(ch => {
    const nm = h("span"), bar = h("div");
    bind("input.name", [ch], v => nm.textContent = inFull(ch, v));
    const hk = dt => { const bl = ballistic("ml" + ch, sim.inDb[ch], dt); bar.style.transform = `scaleX(${fpct(bl.d).toFixed(3)})`; bar.style.background = bl.d > -10 ? COLORS["--rec"] : bl.d > -20 ? COLORS["--warn"] : COLORS["--ok"]; };
    hk.modal = true; frameHooks.push(hk);
    list.append(h("button", {type:"button", class:"minput", onclick:() => { sel = ch; drawDetail(); }}, nm, h("span", {class:"mbar"}, bar)));
  });
  const box = h("div", {class:"modal", role:"dialog", "aria-modal":"true", "aria-labelledby":"mtitle"},
    h("div", {class:"mhead"}, title, closeBtn),
    h("div", {class:"mrow"}, colorCtl(S["track.color"], [t]), h("div", {style:"flex:1;min-width:0"}, ctl("track.name", [t], {aria:"Track name"}))),
    h("div", {class:"flex", style:"justify-content:space-between"}, h("span", {class:"lbl"}, "Track level"), trackMeter.val),
    trackMeter.el,
    h("div", {class:"flex", style:"justify-content:space-between"}, h("span", {class:"lbl"}, inputs.length > 1 ? `Linked inputs \u00b7 ${inputs.length} \u00b7 tap one to solo it` : "Linked input"), soloNote),
    inputs.length ? list : null,
    detail);
  const back = h("div", {class:"modal-back"}, box);
  back.addEventListener("click", e => { if(e.target === back) closeModal(); });
  box.addEventListener("click", () => closePicker());
  document.body.append(back);
  viewBinds.slice(before).forEach(b => b.modal = true);
  modal = {el:back, from};
  drawDetail();
  closeBtn.focus();
}

/* ---------- Output pop-up: fast routing for one output ---------- */
function openOutputModal(o, from){
  closeModal(); closePicker();
  const before = viewBinds.length;
  const ROUTE = ["not routed", "pre-fade", "post-fade"];
  const meter = modalMeter("mo" + o, () => outDb(o)); frameHooks.push(meter.hook);
  const grid = h("div", {class:"orgrid"}, Array.from({length:16}, (_, t) => {
    const nm = h("span", {class:"onm"}), st = h("span", {class:"ost"}), sw = h("i");
    const b = h("button", {type:"button", class:"ocell", onclick:() => { const v = get("outputmix.matrix", [0, o, t]); set("outputmix.matrix", [0, o, t], v === 0 ? 1 : v === 1 ? 2 : 0); }},
      h("span", {class:"otop"}, h("span", null, String(t + 1).padStart(2, "0")), sw), nm, st);
    bind("track.name", [t], v => nm.textContent = v || `TRK ${t + 1}`);
    bind("track.color", [t], v => sw.style.background = hex(v || 0));
    bind("outputmix.matrix", [0, o, t], v => { const k = v === 0 ? 0 : v === 1 ? 1 : 2;
      b.className = "ocell" + (k === 1 ? " pre" : k === 2 ? " post" : ""); st.textContent = ["Off", "PRE", "POST"][k];
      b.setAttribute("aria-label", `Track ${t + 1} to OUT ${o + 1}: ${ROUTE[k]}`); });
    return b;
  }));
  const count = h("span", {class:"mono"});
  bind("outputmix.matrix", [0, o], r => { const n = r.slice(0, 16).filter(v => v > 0).length; count.textContent = `${n} track${n === 1 ? "" : "s"} routed`; });
  const adds = h("div", {class:"flex"}, [["outputmix.tone","Tone"],["outputmix.slate","Slate"],["outputmix.com1","Com 1"],["outputmix.com2","Com 2"]].map(([k, n]) => ctl(k, [0, o], {label:n})));
  const clear = h("button", {type:"button", class:"btn", onclick:() => { for(let t = 0; t < 16; t++) set("outputmix.matrix", [0, o, t], 0); }}, "Clear all");
  const closeBtn = h("button", {type:"button", class:"mclose", "aria-label":"Close", onclick:() => closeModal()}, "\u00d7");
  const box = h("div", {class:"modal", role:"dialog", "aria-modal":"true", "aria-labelledby":"mtitle"},
    h("div", {class:"mhead"}, h("h3", {id:"mtitle"}, `OUT ${o + 1}`), closeBtn),
    h("div", {class:"flex", style:"justify-content:space-between"}, h("span", {class:"lbl"}, "Output level"), meter.val),
    meter.el,
    h("div", {class:"flex"}, h("span", {class:"lbl"}, "Preset"), presetSelect(o)),
    h("div", {class:"flex", style:"justify-content:space-between"}, h("span", {class:"lbl"}, "Tracks \u00b7 tap for pre-fade, again for post-fade, again to remove"), count),
    grid,
    saveInline(o, o),
    h("div", {class:"flex", style:"justify-content:space-between"}, adds, h("div", {class:"flex"}, clear,
      h("button", {type:"button", class:"btn", onclick:() => { closeModal(); routeMode = "outputs"; try{ localStorage.setItem("cart-remote-route", "outputs"); }catch(e){} go("routing"); }}, "Full matrix"))));
  const back = h("div", {class:"modal-back"}, box);
  back.addEventListener("click", e => { if(e.target === back) closeModal(); });
  box.addEventListener("click", () => closePicker());
  document.body.append(back);
  viewBinds.slice(before).forEach(b => b.modal = true);
  modal = {el:back, from};
  closeBtn.focus();
}

/* ---------- Output presets: one output's routed tracks with their type (pre/post),
   plus its Tone, Slate, Com 1 and Com 2. Any output can load any preset. Saved in this browser. ---------- */
const OUT_ADDS = ["outputmix.tone", "outputmix.slate", "outputmix.com1", "outputmix.com2"];
const OUT_ADD_NAMES = ["Tone", "Slate", "Com 1", "Com 2"];
const rowOf = o => Array.from({length:16}, (_, t) => get("outputmix.matrix", [0, o, t]));
const addsOf = o => OUT_ADDS.map(k => get(k, [0, o]) ? 1 : 0);
const snapOf = o => ({r:rowOf(o), a:addsOf(o)});
const presetAdds = p => Array.isArray(p.a) ? p.a : [0, 0, 0, 0];
function applyPreset(o, p){
  for(let t = 0; t < 16; t++) set("outputmix.matrix", [0, o, t], p.r[t] ?? 0);
  const a = presetAdds(p); OUT_ADDS.forEach((k, j) => set(k, [0, o], a[j] ? 1 : 0));
}
const presetsList = () => { const ps = get("ui.outpresets"); return Array.isArray(ps) ? ps.filter(p => p && Array.isArray(p.r)) : []; };
const sameAs = (p, o) => JSON.stringify(p.r) === JSON.stringify(rowOf(o)) && JSON.stringify(presetAdds(p)) === JSON.stringify(addsOf(o));
const matchPreset = o => presetsList().findIndex(p => sameAs(p, o));
function rowSummary(r){
  const pre = r.filter(v => v === 1).length, post = r.filter(v => v >= 2).length;
  if(!pre && !post) return "No tracks";
  return [pre ? `${pre} pre` : "", post ? `${post} post` : ""].filter(Boolean).join(" \u00b7 ");
}
const addsText = a => OUT_ADD_NAMES.filter((_, j) => a[j]).join(", ");
function rowTracks(r){ return r.map((v, t) => v ? `${get("track.name", [t]) || "TRK " + (t + 1)}${v >= 2 ? " (post)" : ""}` : null).filter(Boolean).join(", ") || "\u2014"; }
let toastT = null;
function toast(msg, undo){
  let t = document.querySelector(".toast");
  if(!t){ t = h("div", {class:"toast", role:"status"}); document.body.append(t); }
  t.replaceChildren(...[h("span", null, msg), undo ? h("button", {type:"button", class:"btn small", onclick:() => { undo(); t.hidden = true; }}, "Undo") : null].filter(Boolean));
  t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, undo ? 5000 : 2200);
}
function savePresetFrom(o, rawName){
  const name = (rawName || "").trim().toUpperCase() || `OUT ${o + 1} PRESET`;
  const ps = presetsList(), at = ps.findIndex(p => p.name === name), entry = {name, ...snapOf(o)};
  if(at >= 0){ const old = ps[at]; ps[at] = entry; set("ui.outpresets", [], ps, "local");
    toast(`Updated ${name}`, () => { const p3 = presetsList(); p3[at] = old; set("ui.outpresets", [], p3, "local"); }); }
  else { ps.push(entry); set("ui.outpresets", [], ps, "local"); toast(`Saved ${name}`); }
}
function presetSelect(o){
  const sel = h("select", {class:"sel opsel", id:`f-outpreset-${o}`, "aria-label":`Preset for OUT ${o + 1}`,
    onchange:e => { const i = +e.target.value, pr = presetsList()[i]; if(!pr) return;
      const prev = snapOf(o); applyPreset(o, pr); toast(`OUT ${o + 1} \u2190 ${pr.name}`, () => applyPreset(o, prev)); }});
  const fill = () => {
    const ps = presetsList(), m = matchPreset(o), any = rowOf(o).some(v => v) || addsOf(o).some(v => v);
    sel.replaceChildren(...(m < 0 ? [h("option", {value:-1}, any ? "Custom" : "None")] : []), ...ps.map((p, i) => h("option", {value:i}, p.name)));
    sel.value = String(m);
  };
  bind("ui.outpresets", [], fill); bind("outputmix.matrix", [0, o], fill); OUT_ADDS.forEach(k => bind(k, [0, o], fill));
  return sel;
}
function saveInline(o, fixed){
  const pick = fixed == null ? h("select", {class:"sel", id:"op-from", "aria-label":"Output to save from"}, Array.from({length:8}, (_, k) => h("option", {value:k}, `OUT ${k + 1}`))) : null;
  const name = h("input", {type:"text", class:"txt", id:fixed == null ? "op-name" : `op-name-${o}`, placeholder:"Preset name", maxlength:24, autocomplete:"off", style:"max-width:220px"});
  const go2 = () => { savePresetFrom(fixed == null ? +pick.value : fixed, name.value); name.value = ""; };
  name.addEventListener("keydown", e => { if(e.key === "Enter") go2(); });
  return h("div", {class:"flex"}, pick, name, h("button", {type:"button", class:"btn primary", onclick:go2}, fixed == null ? "Save as preset" : `Save OUT ${o + 1} as preset`));
}
function updatePreset(i, fn){
  const ps = presetsList(), p0 = ps[i]; if(!p0) return;
  const p1 = {name:p0.name, r:p0.r.slice(0, 16), a:presetAdds(p0).slice()}; fn(p1); ps[i] = p1;
  set("ui.outpresets", [], ps, "local");
}
function presetEditor(){
  const ROUTE = ["not routed", "pre-fade", "post-fade"];
  const list = h("div", {class:"pedlist"});
  const draw = () => {
    const ps = presetsList();
    list.replaceChildren(...(ps.length ? ps.map((pr, i) => {
      const nm = h("input", {type:"text", class:"txt pename", id:`pe-name-${i}`, value:pr.name, maxlength:24, autocomplete:"off", "aria-label":"Preset name",
        onkeydown:e => { if(e.key === "Enter") e.target.blur(); },
        onchange:e => { const v = e.target.value.trim().toUpperCase();
          if(!v){ e.target.value = pr.name; return; }
          if(presetsList().some((q, k) => k !== i && q.name === v)){ toast(`There's already a preset called ${v}`); e.target.value = pr.name; return; }
          updatePreset(i, q => q.name = v); }});
      const cells = h("div", {class:"orgrid pe"}, Array.from({length:16}, (_, t) => {
        const v = pr.r[t] || 0, k = v === 0 ? 0 : v === 1 ? 1 : 2;
        return h("button", {type:"button", class:"ocell" + (k === 1 ? " pre" : k === 2 ? " post" : ""), "aria-label":`${pr.name}, track ${t + 1}: ${ROUTE[k]}`,
            onclick:() => updatePreset(i, q => { q.r[t] = k === 0 ? 1 : k === 1 ? 2 : 0; })},
          h("span", {class:"otop"}, h("span", null, String(t + 1).padStart(2, "0")), h("i", {style:`background:${hex(get("track.color", [t]) || 0)}`})),
          h("span", {class:"onm"}, get("track.name", [t]) || `TRK ${t + 1}`), h("span", {class:"ost"}, ["Off", "PRE", "POST"][k]));
      }));
      const adds = h("div", {class:"flex"}, OUT_ADD_NAMES.map((n, j) => h("button", {type:"button", class:"chip", "aria-pressed":presetAdds(pr)[j] ? "true" : "false",
        onclick:() => updatePreset(i, q => { q.a[j] = q.a[j] ? 0 : 1; })}, n)));
      const used = Array.from({length:8}, (_, o) => o).filter(o => sameAs(pr, o)).map(o => `OUT ${o + 1}`);
      const load = h("select", {class:"sel", id:`pe-load-${i}`, "aria-label":`Load ${pr.name} on an output`,
        onchange:e => { const o = +e.target.value; e.target.value = "-1"; if(o < 0) return; const prev = snapOf(o); applyPreset(o, pr); toast(`OUT ${o + 1} \u2190 ${pr.name}`, () => applyPreset(o, prev)); }},
        h("option", {value:-1}, "Load on\u2026"), Array.from({length:8}, (_, o) => h("option", {value:o}, `OUT ${o + 1}`)));
      const del = h("button", {type:"button", class:"bxs", "aria-label":`Delete ${pr.name}`,
        onclick:() => { const ps2 = presetsList(); const [gone] = ps2.splice(i, 1); set("ui.outpresets", [], ps2, "local");
          toast(`Deleted ${gone.name}`, () => { const p3 = presetsList(); p3.splice(i, 0, gone); set("ui.outpresets", [], p3, "local"); }); }}, "\u00d7");
      return h("div", {class:"panel ped"},
        h("div", {class:"mrow"}, h("div", {style:"flex:1;min-width:0"}, nm), h("span", {class:"opsum"}, rowSummary(pr.r)), load, del),
        cells,
        h("div", {class:"flex", style:"justify-content:space-between"}, adds, h("span", {class:"opused"}, used.length ? "In use on " + used.join(", ") : "Not in use")));
    }) : [h("p", {class:"hint keep"}, "No presets yet. Add a blank one or save an output's routing.")]));
  };
  bind("ui.outpresets", [], draw); bind("outputmix.matrix", [], draw); OUT_ADDS.forEach(k => bind(k, [], draw));
  bind("track.name", [], draw); bind("track.color", [], draw);
  const newName = h("input", {type:"text", class:"txt", id:"pe-new-name", placeholder:"New preset name", maxlength:24, autocomplete:"off", style:"max-width:260px"});
  const create = () => {
    const ps = presetsList(); let name = newName.value.trim().toUpperCase();
    if(!name){ let n = ps.length + 1; do { name = `PRESET ${n++}`; } while(ps.some(q => q.name === name)); }
    if(ps.some(q => q.name === name)){ toast(`There's already a preset called ${name}`); return; }
    ps.push({name, r:Array(16).fill(0), a:[0, 0, 0, 0]}); set("ui.outpresets", [], ps, "local"); newName.value = ""; toast(`Added ${name}`);
  };
  newName.addEventListener("keydown", e => { if(e.key === "Enter") create(); });
  const blank = h("div", {class:"flex"}, newName, h("button", {type:"button", class:"btn primary", onclick:create}, "Create Preset"));
  return h("div", {class:"stack"},
    h("p", {class:"hint"}, "Each preset holds one output's routed tracks (tap a track for pre-fade, again for post-fade, again to remove) and its Tone, Slate and Com. New presets start empty; set their tracks below. Edits change the preset only; load it on an output to use it. Presets are saved in this browser."),
    blank,
    list);
}

function openPresetsModal(from){
  closeModal(); closePicker();
  const before = viewBinds.length;
  const closeBtn = h("button", {type:"button", class:"mclose", "aria-label":"Close", onclick:() => closeModal()}, "\u00d7");
  const box = h("div", {class:"modal wide", role:"dialog", "aria-modal":"true", "aria-labelledby":"mtitle"},
    h("div", {class:"mhead"}, h("h3", {id:"mtitle"}, "Output Presets"), closeBtn),
    presetEditor());
  const back = h("div", {class:"modal-back"}, box);
  back.addEventListener("click", e => { if(e.target === back) closeModal(); });
  box.addEventListener("click", () => closePicker());
  document.body.append(back);
  viewBinds.slice(before).forEach(b => b.modal = true);
  modal = {el:back, from};
  closeBtn.focus();
}

/* ---------- Headphone routing (one mix at a time, like the output pop-up) ----------
   Recorder values: 0 off, 1 L, 2 R, 3 LR, 4 /L, 5 /R, 6 /LR, 7 L/R, 8 /L/R ("/" = polarity flipped). */
let hpBus2 = false;
const HP_COUNT = 10; /* headphone presets shown; the recorder's table has 12, 11–12 unused */
const HP_NEXT = {0:3, 3:1, 1:2, 2:0};
function hpCycle(k, idx){ const v = get(k, idx); const inv = v >= 4 && v <= 6, base = inv ? v - 3 : v >= 7 ? 0 : v, nb = HP_NEXT[base] ?? 0; set(k, idx, nb === 0 ? 0 : inv ? nb + 3 : nb); }
function hpFlip(k, idx){ const v = get(k, idx); if(v >= 1 && v <= 3) set(k, idx, v + 3); else if(v >= 4 && v <= 6) set(k, idx, v - 3); }
function hpButton(k, idx, title, sub, swatch){
  const M = S["hpmix.tracks"].m;
  const st = h("span", {class:"ost"}), sw = h("i");
  const b = h("button", {type:"button", class:"ocell"}, h("span", {class:"otop"}, h("span", null, sub), swatch ? sw : null), h("span", {class:"onm"}, title), st);
  if(swatch) swatch(sw);
  let lp = null, longed = false;
  b.addEventListener("pointerdown", () => { longed = false; lp = setTimeout(() => { longed = true; hpFlip(k, idx); }, 500); });
  ["pointerup","pointerleave","pointercancel"].forEach(ev => b.addEventListener(ev, () => clearTimeout(lp)));
  b.addEventListener("contextmenu", e => { e.preventDefault(); if(!longed) hpFlip(k, idx); });
  b.addEventListener("click", () => { if(!longed) hpCycle(k, idx); });
  bind(k, idx, v => { const inv = (v >= 4 && v <= 6) || v === 8;
    const side = (v === 1 || v === 4) ? " hl" : (v === 2 || v === 5) ? " hr" : (v === 3 || v === 6) ? " hlr" : v ? " hsplit" : "";
    b.className = "ocell" + side + (inv ? " flip" : ""); st.textContent = v ? M[v] : "Off";
    b.setAttribute("aria-label", `${title}: ${v ? M[v] + (inv ? ", polarity flipped" : "") : "off"}`); });
  return b;
}
function hpPanel(p){
  const bus = p == null;
  const K = name => bus ? "hpmix2." + name : "hpmix." + name;
  const I = j => bus ? [j] : [p, j];
  const tracks = h("div", {class:"orgrid"}, Array.from({length:16}, (_, t) => {
    const b = hpButton(K("tracks"), I(t), get("track.name", [t]) || `TRK ${t + 1}`, String(t + 1).padStart(2, "0"), sw => bind("track.color", [t], v => sw.style.background = hex(v || 0)));
    return b;
  }));
  const extras = h("div", {class:"orgrid x10"},
    [0, 1].map(j => hpButton(K("returns"), I(j), `RTN ${j + 1}`, "Return")),
    Array.from({length:8}, (_, o) => hpButton(K("outputs"), I(o), `OUT ${o + 1}`, "Output")));
  const count = h("span", {class:"mono"});
  const recount = () => { const n = [...Array(16).keys()].filter(t => get(K("tracks"), I(t)) > 0).length + [0, 1].filter(j => get(K("returns"), I(j)) > 0).length + [...Array(8).keys()].filter(o => get(K("outputs"), I(o)) > 0).length;
    count.textContent = `${n} source${n === 1 ? "" : "s"} routed`; };
  ["tracks","returns","outputs"].forEach(n => bind(K(n), bus ? [] : [p], recount));
  const clear = h("button", {type:"button", class:"btn", onclick:() => {
    for(let t = 0; t < 16; t++) set(K("tracks"), I(t), 0); for(let j = 0; j < 2; j++) set(K("returns"), I(j), 0); for(let o = 0; o < 8; o++) set(K("outputs"), I(o), 0); }}, "Clear all");
  const head = bus
    ? h("div", {class:"flex"}, h("b", {class:"hpbig"}, "BUS 2"), h("span", {class:"hint help"}, "The recorder's second headphone bus."))
    : h("div", {class:"flex"}, h("div", {style:"flex:1 1 220px;min-width:0;max-width:320px"}, ctl("hpmix.names", [p], {aria:"Headphone mix name"})), ctl("hpmix.enable", [p]));
  return h("div", {class:"stack"},
    head,
    h("div", {class:"flex", style:"justify-content:space-between"}, h("span", {class:"lbl"}, "Tracks \u00b7 tap for both ears (LR), again for L, again for R, again to remove \u00b7 long-press flips polarity"), count),
    h("div", {class:"hplegend", "aria-hidden":"true"}, h("span", {class:"hlr"}, "LR both ears"), h("span", {class:"hl"}, "L left"), h("span", {class:"hr"}, "R right"), h("span", {class:"flip"}, "/ polarity flipped")),
    tracks,
    h("span", {class:"lbl"}, "Returns & outputs"),
    extras,
    h("div", null, clear));
}

/* ---------- Next-take pop-up (from the Scene / Take / Note tiles) ---------- */
/* Scene numbering: "42A" -> next number "43", next letter "42B"; "42" -> "42A"; a Z rolls on to ZA. */
function sceneParts(sc){ const m = String(sc || "").trim().toUpperCase().match(/^(.*?)(\d+)([A-Z]*)$/); return m ? {pre:m[1], num:+m[2], let:m[3]} : null; }
function sceneNextNumber(sc){ const p = sceneParts(sc); return p ? `${p.pre}${p.num + 1}` : null; }
function sceneNextLetter(sc){
  const p = sceneParts(sc); if(!p) return null;
  if(!p.let) return `${p.pre}${p.num}A`;
  const last = p.let.slice(-1), head = p.let.slice(0, -1);
  return `${p.pre}${p.num}${last === "Z" ? p.let + "A" : head + String.fromCharCode(last.charCodeAt(0) + 1)}`;
}
function setNextScene(v){ set("scene.next", [], v); set("take.next", [], ""); }
function sceneButtons(){
  const base = () => get("scene.next") || get("scene.current");
  const go2 = fn => () => { const v = fn(base()); if(v) setNextScene(v); else toast(`Can't work out the next scene from "${base() || "nothing"}". Type it instead.`); };
  return h("div", {class:"flex"},
    h("button", {type:"button", class:"btn", onclick:go2(sceneNextNumber)}, "Next Scene #"),
    h("button", {type:"button", class:"btn", onclick:go2(sceneNextLetter)}, "Next Scene Letter"));
}
function nextTakeGuess(){
  if(get("scene.next") && get("scene.next") !== get("scene.current")) return "1";
  const t = get("take.current"), m = String(t || "").match(/^(\d+)/); return m ? String(+m[1] + 1) : (t || "1");
}
/* While recording, the Scene / Take tiles edit the take being recorded. */
function openCurrentTakeModal(focus, from){
  closeModal(); closePicker();
  const before = viewBinds.length;
  const closeBtn = h("button", {type:"button", class:"mclose", "aria-label":"Close", onclick:() => closeModal()}, "\u00d7");
  const scene = ctl("scene.current", [], {aria:"Current scene"});
  const take = ctl("take.current", [], {aria:"Current take"});
  const presets = h("div", {class:"presets"});
  for(let i = 0; i < 10; i++){
    const b = h("button", {type:"button", class:"chip", onclick:() => set("note.current", [], get("note.preset", [i]))});
    bind("note.preset", [i], v => { b.textContent = v || "\u2014"; b.hidden = !v; });
    bind("note.current", [], v => b.setAttribute("aria-pressed", v && v === get("note.preset", [i]) ? "true" : "false"));
    presets.append(b);
  }
  const box = h("div", {class:"modal nt", role:"dialog", "aria-modal":"true", "aria-labelledby":"mtitle"},
    h("div", {class:"mhead"}, h("h3", {id:"mtitle"}, h("span", {class:"recdot", "aria-hidden":"true"}), "Current Take"), closeBtn),
    h("p", {class:"hint keep"}, "Recording now. Changes apply to the take being recorded."),
    row("Scene", h("div", {style:"flex:1;min-width:0"}, scene)),
    row("Take", h("div", {style:"flex:1;min-width:0"}, take)),
    row("Note", ctl("note.current", [], {aria:"Current note", ph:"No note"})),
    h("span", {class:"lbl"}, "Note presets"),
    presets,
    h("div", {class:"flex", style:"justify-content:flex-end"}, h("button", {type:"button", class:"btn primary", onclick:() => closeModal()}, "Done")));
  const back = h("div", {class:"modal-back"}, box);
  back.addEventListener("click", e => { if(e.target === back) closeModal(); });
  document.body.append(back);
  viewBinds.slice(before).forEach(b => b.modal = true);
  modal = {el:back, from};
  (focus === "take" ? take : scene).focus();
}
function openNextTakeModal(focus, from){
  closeModal(); closePicker();
  const before = viewBinds.length;
  const closeBtn = h("button", {type:"button", class:"mclose", "aria-label":"Close", onclick:() => closeModal()}, "\u00d7");
  const now = h("span", {class:"mono ntnow"});
  const drawNow = () => now.textContent = `Current Take: ${get("scene.current") || "\u2014"} / ${get("take.current") || "\u2014"}${get("note.current") ? " \u00b7 " + get("note.current") : ""}`;
  ["scene.current","take.current","note.current"].forEach(k => bind(k, [], drawNow));
  const scene = ctl("scene.next", [], {aria:"Next scene"});
  const take = ctl("take.next", [], {aria:"Next take"});
  scene.addEventListener("change", () => set("take.next", [], ""));
  const note = ctl("note.next", [], {aria:"Next note"});
  const hints = () => { scene.placeholder = `Same scene (${get("scene.current") || "\u2014"})`; take.placeholder = `Auto (${nextTakeGuess()})`; note.placeholder = "No note"; };
  ["scene.current","take.current","scene.next"].forEach(k => bind(k, [], hints));
  const presets = h("div", {class:"presets"});
  for(let i = 0; i < 10; i++){
    const b = h("button", {type:"button", class:"chip", onclick:() => set("note.next", [], get("note.preset", [i]))});
    bind("note.preset", [i], v => { b.textContent = v || "\u2014"; b.hidden = !v; });
    bind("note.next", [], v => b.setAttribute("aria-pressed", v && v === get("note.preset", [i]) ? "true" : "false"));
    presets.append(b);
  }
  const clear = h("button", {type:"button", class:"btn", onclick:() => { ["scene.next","take.next","note.next"].forEach(k => set(k, [], "")); }}, "Clear");
  const done = h("button", {type:"button", class:"btn primary", onclick:() => closeModal()}, "Done");
  const box = h("div", {class:"modal nt", role:"dialog", "aria-modal":"true", "aria-labelledby":"mtitle"},
    h("div", {class:"mhead"}, h("h3", {id:"mtitle"}, "Next Take"), closeBtn),
    now,
    row("Scene", h("div", {style:"flex:1;min-width:0"}, scene)),
    row("", sceneButtons()),
    row("Take", h("div", {style:"flex:1;min-width:0"}, take)),
    row("Note", h("div", {style:"flex:1;min-width:0"}, note)),
    h("span", {class:"lbl"}, "Note presets"),
    presets,
    h("p", {class:"hint"}, "These apply when you press REC. Leave Scene blank to stay on this scene. A new scene starts at take 1; leave Take blank to count up."),
    h("div", {class:"flex", style:"justify-content:flex-end"}, clear, done));
  const back = h("div", {class:"modal-back"}, box);
  back.addEventListener("click", e => { if(e.target === back) closeModal(); });
  document.body.append(back);
  viewBinds.slice(before).forEach(b => b.modal = true);
  modal = {el:back, from};
  ({scene, take, note}[focus] || scene).focus();
}

function bankPanel(){
  const grid = h("div", {class:"bankgrid big"});
  bind("ui.colorbank", [], b => grid.replaceChildren(...(b || []).map((c, i) => h("div", {class:"bitem"},
    h("span", {class:"bsw", style:`background:${hex(c)}`, title:hex(c).toUpperCase()}),
    h("button", {type:"button", class:"bx", "aria-label":"Remove " + hex(c).toUpperCase() + " from bank",
      onclick:() => { const nb = get("ui.colorbank").slice(); nb.splice(i, 1); set("ui.colorbank", [], nb, "local"); }}, "\u00d7")))));
  const add = h("input", {type:"color", id:"bank-add", value:"#4aa3df", "aria-label":"Color to add"});
  const note = h("span", {class:"hint"});
  return h("div", {class:"panel"}, h("h3", null, "Color Bank"),
    h("p", {class:"hint"}, `Saved colors show up when you tap any color swatch, for one-tap recall. Holds up to ${BANK_MAX}; adding more drops the oldest.`),
    grid,
    h("div", {class:"flex"}, add, h("button", {type:"button", class:"btn", onclick:() => { note.textContent = addToBank(parseInt(add.value.slice(1), 16)) ? "" : "That color is already in the bank."; }}, "Add to Bank"), note));
}
function textCtl(s, idx, o){
  const t = h("input", {type:"text", class:"txt", id:fid(s, idx), "aria-label":o.aria || label(s), placeholder:o.ph || "", maxlength:40, autocomplete:"off", spellcheck:"false",
    onchange:e => set(s.k, idx, e.target.value.toUpperCase ? (o.keepCase ? e.target.value : e.target.value.toUpperCase()) : e.target.value),
    onkeydown:e => { if(e.key === "Enter") e.target.blur(); }});
  bind(s.k, idx, v => { if(document.activeElement !== t) t.value = v ?? ""; }); return t;
}
function roCtl(s, idx){
  const d = h("div", {class:"ro"}); bind(s.k, idx, v => d.textContent = v == null ? "—" : (typeof v === "object" ? JSON.stringify(v) : String(v))); return d;
}
const row = (lbl, ...c) => h("div", {class:"row"}, h("span", {class:"lbl"}, lbl), h("div", {class:"flex"}, ...c));

/* ---------- Meters ---------- */
const ballistics = new Map();
let COLORS = {};
function readColors(){ COLORS = {}; const cs = getComputedStyle(document.body); ["--ok","--warn","--rec","--fg","--muted","--dim","--line","--meter-bg","--accent","--ref"].forEach(v => COLORS[v] = cs.getPropertyValue(v).trim()); }
function ballistic(id, db, dt){
  let b = ballistics.get(id); if(!b){ b = {d:-90, hold:0, p:-90, ph:0}; ballistics.set(id, b); }
  const mh = get("meters.meter.hold"), md = get("meters.meter.decay"), pk = get("meters.peak.hold"), pd = get("meters.peak.decay");
  if(db >= b.d){ b.d = db; b.hold = mh; } else if((b.hold -= dt) <= 0) b.d = Math.max(db, b.d - dt * 20 / md);
  if(db >= b.p){ b.p = db; b.ph = pk; } else if((b.ph -= dt) <= 0) b.p = Math.max(b.d, b.p - dt * 20 / pd);
  return b;
}
const FLOOR = -60;
const yOf = (db, H) => { const n = Math.max(0, Math.min(1, (db - FLOOR) / -FLOOR)); return H - Math.pow(n, 1.25) * H; };
/* Meters show armed record tracks only (tracks 1–16). */
function meterSlots(){
  const src = get("home.meters.source"), out = [];
  if(src === 1){ for(let o = 0; o < 8; o++) out.push({id:"o" + o, kind:"o", name:`OUT ${o+1}`, num:o+1, db:() => outDb(o)}); return out; }
  const rt = get("record.tracks");
  for(let i = 0; i < 16; i++){
    if(rt[i]) out.push({id:"t" + i, kind:"t", t:i, name:get("track.name", [i]) || `TRK ${i+1}`, num:i+1, db:() => trackDb(i)});
  }

  return out;
}
function drawBridge(cv, slots, dt){
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, Hh = cv.clientHeight;
  if(cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)){ cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); }
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, Hh);
  const scaleW = 30, top = 6, bottom = 22, H = Hh - top - bottom, n = slots.length;
  const gap = Math.max(3, Math.min(10, (W - scaleW) / n * 0.22)), bw = (W - scaleW - gap * (n + 1)) / n;
  c.font = "11px " + getComputedStyle(document.body).getPropertyValue("--f-mono");
  c.textAlign = "right"; c.textBaseline = "middle";
  [0,-6,-12,-20,-30,-40,-60].forEach(d => {
    const y = top + yOf(d, H); c.fillStyle = COLORS["--muted"]; c.fillText(String(d), scaleW - 6, y);
    c.fillStyle = COLORS["--line"]; c.fillRect(scaleW, Math.round(y) + 0.5, W - scaleW, 1);
  });
  const yWarn = top + yOf(-20, H), yRed = top + yOf(-10, H);
  slots.forEach((s, i) => {
    const x = scaleW + gap + i * (bw + gap), b = ballistic(s.id, s.db(), dt), y = top + yOf(b.d, H);
    c.fillStyle = "rgba(255,255,255,0.035)"; c.fillRect(x, top, bw, H);
    // segmented fill
    const seg = 4;
    for(let yy = top + H; yy > y; yy -= seg){
      const y0 = Math.max(y, yy - seg + 1);
      c.fillStyle = yy <= yRed ? COLORS["--rec"] : yy <= yWarn ? COLORS["--warn"] : COLORS["--ok"];
      c.fillRect(x, y0, bw, yy - y0 - 1 > 0 ? yy - y0 - 1 : 1);
    }
    const py = top + yOf(b.p, H);
    c.fillStyle = b.p > -3 ? COLORS["--rec"] : COLORS["--fg"]; if(b.p > FLOOR) c.fillRect(x, py - 1, bw, 2);
    c.textAlign = "center"; c.fillStyle = COLORS["--muted"]; c.fillText(String(s.num), x + bw / 2, top + H + 12);
  });
}

/* ---------- Views ---------- */
const VIEWS = [
  ["home","Meters"],["arm","Record Enables"],["inputs","Inputs"],["routing","Routing"],["names","Track Names"],
  ["timecode","Timecode"],["meta","Metadata"],["setup","Setup"],["log","Link log"]
];
let current = "home", frameHooks = [];
function go(v){
  cartSubs.clear();
  closeModal();
  current = v; viewBinds = []; frameHooks = []; document.body.dataset.view = v; closePicker();
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", t.dataset.v === v ? "true" : "false"));
  const m = $("view"); m.replaceChildren(RENDER[v]()); m.scrollTop = 0;
  try{ localStorage.setItem("cart-remote-tab", v); }catch(e){}
}

let routeMode = "tracks";
try{ const rm = localStorage.getItem("cart-remote-route"); routeMode = rm === "presets" ? "outputs" : ["tracks","outputs","phones"].includes(rm) ? rm : "tracks"; }catch(e){}

const RENDER = {
  home(){ return homeConsole(); },

  arm(){
    const recSet = (i, v) => set("record.tracks", [i], v);
    const btn = i => {
      const nm = h("span", {class:"an"});
      const b = h("button", {type:"button", class:"armbtn rt", "aria-pressed":"false", onclick:() => recSet(i, get("record.tracks", [i]) ? 0 : 1)},
        h("span", {class:"atop"}, h("span", null, String(i + 1).padStart(2, "0")), h("i")), nm);
      bind("track.name", [i], v => nm.textContent = v || `TRK ${i + 1}`);
      bind("record.tracks", [i], v => { b.setAttribute("aria-pressed", v ? "true" : "false"); b.setAttribute("aria-label", `Record enable track ${i + 1}, ${v ? "armed" : "disarmed"}`); });
      return b;
    };
    const all = onoff => { if(sim.state === "RECORDING"){ flashLock(); return; } for(let i = 0; i < 16; i++) recSet(i, onoff); };
    const count = h("span", {class:"mono"});
    bind("record.tracks", [], v => count.textContent = `${v.slice(0, 16).filter(Boolean).length} of 16 armed`);
    const ab = (txt, fn) => h("button", {type:"button", class:"btn armall", onclick:fn}, txt);
    return h("div", {class:"stack"},
      h("div", {class:"panel"},
        h("div", {class:"flex", style:"justify-content:space-between"}, h("h3", null, "Record Enables"), count),
        h("div", {class:"flex"}, ab("Arm All", () => all(1)), ab("Disarm All", () => all(0))),
        h("p", {class:"hint lockhint"}, "Locked while recording. Stop to change which tracks are armed.")),
      h("div", {class:"armgrid"}, Array.from({length:16}, (_, i) => btn(i))));
  },

  routing(){
    const mode = routeMode;
    const seg = h("div", {class:"seg routeseg", role:"group", "aria-label":"Routing view"},
      [["tracks","Tracks"],["outputs","Outputs"],["phones","Headphones"]].map(([m, t]) => h("button", {type:"button", class:"seg-b", "aria-pressed":m === mode ? "true" : "false",
        onclick:() => { if(m === routeMode) return; routeMode = m; try{ localStorage.setItem("cart-remote-route", m); }catch(e){} go("routing"); }}, t)));
    const bar = h("div", {class:"flex", style:"gap:16px;justify-content:space-between"}, seg,
      mode === "outputs" ? h("button", {type:"button", class:"btn", "aria-haspopup":"dialog", onclick:e => openPresetsModal(e.currentTarget)}, "Edit Presets") : null);
    return h("div", {class:"stack"}, bar, mode === "tracks" ? RENDER.tracks() : mode === "outputs" ? RENDER.outputs() : RENDER.phones());
  },

  names(){
    const rows = Array.from({length:16}, (_, t) => h("div", {class:"namerow"},
      h("span", {class:"mono nnum"}, String(t + 1).padStart(2, "0")),
      ctl("track.color", [t]),
      h("div", {style:"flex:1;min-width:0"}, ctl("track.name", [t], {aria:`Track ${t + 1} name`}))));
    return h("div", {class:"stack"},
      h("div", {class:"panel"}, h("h3", null, "Track Names"),
        h("p", {class:"hint"}, "Names and colors for tracks 1–16. They show on the meters, the routing matrix and Record Enables."),
        h("div", {class:"namegrid"}, rows)), bankPanel());
  },

  inputs(){
    const list = h("div", {class:"chlist"});
    const bars = [];
    for(let i = 0; i < IN_COUNT; i++){
      const sw = h("span", {class:"sw"}), nm = h("span"), bar = h("div");
      const flags = h("span", {class:"flags"});
      const b = h("button", {type:"button", class:"ch", onclick:() => set("input.channel", [], i + 1, "local")},
        h("span", {class:"n"}, inLabel(i)), h("span", {class:"nm"}, sw, nm), h("span", {class:"bar"}, bar));
      bind("input.name", [i], v => nm.textContent = v || "\u2014");
      if(i === 8 || i === 14) b.style.gridColumnStart = "1";
      bind("input.color", [i], v => sw.style.background = hex(v || 0));
      bind("input.channel", [], v => b.setAttribute("aria-pressed", v === i + 1 ? "true" : "false"));
      bars.push(bar); list.append(b);
    }
    frameHooks.push(dt => bars.forEach((bar, i) => { const bl = ballistic("i" + i, sim.inDb[i], dt / 2); const n = Math.max(0, (bl.d - FLOOR) / -FLOOR); bar.style.transform = `scaleX(${n.toFixed(3)})`; bar.style.background = bl.d > -10 ? COLORS["--rec"] : bl.d > -20 ? COLORS["--warn"] : COLORS["--ok"]; }));
    const detail = h("div", {class:"stack"});
    bind("input.channel", [], ch => {
      viewBinds = viewBinds.filter(b => !b.detail);
      const before = viewBinds.length;
      detail.replaceChildren(inputDetail(ch - 1));
      viewBinds.slice(before).forEach(b => b.detail = true);
    });
    return h("div", {class:"stack"}, list, detail);
  },

  tracks(){
    /* Same as output routing: tap cycles off -> pre-fade (green) -> post-fade (red) -> off.
       Stored in trackmix.matrix as 0 / 1 / 2 (unconfirmed on hardware). */
    const P = () => get("trackmix.preset") - 1;
    const ROUTE = ["not routed", "pre-fade", "post-fade"];
    const grid = h("div", {class:"mx-wrap"});
    const draw = () => {
      viewBinds = viewBinds.filter(b => !b.grid); const before = viewBinds.length;
      const p = P();
      const mkCell = (t, i) => {
        const b = h("button", {type:"button", class:"cell rte", onclick:() => { const v = get("trackmix.matrix", [P(), t, i]); set("trackmix.matrix", [P(), t, i], v === 0 ? 1 : v === 1 ? 2 : 0); }});
        bind("trackmix.matrix", [p, t, i], v => { const k = v === 0 ? 0 : v === 1 ? 1 : 2;
          b.className = "cell rte" + (k === 1 ? " pre" : k === 2 ? " post" : ""); b.textContent = ["\u00b7", "PRE", "POST"][k];
          b.setAttribute("aria-label", `${inFull(i)} to track ${t + 1}: ${ROUTE[k]}`); });
        return h("td", null, b);
      };
      const flagCell = (k, t, name) => { const c = ctl(k, [p, t], {label:name}); c.style.cssText = "min-width:0;padding:6px 8px;font-size:11px;white-space:nowrap"; return h("td", null, c); };
      const thead = h("tr", null, h("th", null, h("span", {class:"lbl"}, "Track \u2190 Input")),
        ...Array.from({length:IN_COUNT}, (_, i) => h("th", {scope:"col"}, inFull(i))),
        ...["Tone","Slate","Com 1"].map(x => h("th", {scope:"col"}, x)));
      const body = Array.from({length:16}, (_, t) => h("tr", null, h("th", {scope:"row"}, `${t+1} ${get("track.name", [t]) || ""}`),
        ...Array.from({length:IN_COUNT}, (_, i) => mkCell(t, i)),
        flagCell("trackmix.tone", t, "Tone"), flagCell("trackmix.slate", t, "Slate"),
        (() => { const c = ctl("ui.track.com1", [t], {label:"Com 1"}); c.style.cssText = "min-width:0;padding:6px 8px;font-size:11px;white-space:nowrap"; c.setAttribute("aria-label", `Com 1 on track ${t + 1}`); return h("td", null, c); })()));
      grid.replaceChildren(h("table", {class:"mx"}, h("thead", null, thead), h("tbody", null, body)));
      viewBinds.slice(before).forEach(b => b.grid = true);
    };
    bind("trackmix.preset", [], draw);
    return h("div", {class:"stack", style:"gap:6px"}, grid,
      h("p", {class:"hint"}, "Tap a cell once for a pre-fade route (green), again for post-fade (red), and a third time to remove it. A track can take any number of inputs."));
  },
  outputs(){ return outMatrix(); },

  phones(){
    const sel = h("select", {class:"sel hpsel", id:"f-hp-select", "aria-label":"Headphone preset",
      onchange:e => { const v = e.target.value; if(v === "bus2"){ hpBus2 = true; draw(); } else { const was = hpBus2; hpBus2 = false; set("hpmix.preset", [], +v); if(was) draw(); } }});
    const fillSel = () => { sel.replaceChildren(...Array.from({length:HP_COUNT}, (_, i) => h("option", {value:i + 1}, `${i + 1} \u00b7 ${get("hpmix.names", [i]) || "HP " + (i + 1)}`)), h("option", {value:"bus2"}, "BUS 2"));
      sel.value = hpBus2 ? "bus2" : String(get("hpmix.preset")); };
    bind("hpmix.names", [], fillSel);
    const body = h("div", {class:"stack"});
    const draw = () => {
      viewBinds = viewBinds.filter(b => !b.hp); frameHooks = frameHooks.filter(f => !f.hp);
      const b0 = viewBinds.length;
      body.replaceChildren(hpPanel(hpBus2 ? null : get("hpmix.preset") - 1));
      viewBinds.slice(b0).forEach(b => b.hp = true);
    };
    bind("hpmix.preset", [], v => { if(!hpBus2){ sel.value = String(v); draw(); } });
    if(hpBus2) draw();
    return h("div", {class:"panel hppanel"}, h("div", {class:"flex", style:"gap:12px"}, h("span", {class:"lbl"}, "Headphone preset"), sel), body);
  },

  timecode(){
    const reader = h("div", {class:"tc", style:"font-size:32px"}, "--:--:--:--");
    const gen = h("div", {class:"tc", style:"font-size:32px"});
    frameHooks.push(() => { const f = sim.fr(); gen.textContent = framesToTC(sim.genFrames, f); reader.textContent = get("timecode.runmode") >= 2 ? framesToTC(sim.genFrames + 2, f) : "--:--:--:--"; });
    const setTo = h("input", {type:"text", class:"txt mono", id:"f-tc-set", placeholder:"HH:MM:SS:FF", style:"max-width:160px"});
    const apply = h("button", {type:"button", class:"btn primary", onclick:() => {
      const m = setTo.value.trim().match(/^(\d{1,2})[:;.](\d{2})[:;.](\d{2})[:;.](\d{2})$/);
      if(!m){ setTo.setCustomValidity("Use HH:MM:SS:FF"); setTo.reportValidity(); return; }
      setTo.setCustomValidity("");
      const fr = sim.fr(); let total = ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * fr.n + +m[4];
      if(fr.df){ const mins = +m[1] * 60 + +m[2]; total -= 2 * (mins - Math.floor(mins / 10)); }
      sim.genFrames = total; link.send({op:"SET", id:S["timecode.generator.tc"].id, k:"timecode.generator.tc", idx:[], val:setTo.value.trim()});
    }}, "Set generator");
    return h("div", {class:"sub"},
      h("div", {class:"panel"}, h("h3", null, "Clocks"),
        h("div", {class:"stack"}, h("span", {class:"lbl"}, "Generator"), gen, h("span", {class:"lbl"}, "Reader"), reader),
        h("div", {class:"flex"}, setTo, apply, h("button", {type:"button", class:"btn", onclick:() => link.send({op:"CMD", name:"JAM"})}, "Jam from reader"))),
      h("div", {class:"panel"}, h("h3", null, "Format"),
        row("Frame rate", ctl("timecode.framerate", [], {select:true})),
        row("Run mode", ctl("timecode.runmode", [], {select:true})),
        row("Auto-jam", ctl("timecode.autojam")),
        row("User bits", ctl("timecode.incuserbits")),
        row("TC out", ctl("timecode.out")),
        row("Display", ctl("timecode.displayed"))));
  },

  meta(){
    return h("div", {class:"stack"},
      h("div", {class:"sub"},
        h("div", {class:"panel"}, h("h3", null, "Current Take"),
          row("Scene", h("div", {style:"flex:1;min-width:0"}, ctl("scene.current", [], {aria:"Current scene"}))),
          row("Take", h("div", {style:"flex:1;min-width:0"}, ctl("take.current", [], {aria:"Current take"}))),
          row("Note", noteButton("note.current", "Current Take"))),
        h("div", {class:"panel"}, h("h3", null, "Next Take"),
          row("Scene", h("div", {style:"flex:1;min-width:0"}, (() => { const c = ctl("scene.next", [], {ph:"Keep current", aria:"Next scene"}); c.addEventListener("change", () => set("take.next", [], "")); return c; })())),
          row("", sceneButtons()),
          row("Take", h("div", {style:"flex:1;min-width:0"}, ctl("take.next", [], {ph:"Auto increment", aria:"Next take"}))),
          row("Note", noteButton("note.next", "Next Take")),
          row("Continuity", ctl("metadata.continuity")),
          h("p", {class:"hint"}, "When you press REC, the next take becomes the current one: the take counts up, or starts at 1 on a new scene."))),
      h("div", null, h("button", {type:"button", class:"btn", "aria-haspopup":"dialog", onclick:e => openNotePresets(e.currentTarget)}, "Edit Presets")),
      h("div", {class:"panel"}, h("h3", null, "Take History"), historyTable(10)));
  },

  setup(){
    const conn = cartPanel();
    const reset = h("button", {type:"button", class:"btn"}, "Reset to example setup");
    const confirmRow = h("div", {class:"flex", hidden:true}, h("span", {class:"hint"}, "This replaces every setting with the example cart setup."),
      h("button", {type:"button", class:"btn primary", onclick:() => { try{ localStorage.removeItem(STORE_KEY); }catch(e){} SCHEMA.forEach(s => V[s.k] = build(s.d, () => def(s))); seed(); seedDevice(); saveSoon(); net.send({t:"replace", V:sharedSnapshot()}); go("setup"); renderTransport(); log("ev", "Reset to example setup"); }}, "Reset"),
      h("button", {type:"button", class:"btn", onclick:() => { confirmRow.hidden = true; reset.hidden = false; }}, "Cancel"));
    reset.addEventListener("click", () => { reset.hidden = true; confirmRow.hidden = false; });
    return h("div", {class:"stack"},
      h("div", {class:"sub"},
        h("div", {class:"panel"}, h("h3", null, "Recording"),
          row("Sample rate", ctl("sample.rate")), row("Pre-roll", ctl("record.preroll")),
          row("Transport", ctl("setup.transport")), row("Tone", ctl("tone.enable")), row("Tone level", ctl("tone.level"))),
        h("div", {class:"panel"}, h("h3", null, "Meters"),
          row("Meter hold", ctl("meters.meter.hold")), row("Meter decay", ctl("meters.meter.decay")),
          row("Peak hold", ctl("meters.peak.hold")), row("Peak decay", ctl("meters.peak.decay")),
          row("NeverClip", ctl("neverclip.attenuation", [], {select:true})),
          row("Reference line", ctl("ui.refline.enable")),
          row("Line level", ctl("ui.refline.level", [], {compact:true, fmt:v => v + " dB"})))),
      h("div", {class:"sub"},
        h("div", {class:"panel"}, h("h3", null, "Remote roll & control"),
          row("GPI 1 roll", ctl("setup.gpi1.remoteroll")), row("Serial roll", ctl("setup.serial.remoteroll")),
          row("Serial mode", ctl("setup.serial.mode")), row("Master", ctl("setup.master.mode")),
          row("Backlight", ctl("controller.backlight")), row("UI update", ctl("ui.update.period"))),
        h("div", {class:"panel"}, h("h3", null, "Display"), row("Help text", ctl("ui.helptext")),
          h("p", {class:"hint"}, "Shows the short explanations under controls throughout the remote.")),
        h("div", {class:"panel"}, h("h3", null, "Cart & Recorder Link"), conn, reset, confirmRow)));
  },

  all(){
    const q = h("input", {type:"search", class:"txt", id:"f-all-search", placeholder:"Filter by name or number", "aria-label":"Filter settings"});
    const cats = {}; SCHEMA.forEach(s => (cats[s.k.split(".")[0]] ||= []).push(s));
    const box = h("div");
    const render = () => {
      viewBinds = [];
      const f = q.value.trim().toLowerCase();
      box.replaceChildren(...Object.entries(cats).map(([cat, list]) => {
        const items = list.filter(s => !f || s.k.includes(f) || s.n.toLowerCase().includes(f.replace(/ /g, "_")) || String(s.id) === f);
        if(!items.length) return null;
        return h("details", {class:"cat", open: !!f || cat === "input"}, h("summary", null, `${cat[0].toUpperCase() + cat.slice(1)} · ${items.length}`), items.map(paramRow));
      }));
    };
    q.addEventListener("input", render); render();
    return h("div", {class:"stack"}, h("p", {class:"hint"}, `All ${SCHEMA.length} recorder settings, grouped by area. Pick an index for settings that repeat per channel, track or preset.`), q, box);
  },

  log(){
    const pre = h("div", {class:"log", role:"log", "aria-live":"off"});
    const add = e => { pre.append(h("div", {class:e.dir}, e.line)); while(pre.childElementCount > 400) pre.firstChild.remove(); pre.scrollTop = pre.scrollHeight; };
    LOG.slice(-400).forEach(add);
    logSubs.clear(); logSubs.add(add);
    const pause = h("button", {type:"button", class:"btn", onclick:() => { logPaused = !logPaused; pause.textContent = logPaused ? "Resume" : "Pause"; }}, logPaused ? "Resume" : "Pause");
    const copied = h("span", {class:"hint"});
    return h("div", {class:"stack"},
      h("p", {class:"hint"}, "Messages between this page and the recorder. TX is sent, RX is received. Channel numbers are shown starting at 1."),
      h("div", {class:"flex"}, pause,
        h("button", {type:"button", class:"btn", onclick:() => { LOG.length = 0; pre.replaceChildren(); }}, "Clear"),
        h("button", {type:"button", class:"btn", onclick:() => { const text = LOG.map(e => e.line).join("\n"); navigator.clipboard?.writeText(text).then(() => copied.textContent = "Copied", () => { const r = document.createRange(); r.selectNodeContents(pre); getSelection().removeAllRanges(); getSelection().addRange(r); copied.textContent = "Selected. Press Ctrl+C or ⌘C to copy."; }); }}, "Copy"), copied),
      pre);
  }
};

/* ---------- Meters home: shared pieces ---------- */
function homePanels(){
  return h("div", {class:"panel"}, h("h3", null, "Recent takes"), historyTable(4));
}
function meterTabs(){
  const seg = h("div", {class:"seg routeseg", role:"group", "aria-label":"Meter view"},
    ["Tracks", "Outputs"].map((t, i) => h("button", {type:"button", class:"seg-b", onclick:() => set("home.meters.source", [], i)}, t)));
  const note = h("span", {class:"hint help"});
  bind("home.meters.source", [], v => {
    [...seg.children].forEach((b, i) => b.setAttribute("aria-pressed", i === v ? "true" : "false"));
    note.textContent = v === 0 ? "Armed tracks only. Tap a name for its inputs and settings." : "Tap an output name to route tracks to it.";
  });
  return h("div", {class:"flex", style:"gap:16px"}, seg, note);
}

function noArmed(){
  return h("div", {class:"panel", style:"align-items:flex-start"}, h("h3", null, "No tracks armed"),
    h("p", {class:"hint"}, "The meters show armed tracks only. Arm at least one track to see it here."),
    h("button", {type:"button", class:"btn primary", onclick:() => go("arm")}, "Open Record Enables"));
}
function slotColor(s){
  if(s.kind === "t") return hex(get("track.color", [s.t]) || 0x5a6066);
  if(s.kind === "i") return hex(get("input.color", [s.ch]) || 0x5a6066);
  return "#a9b4bb";
}
/* A track strip shows input details when exactly one input feeds it at unity. */
function stripInput(s){
  if(s.kind === "i") return s.ch;
  if(s.kind !== "t") return null;
  const p = get("trackmix.preset") - 1; let found = null, n = 0;
  for(let i = 0; i < IN_COUNT; i++){ const v = get("trackmix.matrix", [p, s.t, i]); if(v > 0){ n++; found = i; } }
  return n === 1 ? found : null;
}
function drawLED(cv, b){
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if(!W || !H) return;
  if(cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)){ cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const seg = 8, gap = 2, lit = H - yOf(b.d, H);
  for(let y0 = 0; y0 < H; y0 += seg){
    const f = (y0 + seg / 2) / H;
    c.fillStyle = f > 0.796 ? COLORS["--rec"] : f > 0.602 ? COLORS["--warn"] : COLORS["--ok"];
    c.globalAlpha = y0 + seg / 2 <= lit ? 1 : 0.13;
    c.fillRect(0, H - y0 - seg + gap, W, seg - gap);
  }
  c.globalAlpha = 1;
  if(get("ui.refline.enable")){ c.fillStyle = COLORS["--ref"]; c.fillRect(0, Math.round(yOf(get("ui.refline.level"), H)) - 1, W, 3); }
  if(b.p > FLOOR){ c.fillStyle = "#ffffff"; c.fillRect(0, yOf(b.p, H) - 2, W, 4); }
}

/* dB scale beside the meters, on the same curve the meters use */
const TICKS = [0, -6, -10, -20, -30, -40, -60];
/* Zone edges: up to and including -20 is green, up to and including -10 is yellow, above -10 is red. */
const tickColor = d => d > -10 ? COLORS["--rec"] : d > -20 ? COLORS["--warn"] : d === -20 ? COLORS["--ok"] : COLORS["--muted"];
const fpct = d => Math.pow(Math.max(0, Math.min(1, (d - FLOOR) / -FLOOR)), 1.25);
function drawScale(cv){
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if(!W || !H) return;
  if(cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)){ cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  c.font = "10px " + getComputedStyle(document.body).getPropertyValue("--f-mono");
  c.textAlign = "right"; c.textBaseline = "middle";
  TICKS.forEach(d => {
    const y = yOf(d, H), ty = Math.max(6, Math.min(H - 6, y));
    c.fillStyle = tickColor(d);
    c.fillText(String(d), W - 7, ty);
    c.fillStyle = COLORS["--dim"]; c.fillRect(W - 4, Math.round(Math.max(0, Math.min(H - 1, y))), 4, 1);
  });
  if(get("ui.refline.enable")){ c.fillStyle = COLORS["--ref"]; c.fillRect(W - 8, Math.round(yOf(get("ui.refline.level"), H)) - 1, 8, 3); }
}
function scaleStrip(hooks){
  const cv = h("canvas", {class:"led", "aria-hidden":"true"});
  hooks.push(() => drawScale(cv));
  return h("div", {class:"strip scale", "aria-hidden":"true"},
    h("div", {class:"scrib", style:"visibility:hidden"}, "·"),
    h("div", {class:"sinfo", style:"justify-content:flex-end"}, h("span", null, "dB")),
    cv);
}

function homeConsole(){
  const strips = h("div", {class:"strips"});
  let hooks = [];
  const rebuild = () => {
    viewBinds = viewBinds.filter(b => !b.strip); const before = viewBinds.length;
    const slots = meterSlots(); hooks = [];
    if(!slots.length){ strips.style.gridTemplateColumns = "minmax(0,1fr)"; strips.replaceChildren(noArmed()); return; }
    strips.style.gridTemplateColumns = `34px repeat(${slots.length}, minmax(64px, 120px))`;
    strips.replaceChildren(scaleStrip(hooks), ...slots.map(s => {
      const ch = stripInput(s);
      const scrib = s.kind === "t"
        ? h("button", {type:"button", class:"scrib", title:`Open ${s.name}`, "aria-haspopup":"dialog", onclick:() => openTrackModal(s.t, scrib)}, s.name)
        : s.kind === "o"
        ? h("button", {type:"button", class:"scrib", title:`Route ${s.name}`, "aria-haspopup":"dialog", onclick:() => openOutputModal(s.num - 1, scrib)}, s.name)
        : h("div", {class:"scrib", title:s.name}, s.name);
      scrib.style.background = slotColor(s);
      const trim = h("span");
      if(ch == null) trim.textContent = s.kind === "o" ? "OUT" : "MIX";
      else bind("input.trim.level", [ch], v => trim.textContent = (v > 0 ? "+" : "") + v + " dB");
      const cv = h("canvas", {class:"led", "aria-hidden":"true"});
      hooks.push(dt => drawLED(cv, ballistic(s.id, s.db(), dt)));
      return h("div", {class:"strip"}, scrib,
        h("div", {class:"sinfo"}, h("span", null, typeof s.num === "number" ? String(s.num).padStart(2, "0") : s.num), trim),
        cv);
    }));
    viewBinds.slice(before).forEach(b => b.strip = true);
  };
  bind("record.tracks", [], rebuild); bind("home.meters.source", [], rebuild); bind("input.name", [], rebuild); bind("input.color", [], rebuild);
  bind("track.name", [], rebuild); bind("track.color", [], rebuild); bind("trackmix.preset", [], rebuild);
  frameHooks.push(dt => hooks.forEach(f => f(dt)));
  return h("div", {class:"stack"}, meterTabs(), h("div", {class:"strips-wrap"}, strips));
}


/* Output routing matrix: outputs are rows, tracks are columns. Any number of tracks per output,
   each off / pre-fade / post-fade (stored in outputmix.matrix as 0 / 1 / 2: unconfirmed on hardware).
   Tone, slate and com are per-output adds. */
function outMatrix(){
  const ROUTE = ["not routed", "pre-fade", "post-fade"];
  const cell = (o, t) => {
    const b = h("button", {type:"button", class:"cell rte", onclick:() => { const v = get("outputmix.matrix", [0, o, t]); set("outputmix.matrix", [0, o, t], v === 0 ? 1 : v === 1 ? 2 : 0); }});
    bind("outputmix.matrix", [0, o, t], v => { const st = v === 0 ? 0 : v === 1 ? 1 : 2;
      b.className = "cell rte" + (st === 1 ? " pre" : st === 2 ? " post" : ""); b.textContent = ["\u00b7", "PRE", "POST"][st];
      b.setAttribute("aria-label", `Track ${t+1} to output ${o+1}: ${ROUTE[st]}`); });
    return h("td", null, b);
  };
  const add = (k, o, label) => { const c = ctl(k, [0, o], {label}); c.style.cssText = "min-width:0;padding:6px 8px;font-size:11px;white-space:nowrap"; c.setAttribute("aria-label", `${label} on output ${o+1}`); return h("td", null, c); };
  const ADDS = [["outputmix.tone","Tone"],["outputmix.slate","Slate"],["outputmix.com1","Com 1"],["outputmix.com2","Com 2"]];
  const thead = h("tr", null, h("th", null, h("span", {class:"lbl"}, "Output \u2190 Track")), h("th", {scope:"col"}, "Preset"),
    Array.from({length:16}, (_, t) => h("th", {scope:"col"}, `${t+1} ${get("track.name", [t]) || ""}`)),
    ADDS.map(([, n]) => h("th", {scope:"col"}, n)));
  const body = Array.from({length:8}, (_, o) => h("tr", null, h("th", {scope:"row"}, `OUT ${o+1}`), h("td", {style:"padding-right:8px"}, presetSelect(o)),
    Array.from({length:16}, (_, t) => cell(o, t)),
    ADDS.map(([k, n]) => add(k, o, n))));
  return h("div", {class:"stack", style:"gap:6px"},
    h("div", {class:"mx-wrap"}, h("table", {class:"mx"}, h("thead", null, thead), h("tbody", null, body))),
    h("p", {class:"hint"}, "Tap a cell once for a pre-fade route (green), again for post-fade (red), and a third time to remove it. An output can take any number of tracks. Tone, Slate and Com add to the output on top of its tracks. Use the Preset column to load a preset; Edit Presets to change them."));
}

function cartPanel(){
  const urls = h("div", {class:"stack", style:"gap:6px"});
  const drawUrls = () => urls.replaceChildren(...(cart.urls.length
    ? cart.urls.map(u => h("div", {class:"urlrow"}, h("code", null, u.url), h("span", {class:"hint"}, u.name)))
    : [h("p", {class:"hint keep"}, "The cart computer isn't on a network. Join the cart Wi-Fi to use phones and iPads.")]));
  const portSel = h("select", {class:"sel", id:"f-serial-port", "aria-label":"Serial port"});
  const baudSel = h("select", {class:"sel", id:"f-serial-baud", "aria-label":"Baud rate"}, [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map(b => h("option", {value:b}, String(b))));
  baudSel.value = "115200";
  const openB = h("button", {type:"button", class:"btn primary", onclick:() => { if(portSel.value) net.send({t:"serialOpen", path:portSel.value, baud:+baudSel.value}); }}, "Open port");
  const closeB = h("button", {type:"button", class:"btn", onclick:() => net.send({t:"serialClose"})}, "Close port");
  const st = h("p", {class:"hint keep", role:"status"});
  const drawSerial = () => {
    const sp = cart.serial || {};
    st.textContent = sp.status === "open" ? `Open: ${sp.path} at ${sp.baud} baud \u00b7 ${(sp.bytes || 0).toLocaleString()} bytes received. Raw bytes show in the Link log and are saved on the cart computer: ${sp.capture}`
      : sp.status === "error" ? `Couldn't use the port: ${sp.error}` : sp.status === "opening" ? "Opening\u2026" : "Closed.";
    openB.disabled = sp.status === "open"; closeB.disabled = sp.status !== "open";
    if(sp.baud) baudSel.value = String(sp.baud);
  };
  const drawPorts = () => {
    const cur = portSel.value || (cart.serial && cart.serial.path) || "";
    portSel.replaceChildren(...(cart.ports.length ? cart.ports.map(p => h("option", {value:p.path}, p.label)) : [h("option", {value:""}, "No serial ports found")]));
    if(cur && cart.ports.some(p => p.path === cur)) portSel.value = cur;
  };
  [drawUrls, drawSerial, drawPorts].forEach(f => { cartSubs.add(f); f(); });
  net.send({t:"ports"});
  return h("div", {class:"stack"},
    h("span", {class:"lbl"}, "Open on a phone or iPad (same Wi-Fi)"), urls,
    h("span", {class:"lbl"}, "Recorder link"),
    h("p", {class:"hint keep"}, "The remote runs on the simulated recorder until the Nova's serial protocol is decoded. Opening the Nova's port here shows and saves its raw serial traffic."),
    row("Port", portSel), row("Baud", baudSel),
    h("div", {class:"flex"}, h("button", {type:"button", class:"btn", onclick:() => net.send({t:"ports"})}, "Refresh ports"), openB, closeB),
    st);
}

function presetPicker(k, namesKey){
  const s = S[k], n = s.r[1];
  const sel = h("select", {class:"sel", id:fid(s, []), "aria-label":label(s), onchange:e => set(k, [], +e.target.value)});
  const fill = () => { sel.replaceChildren(...Array.from({length:n}, (_, i) => h("option", {value:i + 1}, `${i+1} · ${get(namesKey, [i]) || "Preset " + (i+1)}`))); sel.value = get(k); };
  bind(namesKey, [], fill); bind(k, [], v => sel.value = v); return sel;
}

function historyTable(n){
  const tb = h("tbody");
  bind("metadata.history", [], hist => {
    const rows = (hist || []).map((r, idx) => r ? {r, idx} : null).filter(Boolean).slice(0, n);
    tb.replaceChildren(...(rows.length ? rows.map(({r, idx}) => h("tr", null,
      h("td", null, h("b", null, `${r.scene}/${r.take}`)), h("td", {class:"mono"}, r.start || "\u2014"), h("td", {class:"mono"}, fmtDur(r.dur)),
      h("td", null, h("button", {type:"button", class:"notebtn", "aria-haspopup":"dialog", "aria-label":`Note for take ${r.scene}/${r.take}: ${r.note || "none"}`,
        onclick:e => openNotePopup({title:`Take ${r.scene}/${r.take}`, get:() => (get("metadata.history")[idx] || {}).note || "",
          put:v => { const hh = get("metadata.history").slice(); if(!hh[idx]) return; hh[idx] = {...hh[idx], note:v}; set("metadata.history", [], hh, "ui");
            link.fromDevice(`UPD  58 METADATA_HISTORY  ${r.scene}/${r.take} note = ${JSON.stringify(v)}`); }}, e.currentTarget)},
        r.note || h("span", {class:"hint"}, "Add Note"))))) :
      [h("tr", null, h("td", {colspan:4, class:"hint"}, "No takes yet. Press REC to make one."))]));
  });
  return h("div", {class:"tbl-wrap"}, h("table", {class:"list"}, h("thead", null, h("tr", null, ["Take","Start","Length","Note"].map(x => h("th", null, x)))), tb));
}

/* ---------- Note presets editor ---------- */
function openNotePresets(from){
  closeModal(); closePicker();
  const before = viewBinds.length;
  const closeBtn = h("button", {type:"button", class:"mclose", "aria-label":"Close", onclick:() => closeModal()}, "\u00d7");
  const box = h("div", {class:"modal nt", role:"dialog", "aria-modal":"true", "aria-labelledby":"mtitle"},
    h("div", {class:"mhead"}, h("h3", {id:"mtitle"}, "Note Presets"), closeBtn),
    h("p", {class:"hint"}, "These show up as one-tap choices whenever you add a note. Leave a slot empty to hide it."),
    h("div", {class:"npgrid"}, Array.from({length:10}, (_, i) => h("div", {class:"mrow"}, h("span", {class:"mono hpn"}, String(i + 1).padStart(2, "0")),
      h("div", {style:"flex:1;min-width:0"}, ctl("note.preset", [i], {aria:`Note preset ${i + 1}`}))))),
    h("div", {class:"flex", style:"justify-content:flex-end"}, h("button", {type:"button", class:"btn primary", onclick:() => closeModal()}, "Done")));
  const back = h("div", {class:"modal-back"}, box);
  back.addEventListener("click", e => { if(e.target === back) closeModal(); });
  document.body.append(back);
  viewBinds.slice(before).forEach(b => b.modal = true);
  modal = {el:back, from};
  box.querySelector("input").focus();
}

/* ---------- Note pop-up: type a note or tap a preset ---------- */
function noteButton(k, title){
  const b = h("button", {type:"button", class:"notebtn wide", "aria-haspopup":"dialog", onclick:e => openNotePopup({title, get:() => get(k), put:v => set(k, [], v)}, e.currentTarget)});
  bind(k, [], v => { b.replaceChildren(v || h("span", {class:"hint"}, "Add Note")); b.setAttribute("aria-label", `${title} note: ${v || "none"}`); });
  return b;
}
function openNotePopup(o, from){
  closeModal(); closePicker();
  const before = viewBinds.length;
  const input = h("input", {type:"text", class:"txt", id:"note-pop", value:o.get() || "", maxlength:40, autocomplete:"off", spellcheck:"false", "aria-label":"Note", placeholder:"Type a note"});
  const save = () => { o.put(input.value.trim().toUpperCase()); closeModal(); };
  input.addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); save(); } });
  const presets = h("div", {class:"presets"});
  for(let i = 0; i < 10; i++){
    const v = get("note.preset", [i]); if(!v) continue;
    presets.append(h("button", {type:"button", class:"chip", "aria-pressed":o.get() === v ? "true" : "false", onclick:() => { o.put(v); closeModal(); }}, v));
  }
  const closeBtn = h("button", {type:"button", class:"mclose", "aria-label":"Close", onclick:() => closeModal()}, "\u00d7");
  const box = h("div", {class:"modal nt", role:"dialog", "aria-modal":"true", "aria-labelledby":"mtitle"},
    h("div", {class:"mhead"}, h("h3", {id:"mtitle"}, `Note \u00b7 ${o.title}`), closeBtn),
    input,
    h("span", {class:"lbl"}, "Presets"),
    presets,
    h("div", {class:"flex", style:"justify-content:flex-end"},
      h("button", {type:"button", class:"btn", onclick:() => { o.put(""); closeModal(); }}, "Clear note"),
      h("button", {type:"button", class:"btn primary", onclick:save}, "Save")));
  const back = h("div", {class:"modal-back"}, box);
  back.addEventListener("click", e => { if(e.target === back) closeModal(); });
  document.body.append(back);
  viewBinds.slice(before).forEach(b => b.modal = true);
  modal = {el:back, from};
  input.focus(); input.select();
}

function inputDetail(i){
  /* Everything that belongs to one input lives in one box, in sections. */
  const name = h("h3", null); bind("input.name", [i], v => name.textContent = inFull(i, v));
  const compBox = h("div", {class:"stack"});
  bind("input.compress.link", [i], g => {
    if(!g){ compBox.replaceChildren(h("p", {class:"hint"}, "Pick a link group to set attack, decay, threshold, ratio and gain.")); return; }
    const gi = g - 1;
    compBox.replaceChildren(h("span", {class:"hint help"}, `Group ${"ABC"[gi]} values are shared by every input linked to group ${"ABC"[gi]}.`),
      row("Attack", ctl("input.compress.attack", [gi])), row("Decay", ctl("input.compress.decay", [gi])),
      row("Threshold", ctl("input.compress.thresh", [gi])), row("Ratio", ctl("input.compress.ratio", [gi])), row("Gain", ctl("input.compress.gain", [gi])));
  });
  const sect = (title, ...kids) => h("section", {class:"isect"}, h("h4", null, title), ...kids);
  const notch = n => h("div", {class:"stack", style:"gap:8px"}, h("span", {class:"lbl"}, `Notch ${n + 1}`),
    row("Enabled", ctl("input.notch.enable", [i, n])), row("Frequency", ctl("input.notch.freq", [i, n])), row("Q", ctl("input.notch.q", [i, n])));
  return h("div", {class:"panel"}, name,
    h("div", {class:"isects"},
      sect("Input",
        row("Name", h("div", {style:"flex:1;min-width:0"}, ctl("input.name", [i]))),
        row("Color", ctl("input.color", [i])),
        ...(isDigitalIn(i) ? [] : [row("Level", ctl("input.level", [i]))]),
        ...(has48V(i) ? [row("48 V", ctl("input.power48V", [i], {red:true}))] : []),
        row("Phase", ctl("input.phase", [i])),
        row("Trim", ctl("input.trim.level", [i])),
        row("Trim mode", ctl("input.trim.mode", [i])),
        row("ZaxNet ID", ctl("input.zaxnet.id", [i], {compact:true, fmt:v => String(v)})),
        row("Source", ctl("input.source", [i], {compact:true, fmt:v => String(v)})),
        row("Processing", ctl("input.eq", [i], {label:"EQ"}), ctl("input.cl", [i], {label:"CL"}), ctl("input.ntc1", [i], {label:"NTC1"}), ctl("input.ntc2", [i], {label:"NTC2"}))),
      sect("Filter & delay",
        row("High-pass", ctl("input.hpf.enable", [i])), row("HPF freq", ctl("input.hpf.freq", [i])),
        row("Delay", ctl("input.delay.enable", [i])), row("Delay time", ctl("input.delay.time", [i]))),
      sect("Compressor",
        row("Enabled", ctl("input.compress.enable", [i])), row("Link group", ctl("input.compress.link", [i], {select:true})), compBox),
      sect("Notch filters", notch(0), notch(1))));
}
function paramRow(s){
  const meta = h("div", {class:"meta"}, h("b", null, label(s)), h("code", null, `#${s.id} ${s.k} · ${s.t}${s.d ? " [" + s.d.join("×") + "]" : ""}${s.r ? ` · ${s.r[0]}…${s.r[1]}${s.u ? " " + s.u : ""}` : ""}`));
  const slot = h("div", {style:"min-width:0;flex:1"});
  const editors = h("div", {class:"idx"});
  const idx = (s.d || []).map(() => 0);
  const draw = () => { viewBinds = viewBinds.filter(b => b.owner !== s.k); const before = viewBinds.length; slot.replaceChildren(s.t === "Table" ? tableView(s) : ctl(s.k, idx.slice())); viewBinds.slice(before).forEach(b => b.owner = s.k); };
  if(s.d && s.t !== "Table") s.d.forEach((n, j) => {
    const sel = h("select", {class:"sel", id:fid(s, []) + "-d" + j, "aria-label":`Index ${j+1} of ${label(s)}`, onchange:e => { idx[j] = +e.target.value; draw(); }}, Array.from({length:n}, (_, x) => h("option", {value:x}, String(x + 1))));
    editors.append(sel);
  });
  draw();
  return h("div", {class:"prm"}, meta, h("div", {class:"idx"}, editors.childElementCount ? editors : null, slot));
}
function tableView(s){ const d = h("div", {class:"ro"}); bind(s.k, [], v => { const rows = (v || []).filter(Boolean); d.textContent = rows.length ? `${rows.length} entries` : "Empty"; }); return d; }

let lockT = null;
function flashLock(){
  let t = document.querySelector(".locktoast");
  if(!t){ t = h("div", {class:"locktoast", role:"status"}, "Track arming is locked while recording. Stop to change it."); document.body.append(t); }
  t.hidden = false; clearTimeout(lockT); lockT = setTimeout(() => t.hidden = true, 2200);
}

/* ---------- Transport + status ---------- */
function updateSlate(){
  const rec = sim.state === "RECORDING";
  $("slScene").textContent = (rec ? get("scene.current") : get("scene.next") || get("scene.current")) || "\u2014";
  $("slTake").textContent = (rec ? get("take.current") : get("take.next") || nextTakeGuess()) || "\u2014";
  $("slSceneLbl").replaceChildren(...(rec ? ["Scene"] : [h("span", {class:"lg"}, "Next "), "Scene"]));
  $("slTakeLbl").replaceChildren(...(rec ? ["Take"] : [h("span", {class:"lg"}, "Next "), "Take"]));
  $("goScene").classList.toggle("live", rec); $("goTake").classList.toggle("live", rec);
}
function renderTransport(){
  if($("slScene")) updateSlate();
  const st = sim.state;
  $("bRec").setAttribute("aria-pressed", st === "RECORDING" ? "true" : "false");
  $("bStop").setAttribute("aria-pressed", st === "STOPPED" ? "true" : "false");
  $("stState").textContent = st;
  document.body.dataset.rec = st === "RECORDING" ? "1" : "0";
  document.querySelectorAll("[data-cmd]").forEach(b => b.setAttribute("aria-pressed", ({RECORD:"RECORDING", STOP:"STOPPED", PLAY:"PLAYING"})[b.dataset.cmd] === st ? "true" : "false"));
  $("tc").classList.toggle("recording", st === "RECORDING");
  $("stState").style.color = st === "RECORDING" ? "var(--rec)" : st === "PLAYING" ? "var(--ok)" : "var(--muted)";
}
function applyLayout(){ document.body.dataset.layout = "console"; readColors(); }
function wireChrome(){
  bind("ui.helptext", [], v => document.body.dataset.help = v ? "1" : "0", true);
  /* Headphone preset in the top bar: shows the current one, tap steps through the presets that are On. */
  const hpLabel = () => {
    if(soloCh != null){ $("hpCur").replaceChildren("SOLO", h("span", {class:"lg"}, " \u00b7 " + inLabel(soloCh))); $("hpBtn").classList.add("solo");
      $("hpBtn").setAttribute("aria-label", `Headphones soloing ${inFull(soloCh)}`); return; }
    $("hpBtn").classList.remove("solo");
    const p = get("hpmix.preset") - 1; $("hpCur").replaceChildren(String(p + 1), h("span", {class:"lg"}, ` \u00b7 ${get("hpmix.names", [p]) || "HP " + (p + 1)}`));
    const on = get("hpmix.enable").slice(0, HP_COUNT).filter(Boolean).length; $("hpBtn").setAttribute("aria-label", `Headphone preset ${$("hpCur").textContent}. ${on} presets on. Tap for the next one.`); };
  refreshHp = hpLabel;
  bind("hpmix.preset", [], hpLabel, true); bind("hpmix.names", [], hpLabel, true); bind("hpmix.enable", [], hpLabel, true);
  $("hpBtn").addEventListener("click", () => {
    const en = get("hpmix.enable"), cur = get("hpmix.preset") - 1;
    for(let k = 1; k <= HP_COUNT; k++){ const n = (((cur + k) % HP_COUNT) + HP_COUNT) % HP_COUNT; if(en[n]){ if(n !== cur){ hpBus2 = false; set("hpmix.preset", [], n + 1); } return; } }
    toast("No headphone presets are on. Turn one on under Routing \u2192 Headphones.");
  });
  $("tabs").append(...VIEWS.map(([v, t]) => h("button", {type:"button", class:"tab", role:"tab", "data-v":v, onclick:() => go(v)}, t)));
  $("bRec").addEventListener("click", () => link.send({op:"CMD", name:"RECORD"}));
  $("bStop").addEventListener("click", () => link.send({op:"CMD", name:"STOP"}));
  $("bTone").addEventListener("click", () => set("tone.enable", [], get("tone.enable") ? 0 : 1));
  [["goScene","scene"],["goTake","take"]].forEach(([id, f]) => $(id).addEventListener("click", () => (sim.state === "RECORDING" ? openCurrentTakeModal : openNextTakeModal)(f, $(id))));
  ["goScene","goTake"].forEach(id => { $(id).setAttribute("aria-haspopup", "dialog"); $(id).title = "Edit the next take, or the current take while recording"; });
  bind("tone.enable", [], v => $("bTone").setAttribute("aria-pressed", v ? "true" : "false"), true);
  ["scene.current","take.current","scene.next","take.next"].forEach(k => bind(k, [], updateSlate, true));
  bind("sample.rate", [], v => $("stRate").textContent = (+S["sample.rate"].m[v] / 1000).toFixed(3).replace(/\.?0+$/, "") + " kHz", true);
  bind("timecode.framerate", [], v => $("stFps").textContent = (FPS[v] || FPS[0]).l, true);
  bind("timecode.displayed", [], v => $("tcLabel").textContent = v === 1 ? "Generator TC" : "Disk TC", true);
}
let lastStatus = 0;
function frame(t){
  const prev = sim.lastT; sim.tick(t); const dt = Math.min(0.1, (t - prev) / 1000);
  const fr = sim.fr();
  let tcFrames = sim.genFrames;
  if(get("timecode.displayed") === 0){ tcFrames = sim.state === "RECORDING" ? sim.genFrames : sim.state === "PLAYING" ? sim.playStart + sim.elapsed * fr.r : sim.genFrames; }
  $("tc").textContent = framesToTC(tcFrames, fr);
  $("stElapsed").textContent = fmtDur(sim.elapsed);
  if(t - lastStatus > 500){
    lastStatus = t;
    $("stDrive").textContent = (() => { const s = V["drive.time.remaining"]; return `${Math.floor(s/3600)}h ${String(Math.floor(s/60)%60).padStart(2,"0")}m`; })();
    $("stBatt").textContent = V["battery.status"].volts.toFixed(1) + " V";
  }
  frameHooks.forEach(f => f(dt));
  requestAnimationFrame(frame);
}

/* ---------- Boot ---------- */
seed();
const hadSaved = load();
if(V["ui.inlayout"] !== 2){ if(hadSaved) seedInputs(); V["ui.inlayout"] = 2; saveSoon(); }
if(V["ui.takemodel"] !== 1){
  const h0 = (V["metadata.history"] || []).find(Boolean);
  if(h0 && h0.scene === V["scene.current"] && /^\d+$/.test(h0.take) && /^\d+$/.test(V["take.current"]) && +V["take.current"] === +h0.take + 1) V["take.current"] = h0.take;
  V["ui.takemodel"] = 1; saveSoon();
}
if(V["ui.compfix"] !== 1){
  if(JSON.stringify(V["input.compress.attack"]) === "[1,1,1]" && JSON.stringify(V["input.compress.ratio"]) === "[1.1,1.1,1.1]"){
    V["input.compress.attack"] = [5, 3, 10]; V["input.compress.decay"] = [60, 40, 80];
    V["input.compress.thresh"] = [-6, -8, -4]; V["input.compress.ratio"] = [3, 4, 2]; V["input.compress.gain"] = [0, 2, 0];
  }
  V["ui.compfix"] = 1; saveSoon();
}
if(V["ui.tmxmode"] !== 1){
  V["trackmix.matrix"].forEach(pr => pr.forEach(row => row.forEach((v, i) => { row[i] = v === 0 ? 0 : v === 7 ? 1 : v === 1 || v === 2 ? v : 2; })));
  V["ui.tmxmode"] = 1; saveSoon();
}
(function migrateOutRoutes(){
  const m = V["outputmix.matrix"][0]; if(m.some(r => r.some(v => v))) return;
  V["output.source"].forEach((src, o) => { if(o < 8 && src >= 1 && src <= 16) m[o][src - 1] = 1; });
})();
syncAllColors("local");
if(V["hpmix.preset"] > HP_COUNT) V["hpmix.preset"] = 1;
if(!presetsList().length){
  const r = (...ts) => Array.from({length:16}, (_, t) => ts.includes(t + 1) ? 1 : 0);
  V["ui.outpresets"] = [{name:"MIX L", r:r(1), a:[1,0,0,0]}, {name:"MIX R", r:r(2), a:[1,0,0,0]}, {name:"MIX L + R", r:r(1, 2), a:[0,0,0,0]}, {name:"BOOM", r:r(3), a:[0,0,0,0]}];
}
/* Presets saved before Tone/Slate/Com were included take them from an output that uses the same routes. */
V["ui.outpresets"].forEach(p => { if(!p || Array.isArray(p.a) || !Array.isArray(p.r)) return;
  const o = Array.from({length:8}, (_, k) => k).find(k => JSON.stringify(rowOf(k)) === JSON.stringify(p.r));
  p.a = o == null ? [0, 0, 0, 0] : addsOf(o); });
sim.init();
seedDevice();
wireChrome();
applyLayout();
let startTab = "home"; try{ startTab = localStorage.getItem("cart-remote-tab") || "home"; }catch(e){}
const hashTab = (location.hash || "").slice(1); if(VIEWS.some(v => v[0] === hashTab)) startTab = hashTab;
go(VIEWS.some(v => v[0] === startTab) ? startTab : "home");
renderTransport();
setCartStatus(false); $("linkText").textContent = "Connecting\u2026";
net.connect();
requestAnimationFrame(t => { sim.lastT = t; requestAnimationFrame(frame); });
