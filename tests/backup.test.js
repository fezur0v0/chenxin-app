import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,addDraftMessage,normalizeState,STORAGE_KEY,exportData} from '../src/store.js';
import {trackFromFile} from '../src/apps/music/model.js';
import {saveAlbum,addUploadedPhotos} from '../src/apps/gallery/model.js';
import {createArchive,inspectArchive,restoreArchive,mediaReferences,MAX_ARCHIVE_BYTES} from '../src/backup/model.js';
import {memorySnapshots} from '../src/backup/snapshots.js';
import {zipSync,unzipSync,strToU8,strFromU8} from '../src/vendor/fflate.js';
function memoryMedia(){
 const maps={music:new Map(),voice:new Map()},writes=[];
 const stores=Object.fromEntries(Object.keys(maps).map(kind=>[kind,async(id,file)=>{if(file===undefined)return maps[kind].get(id);writes.push({kind,id,remove:file===null});if(file===null)maps[kind].delete(id);else maps[kind].set(id,file);} ]));
 return {maps,stores,writes};
}
function storage(initial='old-state'){const map=new Map([[STORAGE_KEY,initial]]);return {getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};}
function fixture(){
 const state=createState(),media=memoryMedia(),song=new File([new Uint8Array([1,2,3,4])],'a.wav',{type:'audio/wav',lastModified:1234}),voice=new File([new Uint8Array([5,6,7])],'voice.wav',{type:'audio/wav',lastModified:2345});
 const track=trackFromFile(song);state.music.tracks=[track];state.music.playlists=[{id:'playlist',title:'喜欢',description:'',cover:'',created:1000,trackIds:[track.id]}];state.music.currentId=track.id;state.music.queue=[track.id];
 media.maps.music.set(track.id,song);media.maps.voice.set('shared-voice',voice);
 const attachment={id:'voice-one',name:'voice.wav',kind:'voice',size:voice.size,type:voice.type,voice:{fileId:'shared-voice',duration:1,peaks:[.1,.9],transcript:'提供的文字'}};
 addDraftMessage(state,'声音',[attachment]);addDraftMessage(state,'另一处引用',[{...attachment,id:'voice-two'}]);
 const album=saveAlbum(state.gallery,{name:'照片'});addUploadedPhotos(state.gallery,[{name:'图片',data:'data:image/png;base64,aGVsbG8=',time:1000}],album.id);
 state.home.note='原有便签';state.backupSettings.dailyEnabled=false;return {state,media,track,song,voice};
}
const asFile=bundle=>new File([bundle.blob],'backup.zip',{type:'application/zip'});
async function modified(bundle,change){const entries=unzipSync(new Uint8Array(await bundle.blob.arrayBuffer()));change(entries);return new File([zipSync(entries,{level:0})],'changed.zip');}

