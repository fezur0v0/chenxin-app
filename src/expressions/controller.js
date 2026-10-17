import {drawerHeader,bindDrawerDismiss,animateDrawerClose} from '../drawer.js';
import {escape} from '../ui.js';
import {icon} from '../icons.js';
import {expressionContents,categoryField,stickerForm,importForm} from './view.js';
import {visibleStickers,saveCategory,deleteCategory,moveStickers,parseStickerText,importStickers,STICKER_LIMIT} from './model.js';
import {readStickerFile} from './files.js';

export function createStickerLibrary({app,getState,setState,getUI,persist,notify,compressImage}){
 const dialog=document.createElement('dialog');dialog.className='glass app-sheet bottom-sheet sticker-sheet';dialog.setAttribute('aria-label','表情包管理');document.body.append(dialog);
 let closing=false,revision=0,returnFocus,focusAction,upload='',rows=null,busy=false,press=null,suppress=false;
 const ui=()=>getUI(),library=()=>getState().expressions;
 const button=(name,label,extra='')=>`<button type="button" data-sticker-action="${name}" ${extra}>${label}</button>`;
 function refresh(){
  const panel=app.querySelector('.expression-tray');if(!panel)return;
  const scroll=panel.querySelector('.expression-grid')?.scrollTop||0,categoryScroll=panel.querySelector('.sticker-categories')?.scrollLeft||0;
  panel.innerHTML=expressionContents(getState(),ui());panel.querySelector('.expression-grid').scrollTop=scroll;const categories=panel.querySelector('.sticker-categories');if(categories)categories.scrollLeft=categoryScroll;
 }
 // Update results without replacing the search input or interrupting Chinese IME.
 function search(event){
  const input=event.target;if(!input.matches('[data-expression-search]'))return;
  ui().search=input.value;if(event.isComposing)return;ui().selected=[];
  const panel=input.closest('.expression-tray'),template=document.createElement('template');
  // Keep the search field still when the result list becomes shorter.
  panel.style.height=input.value?(panel.style.height||`${panel.getBoundingClientRect().height}px`):'';
  template.innerHTML=expressionContents(getState(),ui());
  for(const selector of ['.expression-grid','.sticker-selection','.sticker-bulk-actions']){
   const current=panel.querySelector(selector),next=template.content.querySelector(selector);if(current&&next)current.replaceChildren(...next.childNodes);
  }
 }
 app.addEventListener('input',search);app.addEventListener('compositionend',search);
 async function close(){if(!dialog.open||closing||busy)return;closing=true;const current=revision;await animateDrawerClose(dialog);if(current!==revision)return;dialog.close();closing=false;}
 bindDrawerDismiss(dialog,{panel:()=>dialog.open&&!closing&&!busy?dialog:null,close,backdrop:true});
 dialog.addEventListener('cancel',e=>{e.preventDefault();void close();});
 dialog.addEventListener('close',()=>{revision++;upload='';rows=null;const nodes=[...app.querySelectorAll('[data-sticker-action]')];const target=returnFocus?.isConnected?returnFocus:nodes.find(e=>e.dataset.stickerAction===focusAction?.action&&e.dataset.id===focusAction?.id)||app.querySelector('.expression-tray');target?.focus({preventScroll:true});});
 function show(content){
  if(!dialog.open){returnFocus=document.activeElement;focusAction=returnFocus?.dataset?{action:returnFocus.dataset.stickerAction,id:returnFocus.dataset.id}:null;}
  revision++;closing=false;busy=false;upload='';rows=null;dialog.style.transform='';dialog.getAnimations().forEach(a=>a.cancel());dialog.innerHTML=content;
  if(!dialog.open)dialog.showModal();dialog.querySelector('.drawer-handle').focus({preventScroll:true});
 }
 function error(message){const el=dialog.querySelector('[role=alert]');if(el){el.textContent=message;el.hidden=false;el.scrollIntoView({block:'nearest'});}else notify(message);}
 function commit(change){
  const before=structuredClone(getState());
  try{const result=change();if(!persist())throw new Error('保存失败，内容仍保留在这里，请释放本机空间后重试。');return {result};}catch(e){setState(before);error(e.message);return null;}
 }
 const currentCategory=()=>library().categories.some(c=>c.id===ui().category)?ui().category:'';
 function openCategory(id=''){
  const c=library().categories.find(c=>c.id===id);if(id&&!c)return;
  show(`<form data-sticker-form="category">${drawerHeader({title:c?'管理分类':'新增分类',action:'close',actionAttribute:'data-sticker-action'})}<p class="sticker-error" role="alert" hidden></p><input name="id" type="hidden" value="${escape(c?.id||'')}"><label class="field"><span>分类名称</span><input name="name" required maxlength="30" value="${escape(c?.name||'')}" placeholder="给这份心情起个名字"></label><button class="primary" type="submit">${c?'保存名称':'创建分类'}</button>${c?`<p class="hint">删除分类会将表情包移到「未分类」，保留图片和备注。</p>${button('delete-category','删除分类',`class="sticker-danger" data-id="${escape(id)}"`)}`:''}</form>`);
 }
 function act(action,target){
  if(action==='close'){void close();return;}
  if(action==='add'){show(`${drawerHeader({title:'添加表情包',action:'close',actionAttribute:'data-sticker-action'})}<div class="sticker-add-choices">${button('upload',`${icon('image')}<span>上传图片<small>为图片添加含义和备注</small></span>`)}${button('import',`${icon('file')}<span>导入表情包<small>粘贴文字，或选择 TXT / JSON / DOCX</small></span>`)}</div>`);return;}
  if(action==='upload'){show(stickerForm(library(),null,currentCategory()));return;}
  if(action==='import'){show(importForm(library(),currentCategory()));return;}
  if(action==='edit'){const item=library().stickers.find(s=>s.id===target.dataset.id);if(item)show(stickerForm(library(),item));return;}
  if(action==='new-category'){openCategory();return;}
  if(action==='category-menu'){openCategory(target.dataset.id);return;}
  if(action==='category'){ui().category=target.dataset.id;ui().selected=[];refresh();app.querySelectorAll('[data-sticker-action=category]').forEach(e=>{if(e.dataset.id===ui().category)e.focus({preventScroll:true});});return;}
  if(action==='manage'){ui().managing=!ui().managing;ui().selected=[];refresh();app.querySelector('[data-sticker-action=manage]')?.focus({preventScroll:true});return;}
  if(action==='select'){
   const set=new Set(ui().selected||[]),id=target.dataset.id;if(set.has(id))set.delete(id);else set.add(id);ui().selected=[...set];refresh();[...app.querySelectorAll('[data-sticker-action=select]')].find(e=>e.dataset.id===id)?.focus({preventScroll:true});return;
  }
  if(action==='select-all'){const visible=visibleStickers(library(),ui()),set=new Set(ui().selected||[]),all=visible.every(s=>set.has(s.id));for(const s of visible)if(all)set.delete(s.id);else set.add(s.id);ui().selected=[...set];refresh();app.querySelector('[data-sticker-action=select-all]')?.focus({preventScroll:true});return;}
  if(action==='favorite'){const item=library().stickers.find(s=>s.id===target.dataset.id);if(item&&commit(()=>{item.favorite=!item.favorite;})){refresh();[...app.querySelectorAll('[data-sticker-action=favorite]')].find(e=>e.dataset.id===item.id)?.focus({preventScroll:true});}return;}
  if(action==='move'||action==='delete'){
   const count=ui().selected?.length||0;if(!count)return;
   show(`<form data-sticker-form="${action}">${drawerHeader({title:action==='move'?'移动表情包':'删除表情包',action:'close',actionAttribute:'data-sticker-action'})}<p class="sticker-error" role="alert" hidden></p><p class="sticker-sheet-summary">${action==='move'?`将选中的 ${count} 项移动到`:`确定删除选中的 ${count} 项表情包？已发出的聊天图片会保留。`}</p>${action==='move'?categoryField(library(),currentCategory()):''}<div class="sticker-form-actions">${button('close','取消','class="secondary"')}<button type="submit" class="primary">${action==='move'?'确认移动':'确认删除'}</button></div></form>`);return;
  }
  if(action==='delete-category'){
   const id=target.dataset.id;if(!confirm('删除这个分类？其中的表情包将移到未分类，不会删除图片。'))return;
   if(commit(()=>deleteCategory(library(),id))){if(ui().category===id)ui().category='';ui().selected=[];refresh();void close();notify('分类已删除，表情包已移到未分类。');}return;
  }
  if(action==='preview'){preview();return;}
 }
 function preview(){
  try{rows=parseStickerText(dialog.querySelector('[name=text]').value);dialog.querySelector('[role=alert]').hidden=true;const preview=dialog.querySelector('.sticker-import-preview');preview.innerHTML=`<strong>找到 ${rows.length} 项表情包</strong><ul>${rows.slice(0,5).map(r=>`<li><span>${escape(r.note)}</span><small>${escape(new URL(r.value).hostname)}</small></li>`).join('')}</ul>${rows.length>5?`<p class="hint">另有 ${rows.length-5} 项</p>`:''}`;const submit=dialog.querySelector('[data-sticker-confirm]');submit.disabled=false;submit.textContent=`确认导入 ${rows.length} 项`;}catch(e){rows=null;dialog.querySelector('[data-sticker-confirm]').disabled=true;dialog.querySelector('.sticker-import-preview').innerHTML='';error(e.message);}
 }
 app.addEventListener('click',e=>{const target=e.target.closest('[data-sticker-action]');if(!target)return;if(suppress){suppress=false;e.preventDefault();return;}act(target.dataset.stickerAction,target);});
 dialog.addEventListener('click',e=>{const target=e.target.closest('[data-sticker-action]');if(target&&!busy)act(target.dataset.stickerAction,target);});
 dialog.addEventListener('input',e=>{if(e.target.name==='text'){rows=null;dialog.querySelector('[data-sticker-confirm]').disabled=true;dialog.querySelector('[data-sticker-confirm]').textContent='预览后导入';dialog.querySelector('.sticker-import-preview').innerHTML='';}});
 dialog.addEventListener('change',async e=>{
  const input=e.target;if(!input.matches('[data-sticker-upload],[data-sticker-file]')||!input.files?.length)return;
  const current=revision;busy=true;input.disabled=true;dialog.setAttribute('aria-busy','true');dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   if(input.matches('[data-sticker-file]')){rows=null;dialog.querySelector('.sticker-import-preview').innerHTML='';const content=await readStickerFile(input.files[0]);if(current!==revision)return;dialog.querySelector('[name=text]').value=content;preview();}
   else{
    const file=input.files[0];let value;
    if(file.type==='image/gif'){
     if(file.size>850000)throw new Error('GIF 请控制在 850KB 内，以保留动画并避免占满本机空间。');
     value=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('图片读取失败。'));reader.readAsDataURL(file);});
     const img=new Image();img.src=value;await img.decode();
    }else value=await compressImage(file,512,{transparent:true});
    if(current!==revision)return;upload=value;input.required=false;const box=dialog.querySelector('.sticker-upload-preview');box.querySelector('img')?.remove();box.prepend(Object.assign(new Image(),{src:value,alt:'表情预览'}));box.querySelector('.sticker-upload span').textContent='更换图片';dialog.querySelector('[name=note]').focus();dialog.querySelector('[role=alert]').hidden=true;
   }
  }catch(error){if(current===revision)errorMessage(error);}finally{if(current===revision){busy=false;input.disabled=false;input.value='';dialog.removeAttribute('aria-busy');dialog.querySelectorAll('button').forEach(b=>b.disabled=false);const confirm=dialog.querySelector('[data-sticker-confirm]');if(confirm)confirm.disabled=!rows;}}
 });
 function errorMessage(e){error(e.message||'文件读取失败，请检查文件内容。');}
 dialog.addEventListener('submit',e=>{
  e.preventDefault();if(busy)return;const form=e.target,kind=form.dataset.stickerForm,data=Object.fromEntries(new FormData(form));let result;
  if(kind==='save'){
   const note=data.note?.trim();if(!note)return error('请填写表情含义。');const item=library().stickers.find(s=>s.id===data.id);if(!item&&!upload)return error('请先选择一张图片。');
   result=commit(()=>{if(item){item.note=note;item.name=note.slice(0,80);moveStickers(library(),[item.id],data.category);}else{if(library().stickers.length>=STICKER_LIMIT)throw new Error('表情包最多保存 200 项。');library().stickers.push({id:crypto.randomUUID(),value:upload,name:note.slice(0,80),note,category:data.category,favorite:true,used:0});}});
  }else if(kind==='category'){result=commit(()=>saveCategory(library(),data.name,data.id));if(result)ui().category=result.result.id;}
  else if(kind==='import'){if(!rows)return error('请先预览导入内容。');result=commit(()=>importStickers(library(),rows,data.category));}
  else if(kind==='move'){result=commit(()=>moveStickers(library(),ui().selected||[],data.category));}
  else if(kind==='delete'){result=commit(()=>{const ids=new Set(ui().selected||[]);library().stickers=library().stickers.filter(s=>!ids.has(s.id));});}
  if(result){ui().selected=[];refresh();void close();notify(kind==='import'?`已导入 ${result.result.added} 项${result.result.skipped?`，跳过 ${result.result.skipped} 项重复表情`:''}。`:kind==='delete'?'选中的表情包已删除。':kind==='move'?'表情包已移动。':'已保存。');}
 });
 function cancelPress(){if(press)clearTimeout(press.timer);press=null;}
 app.addEventListener('pointerdown',e=>{suppress=false;const target=e.target.closest('[data-custom-category]');if(!target||e.button!==0)return;cancelPress();press={x:e.clientX,y:e.clientY,timer:setTimeout(()=>{press=null;suppress=true;openCategory(target.dataset.id);},500)};});
 app.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>10)cancelPress();});
 for(const name of ['pointerup','pointercancel','scroll'])app.addEventListener(name,cancelPress,true);
 app.addEventListener('contextmenu',e=>{const target=e.target.closest('[data-custom-category]');if(!target)return;e.preventDefault();cancelPress();openCategory(target.dataset.id);});
 app.addEventListener('keydown',e=>{const target=e.target.closest('[data-custom-category]');if(target&&(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')){e.preventDefault();openCategory(target.dataset.id);}});
 return {reset(){cancelPress();revision++;busy=false;if(dialog.open)dialog.close();}};
}
