import {normalizeState,STORAGE_KEY} from '../store.js';
import {zipSync,unzipSync,strToU8,strFromU8} from '../vendor/fflate.js';

export const MAX_ARCHIVE_BYTES=256*1024*1024;
export const MAX_STATE_BYTES=16*1024*1024;
const MAX_ENTRIES=4096,FORMAT='chenxin-backup',VERSION=1;
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const check=signal=>{if(signal?.aborted)throw new DOMException('操作已取消。','AbortError');};
export const bytesLabel=value=>value>=1024*1024?`${(value/1024/1024).toFixed(1)} MB`:`${(value/1024).toFixed(1)} KB`;
export async function sha256(bytes){
 if(!globalThis.crypto?.subtle)throw new Error('浏览器无法校验备份，请使用 HTTPS 或本机地址打开。');
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
}
export function summarize(state){
 return {sessions:state.sessions.length,messages:state.sessions.reduce((n,s)=>n+s.messages.length,0),photos:state.gallery.photos.length,albums:state.gallery.albums.length,diaries:state.diaryEntries.length,memories:state.memories.length,tracks:state.music.tracks.length,voices:state.sessions.reduce((n,s)=>n+s.messages.reduce((n,m)=>n+(m.attachments||[]).filter(a=>a.kind==='voice').length,0),0),worldbooks:state.worldbooks.length,presets:state.promptPresets.length};
}
export function mediaReferences(state){
 const refs=new Map();
 for(const track of state.music.tracks)refs.set(`music/${track.id}`,{kind:'music',id:track.id,name:track.fileName||track.title,type:track.type});
 for(const session of state.sessions)for(const message of session.messages)for(const attachment of message.attachments||[])if(attachment.kind==='voice'&&attachment.voice?.fileId){
  const id=attachment.voice.fileId;refs.set(`voice/${id}`,{kind:'voice',id,name:attachment.name,type:attachment.type});
 }
 return [...refs.values()];
}
export async function createArchive(value,stores,{signal,onProgress=()=>{}}={}){
 const state=normalizeState(structuredClone(value)),createdAt=new Date().toISOString(),stateBytes=strToU8(JSON.stringify(state));
 if(stateBytes.length>MAX_STATE_BYTES)throw new Error('文字和图片数据超过 16MB，暂时无法打包。');
 const references=mediaReferences(state);if(references.length+2>MAX_ENTRIES)throw new Error('音频文件数量过多，请分批保留后再备份。');
 const entries={'data.json':[stateBytes,{level:6}]},media=[],missing=[];let total=stateBytes.length;
 check(signal);onProgress('正在校验文字与图片…');const stateHash=await sha256(stateBytes);
 for(const [index,ref]of references.entries()){
  check(signal);onProgress(`正在收集音频 ${index+1} / ${references.length}…`);await tick();
  const file=await stores[ref.kind](ref.id);check(signal);
  if(!file){missing.push(ref);continue;}
  if(!(file instanceof Blob))throw new Error('本机音频格式异常，未能生成备份。');
  const limit=ref.kind==='music'?80*1024*1024:10*1024*1024;
  if(file.size>limit)throw new Error(`音频「${ref.name}」超过支持的大小。`);
  total+=file.size;if(total>MAX_ARCHIVE_BYTES)throw new Error('备份超过 256MB，请减少音乐文件后重试。');
  const bytes=new Uint8Array(await file.arrayBuffer()),path=`media/${ref.kind}/${index}.bin`;
  const hash=await sha256(bytes);check(signal);entries[path]=[bytes,{level:0}];
  media.push({...ref,path,size:bytes.length,sha256:hash,name:(file.name||ref.name||'音频').slice(0,240),type:(file.type||ref.type||'application/octet-stream').slice(0,100),lastModified:Number.isFinite(file.lastModified)?file.lastModified:Date.now()});
 }
 const manifest={format:FORMAT,version:VERSION,createdAt,kind:'full',state:{path:'data.json',size:stateBytes.length,sha256:stateHash},media,missing};
 const manifestBytes=strToU8(JSON.stringify(manifest));
 if(manifestBytes.length>1024*1024)throw new Error('备份清单超过 1MB，请减少一次备份的音频记录。');
 if(total+manifestBytes.length>MAX_ARCHIVE_BYTES)throw new Error('备份超过 256MB，请减少音乐文件后重试。');
 entries['manifest.json']=[manifestBytes,{level:6}];
 onProgress('正在生成备份包…');await tick();check(signal);const bytes=zipSync(entries,{level:0});
 if(bytes.length>MAX_ARCHIVE_BYTES)throw new Error('备份包超过 256MB，请减少音乐文件后重试。');
 check(signal);return {blob:new Blob([bytes],{type:'application/zip'}),manifest,summary:summarize(state),state};
}
function parseJSON(bytes,label){try{return JSON.parse(strFromU8(bytes).replace(/^\uFEFF/,''));}catch{throw new Error(`${label}损坏或格式不正确。`);}}
const validHash=hash=>typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash);
export async function inspectArchive(file,{signal,onProgress=()=>{}}={}){
 if(!file.size||file.size>MAX_ARCHIVE_BYTES)throw new Error('请选择 256MB 以内的备份文件。');
 onProgress('正在读取备份…');const raw=new Uint8Array(await file.arrayBuffer());check(signal);
 if(raw[0]!==0x50||raw[1]!==0x4b){
  if(raw.length>MAX_STATE_BYTES)throw new Error('JSON 备份超过 16MB。');
  const source=parseJSON(raw,'JSON 备份'),state=normalizeState(source);
  return {state,files:[],missing:mediaReferences(state),kind:'json',createdAt:typeof source.exportedAt==='string'?source.exportedAt:'',name:file.name||'JSON 备份',summary:summarize(state)};
 }
 let total=0,count=0;const names=new Set();let entries;
 try{entries=unzipSync(raw,{filter:entry=>{
  if(++count>MAX_ENTRIES||names.has(entry.name))throw new Error('备份存在重复文件或文件数量过多。');
  names.add(entry.name);
  if(![0,8].includes(entry.compression)||entry.compression===0&&entry.size!==entry.originalSize)throw new Error('备份压缩格式或大小不正确。');
  if(!['manifest.json','data.json'].includes(entry.name)&&!/^media\/(music|voice)\/\d+\.bin$/.test(entry.name))throw new Error('备份包含无法识别的文件路径。');
  if(!Number.isSafeInteger(entry.originalSize)||entry.originalSize<0||(total+=entry.originalSize)>MAX_ARCHIVE_BYTES)throw new Error('备份解压后超过 256MB。');
  if(entry.name==='manifest.json'&&entry.originalSize>1024*1024||entry.name==='data.json'&&entry.originalSize>MAX_STATE_BYTES)throw new Error('备份说明或数据文件过大。');
  return true;
 }});}catch(error){throw new Error(error.message?.startsWith('备份')?error.message:'无法打开这个 ZIP 备份，文件可能已经损坏。');}
 check(signal);if(!entries['manifest.json']||!entries['data.json'])throw new Error('这不是尘的完整备份包。');
 const manifest=parseJSON(entries['manifest.json'],'备份说明');
 if(manifest.format!==FORMAT||manifest.version!==VERSION||manifest.kind!=='full')throw new Error('备份版本暂不支持，请使用兼容版本的 App。');
 if(!manifest.state||manifest.state.path!=='data.json'||manifest.state.size!==entries['data.json'].length||!validHash(manifest.state.sha256)||!Array.isArray(manifest.media)||!Array.isArray(manifest.missing))throw new Error('备份清单不完整。');
 onProgress('正在校验文字与图片…');await tick();if(await sha256(entries['data.json'])!==manifest.state.sha256)throw new Error('文字或图片校验失败，原数据未修改。');check(signal);
 const state=normalizeState(parseJSON(entries['data.json'],'备份数据')),refs=new Map(mediaReferences(state).map(ref=>[`${ref.kind}/${ref.id}`,ref])),seen=new Set(),paths=new Set(['manifest.json','data.json']),files=[],missing=[];
 for(const [index,item]of manifest.media.entries()){
  check(signal);onProgress(`正在校验音频 ${index+1} / ${manifest.media.length}…`);await tick();
  const key=`${item?.kind}/${item?.id}`,bytes=entries[item?.path];
  if(!refs.has(key)||seen.has(key)||typeof item.path!=='string'||!new RegExp(`^media/${item.kind}/\\d+\\.bin$`).test(item.path)||paths.has(item.path)||!bytes||bytes.length!==item.size||!validHash(item.sha256)||typeof item.name!=='string'||item.name.length>240||typeof item.type!=='string'||item.type.length>100)throw new Error('音频文件与备份清单不一致。');
  if(bytes.length>(item.kind==='music'?80*1024*1024:10*1024*1024))throw new Error('音频文件超过支持的大小。');
  if(await sha256(bytes)!==item.sha256)throw new Error(`音频「${item.name}」校验失败，原数据未修改。`);
  seen.add(key);paths.add(item.path);files.push({kind:item.kind,id:item.id,file:new File([bytes],item.name,{type:item.type,lastModified:Number.isFinite(item.lastModified)?item.lastModified:Date.now()})});
 }
 for(const item of manifest.missing){const key=`${item?.kind}/${item?.id}`;if(!refs.has(key)||seen.has(key))throw new Error('缺失音频清单不正确。');seen.add(key);missing.push(refs.get(key));}
 if(seen.size!==refs.size||paths.size!==Object.keys(entries).length)throw new Error('备份清单有缺项或多余文件。');
 if(typeof manifest.createdAt!=='string'||!Number.isFinite(Date.parse(manifest.createdAt)))throw new Error('备份日期损坏。');
 check(signal);return {state,files,missing,kind:'full',createdAt:manifest.createdAt,name:file.name||'完整备份',summary:summarize(state)};
}
export async function restoreArchive(preview,{stores,storage,signal,onProgress=()=>{}}){
 const state=normalizeState(structuredClone(preview.state)),staged=[],mapping=new Map();
 try{
  if(preview.kind==='full'){
   for(const ref of mediaReferences(state))mapping.set(`${ref.kind}/${ref.id}`,crypto.randomUUID());
   for(const [index,item]of preview.files.entries()){
    check(signal);onProgress(`正在恢复音频 ${index+1} / ${preview.files.length}…`);
    const id=mapping.get(`${item.kind}/${item.id}`);if(!id)throw new Error('音频索引不完整。');
    staged.push({kind:item.kind,id});await stores[item.kind](id,item.file);check(signal);
   }
   for(const track of state.music.tracks)track.id=mapping.get(`music/${track.id}`);
   for(const list of state.music.playlists)list.trackIds=list.trackIds.map(id=>mapping.get(`music/${id}`));
   state.music.queue=state.music.queue.map(id=>mapping.get(`music/${id}`));state.music.currentId=state.music.currentId?mapping.get(`music/${state.music.currentId}`):'';
   for(const session of state.sessions)for(const message of session.messages)for(const attachment of message.attachments||[])if(attachment.kind==='voice')attachment.voice.fileId=mapping.get(`voice/${attachment.voice.fileId}`);
  }
  check(signal);onProgress('正在保存记录与设置…');check(signal);storage.setItem(STORAGE_KEY,JSON.stringify(state));return state;
 }catch(error){
  await Promise.allSettled(staged.map(item=>stores[item.kind](item.id,null)));
  if(error.name==='AbortError')throw error;
  throw new Error(error.message?.includes('音频索引')?error.message:'恢复未完成，原有数据和音频已保留。请检查本机储存空间后重试。');
 }
}