test('portable ZIP restores media bytes, remaps IDs and preserves playlists, shared voice references and settings',async()=>{
 const f=fixture(),bundle=await createArchive(f.state,f.media.stores),preview=await inspectArchive(asFile(bundle)),destination=memoryMedia(),saved=storage();
 assert.equal(bundle.manifest.media.length,2);assert.equal(bundle.manifest.missing.length,0);assert.equal(mediaReferences(f.state).length,2);
 const restored=await restoreArchive(preview,{stores:destination.stores,storage:saved});
 const track=restored.music.tracks[0];assert.notEqual(track.id,f.track.id);assert.deepEqual(restored.music.queue,[track.id]);assert.deepEqual(restored.music.playlists[0].trackIds,[track.id]);assert.equal(restored.music.currentId,track.id);
 assert.deepEqual(new Uint8Array(await destination.maps.music.get(track.id).arrayBuffer()),new Uint8Array(await f.song.arrayBuffer()));
 const voices=restored.sessions[0].messages.map(m=>m.attachments[0].voice.fileId);assert.equal(voices[0],voices[1]);assert.notEqual(voices[0],'shared-voice');assert.deepEqual(new Uint8Array(await destination.maps.voice.get(voices[0]).arrayBuffer()),new Uint8Array(await f.voice.arrayBuffer()));
 assert.equal(restored.home.note,'原有便签');assert.deepEqual(restored.gallery,normalizeState(f.state).gallery);assert.deepEqual(restored.backupSettings,f.state.backupSettings);assert.deepEqual(JSON.parse(saved.getItem(STORAGE_KEY)),restored);
 assert.equal(f.state.music.currentId,f.track.id);assert.equal(f.media.writes.length,0);
});
test('metadata and media corruption are detected before any restore writes',async()=>{
 const f=fixture(),bundle=await createArchive(f.state,f.media.stores);
 await assert.rejects(inspectArchive(await modified(bundle,entries=>{entries['data.json'][10]^=1;})),/校验失败/);
 await assert.rejects(inspectArchive(await modified(bundle,entries=>{const name=Object.keys(entries).find(p=>p.startsWith('media/'));entries[name][0]^=1;})),/校验失败/);
 assert.equal(f.media.writes.length,0);
});
test('unsupported versions, unexpected paths and missing manifest references are rejected',async()=>{
 const f=fixture(),bundle=await createArchive(f.state,f.media.stores);
 const manifestChange=change=>modified(bundle,entries=>{const manifest=JSON.parse(strFromU8(entries['manifest.json']));change(manifest);entries['manifest.json']=strToU8(JSON.stringify(manifest));});
 await assert.rejects(inspectArchive(await manifestChange(m=>m.version=99)),/版本/);
 await assert.rejects(inspectArchive(await modified(bundle,entries=>entries['../escape']=strToU8('bad'))),/路径/);
 await assert.rejects(inspectArchive(await manifestChange(m=>m.media.pop())),/缺项|多余/);
});
test('ZIP size declarations are checked before decompression allocation',async()=>{
 const bytes=zipSync({'data.json':[strToU8('{}'),{level:0}]},{level:0});
 const central=bytes.findIndex((_,i)=>bytes[i]===0x50&&bytes[i+1]===0x4b&&bytes[i+2]===1&&bytes[i+3]===2);
 new DataView(bytes.buffer).setUint32(central+24,MAX_ARCHIVE_BYTES+1,true);
 await assert.rejects(inspectArchive(new File([bytes],'oversize.zip')),/大小|256MB/);
});
test('missing files are explicit, and restore does not attach unrelated destination audio with the same old ID',async()=>{
 const f=fixture();f.media.maps.voice.delete('shared-voice');const bundle=await createArchive(f.state,f.media.stores);assert.equal(bundle.manifest.missing.length,1);
 const preview=await inspectArchive(await modified(bundle,entries=>{const m=JSON.parse(strFromU8(entries['manifest.json']));m.missing[0].name={toString:0,valueOf:0};entries['manifest.json']=strToU8(JSON.stringify(m));})),destination=memoryMedia(),unrelated=new File(['unrelated'],'other.wav');assert.equal(preview.missing[0].name,'voice.wav');destination.maps.voice.set('shared-voice',unrelated);
 const restored=await restoreArchive(preview,{stores:destination.stores,storage:storage()}),id=restored.sessions[0].messages[0].attachments[0].voice.fileId;
 assert.notEqual(id,'shared-voice');assert.equal(destination.maps.voice.get(id),undefined);assert.equal(destination.maps.voice.get('shared-voice'),unrelated);
});
test('failed staged audio writes clean up new files and preserve the previous state and original files',async()=>{
 const f=fixture(),preview=await inspectArchive(asFile(await createArchive(f.state,f.media.stores))),destination=memoryMedia(),saved=storage();
 destination.maps.music.set('original',f.song);const baseVoice=destination.stores.voice;destination.stores.voice=async(id,file)=>{if(file&&file!==null)throw Error('quota');return baseVoice(id,file);};
 await assert.rejects(restoreArchive(preview,{stores:destination.stores,storage:saved}),/原有数据和音频已保留/);
 assert.equal(saved.getItem(STORAGE_KEY),'old-state');assert.deepEqual([...destination.maps.music.keys()],['original']);assert.equal(destination.maps.music.get('original'),f.song);assert.equal(destination.maps.voice.size,0);
});
test('metadata quota errors roll back staged media without overwriting existing IDs',async()=>{
 const f=fixture(),preview=await inspectArchive(asFile(await createArchive(f.state,f.media.stores))),destination=memoryMedia();destination.maps.music.set(f.track.id,f.song);
 await assert.rejects(restoreArchive(preview,{stores:destination.stores,storage:{setItem(){throw Error('quota');}}}),/原有数据/);
 assert.deepEqual([...destination.maps.music.keys()],[f.track.id]);assert.equal(destination.maps.voice.size,0);
});
test('canceling a restore after a staged write removes its staged files and keeps old metadata',async()=>{
 const f=fixture(),preview=await inspectArchive(asFile(await createArchive(f.state,f.media.stores))),destination=memoryMedia(),saved=storage(),controller=new AbortController(),original=destination.stores.music;
 destination.stores.music=async(id,file)=>{await original(id,file);if(file)controller.abort();};
 await assert.rejects(restoreArchive(preview,{stores:destination.stores,storage:saved,signal:controller.signal}),{name:'AbortError'});
 assert.equal(destination.maps.music.size,0);assert.equal(saved.getItem(STORAGE_KEY),'old-state');
});
test('legacy JSON including UTF-8 BOM restores old schemas and retains existing browser media IDs',async()=>{
 const f=fixture();f.state.version=1;delete f.state.gallery;delete f.state.backupSettings;
 const preview=await inspectArchive(new File(['\uFEFF'+exportData(f.state)],'old.json'));
 assert.equal(preview.kind,'json');assert.equal(preview.files.length,0);assert.equal(preview.state.gallery.photos.length,0);assert.equal(preview.state.backupSettings.keep,5);
 const destination=memoryMedia(),restored=await restoreArchive(preview,{stores:destination.stores,storage:storage()});assert.equal(restored.music.tracks[0].id,f.track.id);assert.equal(destination.writes.length,0);
});
test('snapshot retention keeps newest archives, supports pruning, and leaves other snapshot stores isolated',async()=>{
 const first=memorySnapshots(),second=memorySnapshots();for(let i=0;i<5;i++)await first.put({id:String(i),createdAt:i,reason:i===0?'auto':'manual',day:'2026-10-17',archive:new Blob([String(i)])},3);
 assert.deepEqual((await first.list()).map(x=>x.id),['4','3','2']);assert.equal((await second.list()).length,0);assert.equal(await first.autoDay(),'2026-10-17');assert.equal(await second.autoDay(),'');assert.equal(await (await first.get('4')).archive.text(),'4');await first.trim(1);assert.equal((await first.list()).length,1);await first.remove('4');assert.equal((await first.list()).length,0);
});
