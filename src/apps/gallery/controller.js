import {gallery,gallerySheet,galleryViewer} from './view.js';
import {albumPhotos,GALLERY_COLLECTIONS,saveAlbum,addUploadedPhotos,movePhotos,deletePhotos,deleteAlbum,updatePhoto,saveChatPhoto} from './model.js';
import {animateDrawerClose,bindDrawerDismiss} from '../../drawer.js';
export function createGalleryApp({app,getState,setState,persist,notify,compressImage}){
 const ui={albumId:'',selecting:false,selected:[],busy:false};
 const picker=document.createElement('input');picker.type='file';picker.multiple=true;picker.accept='image/jpeg,image/png,image/webp';picker.hidden=true;picker.dataset.galleryFiles='';document.body.append(picker);
 const sheet=document.createElement('dialog');sheet.className='gallery-sheet glass app-sheet bottom-sheet';document.body.append(sheet);
 const viewer=document.createElement('dialog');viewer.className='gallery-viewer glass';viewer.setAttribute('aria-label','照片预览');document.body.append(viewer);
 let importTarget='',importRevision=0,sheetRevision=0,closing=false,sheetKind='',moveAfterCreate=false,returnFocus=null,viewerPhoto='',viewerReturn='',swipe=null;
 const data=()=>getState().gallery;
 function refresh(focus,top=false){
  const scope=app.querySelector('.gallery-app');if(!scope)return;
  if(ui.albumId&&!GALLERY_COLLECTIONS.includes(ui.albumId)&&!data().albums.some(a=>a.id===ui.albumId)){ui.albumId='';ui.selecting=false;ui.selected=[];}
  const visible=new Set(albumPhotos(data(),ui.albumId||'all').map(p=>p.id));ui.selected=ui.selected.filter(id=>visible.has(id));
  const scroller=app.querySelector('.page-content'),scroll=scroller.scrollTop;
  scope.innerHTML=gallery(getState(),ui);scroller.scrollTop=top?0:scroll;
  if(focus)scope.querySelector(focus)?.focus({preventScroll:true});
 }
 function commit(change){
  const previous=structuredClone(data());
  try{const result=change();if(!persist())throw new Error('图库尚未保存，本机存储不足或不可用。请导出备份、减少一次上传的照片后重试。');return result??true;}
  catch(error){setState({...getState(),gallery:previous});const alert=sheet.open&&sheet.querySelector('[role=alert]');if(alert){alert.hidden=false;alert.textContent=error.message;}else notify(error.message);return null;}
 }
 async function close(){if(!sheet.open||closing)return;closing=true;const ticket=sheetRevision;await animateDrawerClose(sheet);if(ticket!==sheetRevision)return;sheet.close();closing=false;}
 bindDrawerDismiss(sheet,{panel:()=>sheet.open&&!closing?sheet:null,close,backdrop:true});
 sheet.addEventListener('cancel',event=>{event.preventDefault();void close();});
 sheet.addEventListener('close',()=>{if(sheet.open)return;sheetRevision++;closing=false;sheet.style.transform='';sheet.getAnimations().forEach(a=>a.cancel());const fallback=viewer.open?viewer.querySelector('[data-gallery-action=edit-photo]'):app.querySelector('.gallery-header button:last-child');(returnFocus?.isConnected?returnFocus:fallback)?.focus({preventScroll:true});});
 function openSheet(kind,item=null,{moving=false}={}){
  if(!sheet.open)returnFocus=document.activeElement;
  sheetRevision++;closing=false;sheet.style.transform='';sheet.getAnimations().forEach(a=>a.cancel());sheetKind=kind;moveAfterCreate=moving;
  sheet.innerHTML=gallerySheet(kind,getState(),ui,item);sheet.setAttribute('aria-label',kind==='album'?'相册编辑':kind==='photo'?'照片信息':kind==='move'?'移动照片':'删除确认');
  const name=sheet.querySelector('[name=name]');if(name){name.required=true;name.maxLength=kind==='album'?60:180;}
  const date=sheet.querySelector('[name=date]');if(date){date.required=true;date.min='0001-01-01T00:00';date.max='9999-12-31T23:59';}
  if(!sheet.open)sheet.showModal();(name||sheet.querySelector('.drawer-handle')).focus({preventScroll:true});
 }
 function renderViewer(){
  const photos=albumPhotos(data(),ui.albumId||'all'),index=photos.findIndex(p=>p.id===viewerPhoto);
  if(index<0){if(viewer.open)viewer.close();return;}
  viewer.innerHTML=galleryViewer(photos[index],index,photos.length);
 }
 function openViewer(id){viewerPhoto=id;viewerReturn=id;renderViewer();if(!viewer.querySelector('img'))return;viewer.showModal();viewer.querySelector('.nav-back').focus({preventScroll:true});}
 function step(delta){const photos=albumPhotos(data(),ui.albumId||'all'),index=photos.findIndex(p=>p.id===viewerPhoto),next=photos[index+delta];if(next){viewerPhoto=next.id;renderViewer();const control=viewer.querySelector(`[data-gallery-action=${delta>0?'next-photo':'previous-photo'}]`);(control&&!control.disabled?control:viewer.querySelector('.nav-back'))?.focus({preventScroll:true});}}
 viewer.addEventListener('close',()=>{app.querySelector(`[data-gallery-action=photo][data-id="${CSS.escape(viewerReturn)}"]`)?.focus({preventScroll:true});viewer.innerHTML='';swipe=null;});
 viewer.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)&&!sheet.open){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}});
 viewer.addEventListener('pointerdown',event=>{if(event.target.closest('.gallery-viewer-stage')&&event.isPrimary)swipe={x:event.clientX,y:event.clientY};});
 viewer.addEventListener('pointerup',event=>{if(!swipe)return;const x=event.clientX-swipe.x,y=event.clientY-swipe.y;swipe=null;if(Math.abs(x)>55&&Math.abs(y)<45)step(x<0?1:-1);});viewer.addEventListener('pointercancel',()=>swipe=null);
 function handle(event){
  const button=event.target.closest('[data-gallery-action]');if(!button)return;
  const action=button.dataset.galleryAction,id=button.dataset.id;
  if(action==='back'){ui.albumId='';ui.selecting=false;ui.selected=[];refresh('[data-gallery-action=upload]',true);}
  if(action==='open-album'){ui.albumId=id;ui.selecting=false;ui.selected=[];refresh('.gallery-header .nav-back',true);}
  if(action==='upload'){
   if(ui.busy)return notify('照片正在整理中，请稍等。');
   importTarget=!GALLERY_COLLECTIONS.includes(ui.albumId)?ui.albumId:'';picker.value='';picker.click();
  }
  if(action==='new-album')openSheet('album');
  if(action==='edit-album'){const album=data().albums.find(a=>a.id===id);if(album)openSheet('album',album);}
  if(action==='select'){ui.selecting=!ui.selecting;ui.selected=[];refresh('[data-gallery-action=select]');}
  if(action==='photo'){
   if(!ui.selecting){openViewer(id);return;}
   ui.selected=ui.selected.includes(id)?ui.selected.filter(v=>v!==id):[...ui.selected,id];refresh(`[data-gallery-action=photo][data-id="${CSS.escape(id)}"]`);
  }
  if(action==='select-all'){const photos=albumPhotos(data(),ui.albumId);ui.selected=photos.every(p=>ui.selected.includes(p.id))?[]:photos.map(p=>p.id);refresh('[data-gallery-action=select-all]');}
  if(action==='move'&&ui.selected.length)openSheet('move');
  if(action==='move-to'){
   if(!ui.selected.length)return;
   if(commit(()=>movePhotos(data(),ui.selected,id))){sheet.close();ui.selected=[];refresh('[data-gallery-action=select]');notify('照片已移动。');}
  }
  if(action==='new-destination')openSheet('album',null,{moving:true});
  if(action==='delete-photos'&&ui.selected.length)openSheet('delete-photos');
  if(action==='confirm-delete-photos'){
   if(commit(()=>deletePhotos(data(),ui.selected))){sheet.close();ui.selected=[];refresh('[data-gallery-action=select]');notify('照片已从图库删除。');}
  }
  if(action==='delete-album'){const album=data().albums.find(a=>a.id===id);if(album)openSheet('delete-album',album);}
  if(action==='confirm-delete-album'){
   if(commit(()=>deleteAlbum(data(),id))){sheet.close();refresh('[data-gallery-action=upload]');notify('相册已删除，照片已保留。');}
  }
  if(action==='close')void close();
  if(action==='close-viewer')viewer.close();
  if(action==='previous-photo')step(-1);if(action==='next-photo')step(1);
  if(action==='edit-photo'){const photo=data().photos.find(p=>p.id===viewerPhoto);if(photo)openSheet('photo',photo);}
 }
 app.addEventListener('click',handle);sheet.addEventListener('click',handle);viewer.addEventListener('click',handle);
 app.addEventListener('keydown',event=>{if(event.key==='Escape'&&ui.selecting&&app.querySelector('.gallery-app')){ui.selecting=false;ui.selected=[];refresh('[data-gallery-action=select]');}});
 sheet.addEventListener('submit',event=>{
  event.preventDefault();const fields=Object.fromEntries(new FormData(event.target));
  if(sheetKind==='album'){
   const moving=moveAfterCreate,result=commit(()=>{const album=saveAlbum(data(),fields);if(moving)movePhotos(data(),ui.selected,album.id);return album;});if(!result)return;
   sheet.close();ui.selected=[];if(!fields.id&&!moving){ui.albumId=result.id;ui.selecting=false;}
   refresh('.gallery-header .nav-back',!fields.id&&!moving);notify(moving?'相册已新建，照片已移入。':'相册已保存。');
  }
  if(sheetKind==='photo'){
   if(!commit(()=>updatePhoto(data(),{...fields,time:new Date(fields.date).getTime()})))return;
   sheet.close();refresh();renderViewer();notify('照片信息已保存。');
  }
 });
 picker.addEventListener('change',async()=>{
  const files=Array.from(picker.files||[]);if(!files.length||ui.busy)return;
  const target=importTarget,ticket=++importRevision;ui.busy=true;picker.disabled=true;refresh();
  try{
   const items=[];for(const file of files){
    if(file.size>10*1024*1024)throw new Error('单张照片不能超过 10MB。');
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type))throw new Error('请选择 JPG、PNG 或 WebP 照片。');
    const image=await compressImage(file,1440);if(ticket!==importRevision)return;
    items.push({data:image,name:file.name,time:file.lastModified||Date.now()});
   }
   if(commit(()=>addUploadedPhotos(data(),items,target))){notify(`已添加 ${items.length} 张照片。`);}
  }catch(error){if(ticket===importRevision)notify(error.message||'照片读取失败。');}
  finally{if(ticket===importRevision){ui.busy=false;picker.disabled=false;picker.value='';refresh();}}
 });
 function reset(){importRevision++;ui.albumId='';ui.selecting=false;ui.selected=[];ui.busy=false;picker.disabled=false;picker.value='';if(sheet.open)sheet.close();if(viewer.open)viewer.close();}
 return {ui,reset,openHome(){ui.albumId='';ui.selecting=false;ui.selected=[];},saveConversationPhoto(input){const result=commit(()=>saveChatPhoto(getState(),input));if(result){refresh();if(result.created)notify('一张对话照片已加入珍藏。');}return result;}};
}
