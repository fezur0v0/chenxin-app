import { createHomeEditor } from './home-editor.js';
import { finishSplash } from './splash.js';
import { icon } from './icons.js';
import { localDate, loadState, saveState, normalizeState, newSession, addDraftMessage, exportData, saveMemory, changeMessage } from './store.js';
import { home, chat, sessions, settings, memory, memoryEditor, sidebar, escape, button } from './views.js';
let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw new Error('本机存储不可用');}};}
let state=loadState(storage), page='home', memoryFilter='all', memorySearch='', toastTimer, composeDraft='';
const app=document.querySelector('#app'), nav=[['home','home','主页'],['chat','chat','对话'],['memory','memory','记忆'],['settings','settings','设置']];
const opened=new Set();
let sessionSearch='',oldestFirst=false;
let visibleTray='',closingTray=false,dragStart=null;
const sidebarDialog=document.createElement('dialog');sidebarDialog.id='sidebar-dialog';sidebarDialog.className='glass';sidebarDialog.setAttribute('aria-label','侧边栏');document.body.append(sidebarDialog);
let chatUI={tray:'',tab:'kaomoji',filter:'all',attachments:[]},selection={start:0,end:0};
const expressionDialog=document.createElement('dialog');expressionDialog.className='glass expression-dialog';document.body.append(expressionDialog);
const dialog=document.createElement('dialog');dialog.id='memory-dialog';dialog.className='glass';document.body.append(dialog);
const homeEditor=createHomeEditor({app,getState:()=>state,setState:value=>{state=value;},persist,render,notify,compressImage});
function notify(value){const n=document.querySelector('#notice');n.textContent=value;n.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('visible'),3500);}
function persist(){try{saveState(storage,state);return true;}catch{notify('本机存储不足或不可用。修改尚未保存，请导出备份或换一张更小的图片。');return false;}}
function saveNotice(text){if(persist())notify(text);}
function applyAppearance(){const root=document.documentElement,a=state.appearance;root.dataset.theme=state.theme;root.style.setProperty('--accent',a.accent);const rgb=a.accent.slice(1).match(/../g).map(c=>parseInt(c,16));root.style.setProperty('--tint',rgb.join(' '));root.style.setProperty('--glass-alpha',a.opacity/100);root.style.setProperty('--glass-blur',`${a.blur}px`);root.style.setProperty('--wall-image',a.wallpaper?`url("${a.wallpaper}")`:'none');root.dataset.wallpaper=String(Boolean(a.wallpaper));document.querySelector('meta[name=theme-color]').content=state.theme==='dark'?'#20232d':'#eceef3';}
function render(){
 for(const node of app.querySelectorAll('details')){if(node.open)opened.add(node.id);else opened.delete(node.id);}
 applyAppearance();
 const activePage=page==='sessions'?'chat':page;
 app.innerHTML=`<div class="shell ${['chat','sessions'].includes(page)?'immersive':''}"><div class="wallpaper" aria-hidden="true"></div><main>${page==='chat'?chat(state,chatUI):page==='sessions'?sessions(state,sessionSearch,oldestFirst):`<div class="page-content ${page==='home'?'home-page':''}">${page==='home'?home(state,homeEditor.ui):page==='memory'?memory(state,memoryFilter,memorySearch):page==='settings'?settings(state):`<header class="session-header">${button('chat','back','返回对话')}</header>${sessions(state)}`}</div>`}</main>${['chat','sessions'].includes(page)?'':`<div class="nav-dock"><nav class="bottom-nav glass" aria-label="主导航">${nav.map(([p,i,l])=>`<button data-action="${p}" class="${activePage===p?'active':''}" ${activePage===p?'aria-current="page"':''}>${icon(i)}<span>${l}</span></button>`).join('')}</nav></div>`}</div>`;
 if(sidebarDialog.open){const scroll=sidebarDialog.querySelector('.sidebar-conversations')?.scrollTop||0;sidebarDialog.innerHTML=sidebar(state,page);sidebarDialog.querySelector('.sidebar-conversations').scrollTop=scroll;}
 for(const id of opened){const d=document.getElementById(id);if(d)d.open=true;}
 const messages=document.querySelector('#messages');if(messages)messages.scrollTop=messages.scrollHeight;
 const input=app.querySelector('[name=message]');if(input){input.value=composeDraft;input.setSelectionRange(selection.start,selection.end);resizeComposer();}updateViewport();syncTray();
}
function goto(next){homeEditor.exit();if(sidebarDialog.open)sidebarDialog.close();chatUI.tray='';page=next;render();app.querySelector('.page-content')?.scrollTo(0,0);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)app.querySelector('main')?.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:210,easing:'ease-out'});}
function focusSettings(id){goto('settings');const d=document.getElementById(id);if(d){d.open=true;opened.add(id);d.scrollIntoView({behavior:'smooth',block:'start'});}}
function showMemoryEditor(item,source=''){dialog.innerHTML=memoryEditor(item,source);dialog.showModal();dialog.querySelector('[name=title]').focus();}
function closeModal(){dialog.close();}
function exportBackup(){const url=URL.createObjectURL(new Blob([exportData(state)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`chenxin-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function validEndpoint(value){if(!value)return true;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{return false;}}
function handleAction(e){
 const target=e.target.closest('button');if(!target)return;
 if(target.dataset.open){if(state.active!==target.dataset.open){composeDraft='';chatUI.attachments=[];}state.active=target.dataset.open;persist();goto('chat');return;}
 const action=target.dataset.action;
 if(action==='show-reasoning'){const scroll=app.querySelector('#messages').scrollTop;rememberSelection();chatUI.messageId=target.dataset.id;chatUI.tray='reasoning';render();app.querySelector('#messages').scrollTop=scroll;return;}
 if(action==='open-sidebar'){rememberSelection();chatUI.tray='';render();sidebarDialog.innerHTML=sidebar(state,page);sidebarDialog.showModal();sidebarDialog.querySelector('[data-action=close-sidebar]').focus();return;}
 if(action==='close-sidebar'){sidebarDialog.close();return;}
 if(action==='sort-sessions'){oldestFirst=!oldestFirst;render();return;}
 if(action==='pin-session'){const s=state.sessions.find(x=>x.id===target.dataset.id);if(!s)return;s.pinned=!s.pinned;persist();render();return;}
 if(action==='rename-session'){const s=state.sessions.find(x=>x.id===target.dataset.id);if(!s)return;const title=prompt('给这段对话起个名字',s.title);if(title?.trim()){s.title=title.trim().slice(0,80);persist();render();}return;}

 if(action?.startsWith('toggle-')){rememberSelection();const tray=action.slice(7);chatUI.tray=chatUI.tray===tray?'':tray;render();return;}
 if(action==='close-tray'){closeTray();return;}
 if(action==='expression-tab'){chatUI.tab=target.dataset.tab;render();return;}
 if(action==='expression-filter'){chatUI.filter=target.dataset.filter;render();return;}
 if(action==='open-mcp'){focusSettings('plugins-settings');return;}
 if(action==='pick-camera'||action==='pick-image'||action==='pick-file'||action==='add-sticker'){app.querySelector(action==='pick-camera'?'#chat-camera':action==='pick-image'?'#chat-images':action==='pick-file'?'#chat-files':'#sticker-image').click();return;}
 if(action==='remove-attachment'){chatUI.attachments=chatUI.attachments.filter(a=>a.id!==target.dataset.id);render();return;}
 if(action==='add-kaomoji'||action==='edit-kaomoji'){const item=state.expressions.kaomoji.find(x=>x.id===target.dataset.id);expressionDialog.innerHTML=`<form id="kaomoji-form"><div class="dialog-heading"><h2>${item?'编辑':'收藏'}颜文字</h2><button type="button" data-close-expression aria-label="关闭">${icon('close')}</button></div><input name="id" type="hidden" value="${escape(item?.id||'')}"><label class="field"><span>颜文字（最多 200 个字符）</span><textarea name="value" required maxlength="200" rows="3">${escape(item?.value||'')}</textarea></label><button class="primary" type="submit">保存</button></form>`;expressionDialog.showModal();expressionDialog.querySelector('[name=value]').focus();return;}
 if(['use-expression','favorite-expression','delete-expression'].includes(action)){
 const items=state.expressions[chatUI.tab],item=items.find(x=>x.id===target.dataset.id);if(!item)return;
 if(action==='favorite-expression')item.favorite=!item.favorite;
 if(action==='delete-expression'){if(!confirm('删除这项收藏？'))return;state.expressions[chatUI.tab]=items.filter(x=>x.id!==item.id);}
 if(action==='use-expression'){
  if(chatUI.tab==='kaomoji'){const before=composeDraft.slice(0,selection.start),after=composeDraft.slice(selection.end);if(before.length+item.value.length+after.length>12000)return notify('消息太长，先删掉一些文字吧。');composeDraft=before+item.value+after;selection.start=selection.end=before.length+item.value.length;}
  else{if(chatUI.attachments.length>=6)return notify('一次最多添加 6 项附件。');chatUI.attachments.push({id:crypto.randomUUID(),name:item.name,size:0,type:'image/jpeg',data:item.value});}
  item.used=Date.now();
 }
 if(action==='use-expression')chatUI.tray='';
 persist();const scroll=app.querySelector('.expression-grid')?.scrollTop||0;render();const grid=app.querySelector('.expression-grid');if(grid)grid.scrollTop=scroll;
 if(action==='use-expression'&&chatUI.tab==='kaomoji'){const input=app.querySelector('[name=message]');input.focus({preventScroll:true});input.setSelectionRange(selection.start,selection.end);}
 return;
 }
 if(action==='configure-model'){focusSettings('model-settings');return;}
 if(action==='select-model'){const session=state.sessions.find(x=>x.id===state.active);session.model=target.dataset.model;persist();chatUI.tray='';render();notify('已保存此对话的模型选择；服务尚未连接。');return;}

 if(nav.some(n=>n[0]===action)||action==='sessions')goto(action);
 else if(action==='customize')focusSettings(target.dataset.section||'appearance-settings');
 else if(action==='persona')focusSettings('persona-settings');
 else if(action==='theme'){state.theme=state.theme==='dark'?'light':'dark';persist();const y=app.querySelector('.page-content').scrollTop;render();app.querySelector('.page-content').scrollTop=y;}
 else if(action==='accent'){state.appearance.accent=target.dataset.color;persist();const y=app.querySelector('.page-content').scrollTop;render();app.querySelector('.page-content').scrollTop=y;}
 else if(action==='clear-image'){const key=target.dataset.key;if(!['wallpaper','userAvatar','aiAvatar'].includes(key))return;state.appearance[key]='';persist();const y=app.querySelector('.page-content').scrollTop;render();app.querySelector('.page-content').scrollTop=y;}
 else if(action==='mood'){state.home.mood=target.dataset.mood;persist();render();}
 else if(action==='new'){newSession(state);composeDraft='';chatUI.attachments=[];persist();goto('chat');app.querySelector('[name=message]').focus();}
 else if(action==='delete-session'){if(!confirm('删除这段会话？已收藏的记忆会保留。'))return;if(state.active===target.dataset.id){composeDraft='';chatUI.attachments=[];}state.sessions=state.sessions.filter(s=>s.id!==target.dataset.id);if(!state.sessions.length)newSession(state);if(!state.sessions.some(s=>s.id===state.active))state.active=state.sessions[0].id;persist();render();}
 else if(action==='delete-plugin'){if(!confirm('删除这项插件配置？'))return;state.plugins=state.plugins.filter(p=>p.id!==target.dataset.id);persist();render();}
 else if(action==='edit-plugin'){const p=state.plugins.find(x=>x.id===target.dataset.id),form=app.querySelector('#plugin-form');for(const key of ['id','name','url','type'])form.elements[key].value=p[key];document.querySelector('#plugin-form-title').textContent='编辑配置';form.scrollIntoView({behavior:'smooth'});form.elements.name.focus();}
 else if(action==='new-memory')showMemoryEditor();
 else if(action==='filter-memory'){memoryFilter=target.dataset.filter;render();}
 else if(action==='edit-memory')showMemoryEditor(state.memories.find(m=>m.id===target.dataset.id));
 else if(action==='delete-memory'){if(!confirm('删除这条记忆？删除后无法恢复。'))return;state.memories=state.memories.filter(m=>m.id!==target.dataset.id);persist();render();}
 else if(action==='remember'){const s=state.sessions.find(x=>x.id===state.active),m=s.messages.find(x=>x.id===target.dataset.id);showMemoryEditor({content:m.text||m.attachments?.map(a=>a.name).join('、')||'',title:'',kind:'short'},s.title);}
 else if(action==='export')exportBackup();
}
app.addEventListener('click',handleAction);
sidebarDialog.addEventListener('click',e=>{if(e.target===sidebarDialog){const r=sidebarDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)sidebarDialog.close();}else handleAction(e);});
app.addEventListener('submit',e=>{
 e.preventDefault();const form=e.target,data=Object.fromEntries(new FormData(form));
 if(form.getAttribute('id')==='compose'){if(!data.message.trim()&&!chatUI.attachments.length)return;const snapshot=structuredClone(state);addDraftMessage(state,data.message,chatUI.attachments);const ok=persist();if(!ok){state=snapshot;return;}composeDraft='';selection={start:0,end:0};chatUI.attachments=[];chatUI.tray='';render();app.querySelector('[name=message]').focus();if(ok)notify('已保存本机；模型未连接，这条消息没有发送。');}
 else if(form.getAttribute('id')==='persona-form'){if(!data.name.trim())return notify('请填写 AI 名字。');state.persona={name:data.name.trim().slice(0,40),prompt:data.prompt};saveNotice('角色已保存。');}
 else if(form.getAttribute('id')==='provider-form'){if(!validEndpoint(data.baseUrl.trim()))return notify('请使用不含密钥、查询参数或账号信息的 HTTPS 地址。');state.provider={protocol:data.protocol,baseUrl:data.baseUrl.trim(),model:data.model.trim()};saveNotice('模型配置已保存，尚未连接服务。');}
 else if(form.getAttribute('id')==='plugin-form'){if(!data.name.trim()||!data.url.trim())return notify('请填写名称和服务地址。');if(!validEndpoint(data.url.trim()))return notify('请使用不含密钥、查询参数或账号信息的 HTTPS 地址。');const p={id:data.id||crypto.randomUUID(),name:data.name.trim().slice(0,80),type:data.type,url:data.url.trim()},i=state.plugins.findIndex(x=>x.id===p.id);if(i<0)state.plugins.push(p);else state.plugins[i]=p;saveNotice('配置已保存，插件运行尚未接入。');render();}
});
app.addEventListener('input',e=>{
 const t=e.target;
 if(t.name==='message'){composeDraft=t.value;selection={start:t.selectionStart,end:t.selectionEnd};resizeComposer();}
 if(t.id==='session-search'){const pos=t.selectionStart;sessionSearch=t.value;render();const n=app.querySelector('#session-search');n.focus();try{n.setSelectionRange(pos,pos);}catch{}}
 if(t.id==='memory-search'){const pos=t.selectionStart;memorySearch=t.value;render();const n=app.querySelector('#memory-search');n.focus();try{n.setSelectionRange(pos,pos);}catch{}}
 if(['accent','blur','opacity'].includes(t.name)&&t.closest('#appearance-settings')){state.appearance[t.name]=t.name==='accent'?t.value:Number(t.value);applyAppearance();const output=document.querySelector(`#${t.name}-output`);if(output)output.textContent=t.name==='opacity'?`${100-state.appearance.opacity}%`:`${state.appearance.blur}px`;}
});
app.addEventListener('change',async e=>{
 const t=e.target;
 if(['chat-camera','chat-images','chat-files','sticker-image'].includes(t.id)&&t.files?.length){
  t.disabled=true;
  try{
   for(const file of t.files){
    if(t.id==='sticker-image'){
     if(state.expressions.stickers.length>=200)throw new Error('表情包最多保存 200 项。');
     const data=await compressImage(file,512),item={id:crypto.randomUUID(),name:file.name.slice(0,80),value:data,favorite:true,used:0};state.expressions.stickers.push(item);if(!persist()){state.expressions.stickers.pop();break;}
    }else{
     if(chatUI.attachments.length>=6)throw new Error('一次最多添加 6 项附件。');
     if(file.size>10*1024*1024)throw new Error('单个附件不能超过 10MB。');
     const data=['chat-camera','chat-images'].includes(t.id)?await compressImage(file,1024):'';
     chatUI.attachments.push({id:crypto.randomUUID(),name:file.name,size:file.size,type:file.type,data});
    }
   }
  }catch(error){notify(error.message);}finally{t.disabled=false;t.value='';if(page==='chat'){if(t.id!=='sticker-image')chatUI.tray='';render();}}
  return;
 }
 if(['accent','blur','opacity'].includes(t.name)&&t.closest('#appearance-settings'))persist();
 if(t.dataset.image && t.files[0]){
   const key=t.dataset.image,previous=state.appearance[key];
   try{const data=await compressImage(t.files[0],key==='wallpaper'?1440:256);state.appearance[key]=data;if(!persist()){state.appearance[key]=previous;return;}const y=app.querySelector('.page-content').scrollTop;render();app.querySelector('.page-content').scrollTop=y;notify('图片已保存。');}catch(error){notify(error.message);}
 }
 if(t.id==='import-data'&&t.files[0]){
   try{if(t.files[0].size>6*1024*1024)throw new Error('备份超过 6MB，请先缩小备份。');const next=normalizeState(JSON.parse(await t.files[0].text()));if(!confirm('导入会替换当前会话、记忆和外观。已导出当前备份了吗？'))return;try{saveState(storage,next);}catch{throw new Error('本机存储不足，原数据未替换。');}state=next;composeDraft='';chatUI={tray:'',tab:'kaomoji',filter:'all',attachments:[]};memorySearch='';memoryFilter='all';goto('home');notify('备份已恢复。');}catch(error){notify(`导入失败：${error.message}`);}finally{t.value='';}
 }
});
app.addEventListener('keydown',e=>{if(e.target.name==='message'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!e.repeat){e.preventDefault();e.target.form.requestSubmit();}});
dialog.addEventListener('click',e=>{if(e.target.closest('[data-action=close-modal]'))closeModal();});
dialog.addEventListener('change',e=>{if(e.target.name==='kind')document.querySelector('#memory-days-field').hidden=e.target.value==='permanent';});
dialog.addEventListener('submit',e=>{e.preventDefault();try{saveMemory(state,Object.fromEntries(new FormData(e.target)));const ok=persist();closeModal();render();if(ok)notify('记忆已收藏。');}catch(error){notify(error.message);}});
async function compressImage(file,max){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('请选择 JPG、PNG 或 WebP 图片。');
 if(file.size>12*1024*1024)throw new Error('图片超过 12MB，请先压缩。');
 const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await img.decode();if(!img.naturalWidth||!img.naturalHeight)throw new Error('无法读取图片。');const ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.78);if(data.length>1100000)throw new Error('图片保存后仍然太大，请换一张较小图片。');return data;}finally{URL.revokeObjectURL(url);}
}
let shownDate=localDate();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&page==='home'&&shownDate!==localDate()){shownDate=localDate();render();}});
render();

