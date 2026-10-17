import {normalizeState,exportData,localDate} from '../store.js';
import {createArchive,inspectArchive,restoreArchive,summarize} from './model.js';
import {snapshotStore} from './snapshots.js';
import {backupPanel,backupSheet} from './view.js';
import {animateDrawerClose,bindDrawerDismiss} from '../drawer.js';
export function createBackupManager({app,getState,storage,media,snapshots=snapshotStore,persist,applyRestored,notify,canStart=()=>true,allowAuto=true}){
 const ui={busy:false,progress:'',status:'',error:'',screen:'',snapshots:[],safety:true,preview:null,bundle:null,deleteItem:null};
 const picker=document.createElement('input');picker.id='import-data';picker.type='file';picker.accept='.zip,.json,application/zip,application/json';picker.hidden=true;document.body.append(picker);
 const sheet=document.createElement('dialog');sheet.className='backup-sheet glass app-sheet bottom-sheet';sheet.setAttribute('aria-label','备份管理');document.body.append(sheet);
 let job=null,closing=false,revision=0,returnFocus=null;
 function paintPanel(){const node=app.querySelector('[data-backup-panel]');if(node)node.outerHTML=backupPanel(getState(),ui);}
 function paintSheet(){
  if(!sheet.open||!ui.screen)return;
  const active=sheet.contains(document.activeElement)?document.activeElement:null,action=active?.dataset.backupAction,id=active?.dataset.id;
  sheet.innerHTML=backupSheet(ui.screen,getState(),ui);
  const target=action?sheet.querySelector(`[data-backup-action="${CSS.escape(action)}"]${id?`[data-id="${CSS.escape(id)}"]`:''}`):null;
  (target&&!target.disabled?target:sheet.querySelector('.drawer-handle'))?.focus({preventScroll:true});
 }
 function progress(value){ui.progress=value;for(const node of [app.querySelector('[data-backup-status]'),sheet.querySelector('[data-backup-progress]')])if(node)node.textContent=value;}
 function show(screen){
  if(!sheet.open)returnFocus=document.activeElement;
  revision++;closing=false;sheet.style.transform='';sheet.getAnimations().forEach(animation=>animation.cancel());ui.screen=screen;
  sheet.innerHTML=backupSheet(screen,getState(),ui);if(!sheet.open)sheet.showModal();sheet.querySelector('.drawer-handle')?.focus({preventScroll:true});
 }
 async function close(){
  if(!sheet.open||closing)return;closing=true;job?.abort();const current=revision;await animateDrawerClose(sheet);if(current!==revision)return;sheet.close();closing=false;
 }
 bindDrawerDismiss(sheet,{panel:()=>sheet.open&&!closing?sheet:null,close,backdrop:true});
 sheet.addEventListener('cancel',event=>{event.preventDefault();void close();});
 sheet.addEventListener('close',()=>{if(sheet.open)return;revision++;closing=false;sheet.style.transform='';sheet.getAnimations().forEach(animation=>animation.cancel());ui.screen='';ui.bundle=null;ui.preview=null;ui.error='';const fallback=app.querySelector(`[data-backup-action="${CSS.escape(returnFocus?.dataset.backupAction||'import')}"]`);(returnFocus?.isConnected?returnFocus:fallback)?.focus({preventScroll:true});});
 async function run(operation,{silent=false}={}){
  if(ui.busy)return null;
  if(!canStart()){if(!silent)notify('请等正在导入的音乐、语音或照片完成后再备份或恢复。');return null;}
  const controller=new AbortController();job=controller;ui.busy=true;ui.error='';paintPanel();paintSheet();
  try{return await operation(controller.signal);}
  catch(error){
   if(error.name!=='AbortError'){
    ui.error=error.message||'备份操作未完成。';ui.status=ui.error;
    if(!silent){if(sheet.open)paintSheet();else notify(ui.error);}
   }
   return null;
  }finally{if(job===controller){job=null;ui.busy=false;ui.progress='';paintPanel();paintSheet();}}
 }
 function filename(kind,extension='zip'){const d=new Date();return `chenxin-${kind}-${localDate(d)}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.${extension}`;}
 function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 async function makeSnapshot(reason,signal){
  const result=await createArchive(getState(),media,{signal,onProgress:progress});
  if(signal.aborted)throw new DOMException('操作已取消。','AbortError');
  const record={id:crypto.randomUUID(),createdAt:Date.parse(result.manifest.createdAt),day:localDate(),reason,bytes:result.blob.size,summary:result.summary,missing:result.manifest.missing.length,archive:result.blob};
  await snapshots.put(record,getState().backupSettings.keep);ui.snapshots=await snapshots.list();return record;
 }
 async function inspect(file){
  if(ui.busy)return;if(!canStart())return notify('请等正在导入的文件完成后再恢复。');ui.preview=null;ui.safety=true;ui.error='';ui.progress='正在读取备份…';show('progress');
  await run(async signal=>{const result=await inspectArchive(file,{signal,onProgress:progress});if(signal.aborted)return;ui.preview=result;ui.progress='';show('restore');});
 }
 async function restore(){
  const preview=ui.preview;if(!preview||ui.busy)return;
  await run(async signal=>{
   if(ui.safety){progress('正在保存恢复前的快照…');await makeSnapshot('before-restore',signal);}
   const state=await restoreArchive(preview,{stores:media,storage,signal,onProgress:progress});
   ui.status='备份已恢复，音频不会自动播放。';sheet.close();applyRestored(state);
   try{await snapshots.trim(state.backupSettings.keep);ui.snapshots=await snapshots.list();}catch{ui.status='备份已恢复；旧快照会在下次保存时整理。';}
   notify('备份已恢复。');
  });
 }
 async function list(){if(ui.busy)return;ui.error='';show('snapshots');await run(async()=>{ui.snapshots=await snapshots.list();});}
 function exportJSON(){
  if(ui.busy)return;
  try{const state=normalizeState(structuredClone(getState()));download(new Blob([exportData(state)],{type:'application/json'}),filename('light','json'));ui.status='轻量 JSON 已交给浏览器下载；音频原文件未打包。';paintPanel();}catch(error){notify(error.message);}
 }
 function handle(event){
  const button=event.target.closest('[data-backup-action]');if(!button)return;const action=button.dataset.backupAction,id=button.dataset.id;
  if(action==='close'){void close();return;}
  if(ui.busy)return;
  if(!canStart())return notify('请等正在导入的文件完成后再备份或恢复。');
  if(action==='export-full'){
   ui.error='';ui.progress='正在收集备份内容…';show('progress');void run(async signal=>{ui.bundle=await createArchive(getState(),media,{signal,onProgress:progress});if(!signal.aborted){ui.progress='';show('export');}});
  }
  if(action==='download-full'&&ui.bundle){download(ui.bundle.blob,filename('full'));ui.status='备份包已交给浏览器下载，请留意下载记录。';paintPanel();}
  if(action==='export-json')exportJSON();
  if(action==='import'){returnFocus=button;picker.value='';picker.click();}
  if(action==='snapshots'||action==='show-snapshots')void list();
  if(action==='create-snapshot')void run(async signal=>{await makeSnapshot('manual',signal);ui.status='本机快照已保存。';});
  if(action==='confirm-restore')void restore();
  if(action==='restore-snapshot'){
   ui.safety=true;ui.progress='正在读取快照…';show('progress');void run(async signal=>{const record=await snapshots.get(id);if(!record)throw new Error('这份快照已不存在。');if(signal.aborted)return;ui.preview=await inspectArchive(new File([record.archive],`快照-${localDate(new Date(record.createdAt))}.zip`,{type:'application/zip'}),{signal,onProgress:progress});if(!signal.aborted){ui.progress='';show('restore');}});
  }
  if(action==='download-snapshot')void run(async signal=>{const record=await snapshots.get(id);if(!record)throw new Error('这份快照已不存在。');if(!signal.aborted)download(record.archive,`chenxin-snapshot-${record.createdAt}.zip`);});
  if(action==='delete-snapshot'){ui.deleteItem=ui.snapshots.find(item=>item.id===id);if(ui.deleteItem)show('delete');}
  if(action==='confirm-delete'&&ui.deleteItem)void run(async()=>{await snapshots.remove(ui.deleteItem.id);ui.snapshots=await snapshots.list();ui.deleteItem=null;show('snapshots');});
 }
 app.addEventListener('click',handle);sheet.addEventListener('click',handle);
 picker.addEventListener('change',()=>{const file=picker.files?.[0];picker.value='';if(file)void inspect(file);});
 sheet.addEventListener('change',event=>{if(event.target.matches('[data-backup-safety]'))ui.safety=event.target.checked;});
 app.addEventListener('change',async event=>{
  const target=event.target,key=target.dataset.backupPreference;if(!key||ui.busy)return;
  const previous={...getState().backupSettings};getState().backupSettings[key]=key==='dailyEnabled'?target.checked:Number(target.value);
  if(!persist())getState().backupSettings=previous;
  else if(key==='keep')try{await snapshots.trim(getState().backupSettings.keep);ui.snapshots=await snapshots.list();}catch(error){ui.status=error.message;}
  paintPanel();app.querySelector(`[data-backup-preference="${key}"]`)?.focus({preventScroll:true});
 });
 async function maybeAuto(){
  if(!allowAuto||ui.busy||document.visibilityState!=='visible'||!getState().backupSettings.dailyEnabled||!canStart())return;
  const state=getState(),count=summarize(state);
  if(!count.messages&&!count.photos&&!count.diaries&&!count.memories&&!count.tracks&&!count.worldbooks&&!count.presets&&!state.home.note&&!state.persona.prompt&&!state.appearance.wallpaper&&!state.plugins.length&&!state.provider.model)return;
  await run(async signal=>{ui.snapshots=await snapshots.list();if(await snapshots.autoDay()===localDate()||ui.snapshots.some(item=>item.reason==='auto'&&localDate(new Date(item.createdAt))===localDate()))return;await makeSnapshot('auto',signal);ui.status='今天的本机快照已保存。';},{silent:true});
 }
 let timer=setTimeout(()=>void maybeAuto(),1600);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){clearTimeout(timer);timer=setTimeout(()=>void maybeAuto(),1000);}});
 return {ui,inspect,maybeAuto,exportJSON};
}