finishSplash().catch(()=>{document.querySelector('#splash')?.remove();app.inert=false;});

function rememberSelection(){const input=app.querySelector('[name=message]');if(input)selection={start:input.selectionStart,end:input.selectionEnd};}
function resizeComposer(){const input=app.querySelector('[name=message]');if(!input)return;input.style.height='auto';const max=parseFloat(getComputedStyle(input).lineHeight)*6;input.style.height=`${Math.min(input.scrollHeight,max)}px`;input.style.overflowY=input.scrollHeight>max?'auto':'hidden';const footer=app.querySelector('.composer-wrap');if(footer)app.querySelector('.chat-view').style.setProperty('--composer-height',`${footer.getBoundingClientRect().height}px`);}
function updateViewport(){const shell=app.querySelector('.immersive');if(!shell)return;const vv=window.visualViewport;shell.style.height=`${vv?vv.height:window.innerHeight}px`;shell.style.top=`${vv?vv.offsetTop:0}px`;}
window.visualViewport?.addEventListener('resize',updateViewport);window.visualViewport?.addEventListener('scroll',updateViewport);window.addEventListener('resize',()=>{updateViewport();resizeComposer();});
app.addEventListener('focusout',e=>{if(e.target.name==='message')rememberSelection();});
app.addEventListener('keyup',e=>{if(e.target.name==='message')rememberSelection();});
app.addEventListener('click',e=>{if(e.target.name==='message')rememberSelection();});
app.addEventListener('keydown',e=>{if(e.key==='Escape'&&chatUI.tray){e.preventDefault();closeTray();}});
expressionDialog.addEventListener('click',e=>{if(e.target.closest('[data-close-expression]'))expressionDialog.close();});
expressionDialog.addEventListener('submit',e=>{e.preventDefault();const form=e.target,value=form.elements.value.value.trim(),id=form.elements.id.value;if(!value)return;
 const snapshot=structuredClone(state.expressions),item=state.expressions.kaomoji.find(x=>x.id===id);
 if(item)item.value=value;else{if(state.expressions.kaomoji.length>=200)return notify('颜文字最多保存 200 项。');state.expressions.kaomoji.unshift({id:crypto.randomUUID(),value,favorite:true,used:0});}
 if(!persist()){state.expressions=snapshot;return;}expressionDialog.close();render();notify('颜文字已保存。');
});

const trayMotion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
function syncTray(){const panel=app.querySelector('.chat-tray');if(!panel){visibleTray='';closingTray=false;return;}for(const el of app.querySelectorAll('.chat-header,.messages,.composer-wrap'))el.inert=true;panel.focus({preventScroll:true});if(visibleTray!==chatUI.tray&&trayMotion())panel.animate([{transform:'translateY(100%)'},{transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});visibleTray=chatUI.tray;}
async function closeTray(){if(closingTray)return;const previous=chatUI.tray,panel=app.querySelector('.chat-tray');closingTray=true;if(panel&&trayMotion()){const from=panel.style.transform||'translateY(0)';await panel.animate([{transform:from},{transform:'translateY(100%)'}],{duration:200,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{});}if(panel&&app.querySelector('.chat-tray')!==panel){closingTray=false;return;}const scroll=app.querySelector('#messages')?.scrollTop;chatUI.tray='';render();if(scroll!==undefined)app.querySelector('#messages').scrollTop=scroll;const trigger=previous==='reasoning'?[...app.querySelectorAll('[data-action=show-reasoning]')].find(e=>e.dataset.id===chatUI.messageId):app.querySelector(`[data-action="toggle-${previous}"]`);trigger?.focus({preventScroll:true});}
app.addEventListener('keydown',e=>{const panel=app.querySelector('.chat-tray');if(!panel||e.key!=='Tab')return;const nodes=[...panel.querySelectorAll('button:not(:disabled),input,textarea')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});
function resetTrayDrag(panel){if(!panel)return;const from=panel.style.transform;panel.style.transform='';if(from&&trayMotion())panel.animate([{transform:from},{transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});}
app.addEventListener('pointerdown',e=>{const handle=e.target.closest('.tray-handle');if(!handle||closingTray)return;const panel=handle.closest('.chat-tray');panel.getAnimations().forEach(a=>a.cancel());dragStart={y:e.clientY,id:e.pointerId,panel};handle.setPointerCapture(e.pointerId);});
app.addEventListener('pointermove',e=>{if(!dragStart||e.pointerId!==dragStart.id)return;const delta=e.clientY-dragStart.y;dragStart.panel.style.transform=`translateY(${delta<0?Math.max(-32,delta*.2):delta}px)`;});
app.addEventListener('pointerup',e=>{if(!dragStart||e.pointerId!==dragStart.id)return;const {y,panel}=dragStart;dragStart=null;if(e.clientY-y>70)closeTray();else resetTrayDrag(panel);});
app.addEventListener('pointercancel',()=>{resetTrayDrag(dragStart?.panel);dragStart=null;});

const messageDialog=document.createElement('dialog');messageDialog.className='glass message-dialog';messageDialog.setAttribute('aria-label','消息操作');document.body.append(messageDialog);
let press=null,messageTarget=null;
function openMessageMenu(id,anchor){const session=state.sessions.find(s=>s.id===state.active),message=session.messages.find(m=>m.id===id);if(!message||chatUI.tray||messageDialog.open)return;messageTarget={session:session.id,id};const actions=message.role==='user'?[['copy','复制'],['edit','编辑消息'],['rollback','回滚至此'],['branch','创建分支'],['delete','删除']]:[['copy','复制'],['branch','创建分支'],['delete','删除']];messageDialog.innerHTML=`<div class="message-menu">${actions.map(([action,label])=>`<button data-message-action="${action}" class="${action==='delete'?'destructive':''}">${label}</button>`).join('')}</div>`;messageDialog.style.left=`${Math.max(12,Math.min(innerWidth-212,anchor.x))}px`;messageDialog.style.top=`${Math.max(12,Math.min(innerHeight-actions.length*48-24,anchor.y))}px`;messageDialog.showModal();messageDialog.querySelector('button').focus({preventScroll:true});}
function cancelPress(){if(press)clearTimeout(press.timer);press=null;}
app.addEventListener('pointerdown',e=>{const bubble=e.target.closest('[data-message-id]');if(!bubble||e.button!==0)return;cancelPress();const id=bubble.dataset.messageId,x=e.clientX,y=e.clientY;press={x,y,timer:setTimeout(()=>{press=null;openMessageMenu(id,{x,y});},500)};});
app.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>10)cancelPress();});
for(const event of ['pointerup','pointercancel','scroll'])app.addEventListener(event,cancelPress,true);
app.addEventListener('contextmenu',e=>{const bubble=e.target.closest('[data-message-id]');if(!bubble)return;e.preventDefault();cancelPress();openMessageMenu(bubble.dataset.messageId,{x:e.clientX,y:e.clientY});});
app.addEventListener('keydown',e=>{const bubble=e.target.closest('[data-message-id]');if(bubble&&(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')){e.preventDefault();const r=bubble.getBoundingClientRect();openMessageMenu(bubble.dataset.messageId,{x:r.left,y:r.bottom});}});
messageDialog.addEventListener('click',async e=>{if(e.target===messageDialog){const r=messageDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)messageDialog.close();return;}if(e.target.closest('[data-cancel-edit]')){messageDialog.close();return;}const action=e.target.closest('[data-message-action]')?.dataset.messageAction;if(!action||messageTarget?.session!==state.active)return;const message=state.sessions.find(s=>s.id===state.active)?.messages.find(m=>m.id===messageTarget.id);if(!message)return;
 if(action==='copy'){try{await navigator.clipboard.writeText(message.text||message.attachments?.map(a=>a.name).join('、')||'');messageDialog.close();notify('已复制。');}catch{notify('浏览器未允许复制，请重试或手动选择文字。');}return;}
 if(action==='edit'){messageDialog.style.left='';messageDialog.style.top='';messageDialog.classList.add('editing');messageDialog.innerHTML=`<form id="message-edit-form"><div class="dialog-heading"><h2>编辑消息</h2><button type="button" data-cancel-edit aria-label="取消">${icon('close')}</button></div><label class="field"><span>消息内容</span><textarea name="text" maxlength="12000" rows="6">${escape(message.text)}</textarea></label><p class="hint">附件会保留，已有回复不会重新生成。</p><button type="submit" class="primary">保存修改</button></form>`;messageDialog.querySelector('textarea').focus();return;}
 if(action==='rollback'&&!confirm('保留这条消息，移除它后面的所有消息？'))return;
 if(action==='delete'&&!confirm('删除这条消息？'))return;
 const snapshot=structuredClone(state);try{changeMessage(state,messageTarget.id,action);if(!persist()){state=snapshot;return;}messageDialog.close();if(action==='branch'){composeDraft='';chatUI.attachments=[];}render();notify(action==='branch'?'已创建分支，原对话保留。':action==='rollback'?'已回滚至这条消息。':'消息已删除。');}catch(error){state=snapshot;notify(error.message);}
});
messageDialog.addEventListener('submit',e=>{e.preventDefault();if(e.target.id!=='message-edit-form'||messageTarget?.session!==state.active)return;const snapshot=structuredClone(state),scroll=app.querySelector('#messages')?.scrollTop;try{changeMessage(state,messageTarget.id,'edit',e.target.elements.text.value);if(!persist()){state=snapshot;return;}messageDialog.close();render();app.querySelector('#messages').scrollTop=scroll;notify('消息已修改。');}catch(error){state=snapshot;notify(error.message);}});
messageDialog.addEventListener('close',()=>{messageDialog.classList.remove('editing');const bubble=[...app.querySelectorAll('[data-message-id]')].find(e=>e.dataset.messageId===messageTarget?.id);bubble?.focus({preventScroll:true});});
