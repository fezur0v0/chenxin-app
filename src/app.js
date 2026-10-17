import {createBackupManager} from './backup/controller.js';
import {memorySnapshots} from './backup/snapshots.js';
import {musicFile} from './apps/music/files.js';
import {voiceFile} from './chat-content/voice-files.js';
import {createGalleryApp} from './apps/gallery/controller.js';
import {createChatPreview} from './chat-content/preview.js';
import {createChatMedia} from './chat-content/controller.js';
import {makeReply} from './chat-content/model.js';
import {expressionCategories,saveKaomoji} from './expressions/model.js';
import {categoryField} from './expressions/view.js';
import {createStickerLibrary} from './expressions/controller.js';
import { drawerHeader, animateDrawerClose, bindDrawerDismiss } from './drawer.js';
import { createMusicApp } from './apps/music/controller.js';
import { createDiaryApp } from './apps/diary/controller.js';
import { createPromptLibraries } from './apps/prompt-library/controller.js';
import { createHomeEditor } from './home-editor.js';
import { appView, findApp } from './apps/index.js';
import { finishSplash } from './splash.js';
import { icon } from './icons.js';
import { launcherIcon } from './launcher-icons.js';
import { backButton } from './ui.js';
import { localDate, loadState, saveState, newSession, addDraftMessage, saveMemory, changeMessage } from './store.js';
import { home, chat, sessions, settings, memory, memoryEditor, sidebar, escape, button } from './views.js';
const chatPreview=new URLSearchParams(location.search).get('preview')==='chat'?createChatPreview():null;
let storage;try{storage=chatPreview?.storage||localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw new Error('本机存储不可用');}};}
let state=loadState(storage), page=chatPreview?'chat':'home', memoryFilter='all', memorySearch='', toastTimer, composeDraft='';
chatPreview?.seed(state);
const app=document.querySelector('#app'), nav=[['home','home','主页'],['chat','chat','对话'],['memory','memory','记忆'],['app-appearance','appearance','外观'],['settings','settings','设置']];
const opened=new Set();
let sessionSearch='',oldestFirst=false;
let visibleTray='',closingTray=false;
const sidebarDialog=document.createElement('dialog');sidebarDialog.id='sidebar-dialog';sidebarDialog.className='glass';sidebarDialog.setAttribute('aria-label','侧边栏');document.body.append(sidebarDialog);
let chatUI={tray:'',tab:'stickers',attachments:[]},selection={start:0,end:0};
const expressionDialog=document.createElement('dialog');expressionDialog.className='glass expression-dialog app-sheet bottom-sheet';document.body.append(expressionDialog);
let expressionClosing=false,expressionRevision=0;
const dialog=document.createElement('dialog');dialog.id='memory-dialog';dialog.className='glass';document.body.append(dialog);
const homeEditor=createHomeEditor({app,getState:()=>state,setState:value=>{state=value;},persist,renderHome,notify,compressImage,openApp:goto});
const galleryApp=createGalleryApp({app,getState:()=>state,setState:value=>{state=value;},persist,notify,compressImage});
const diaryApp=createDiaryApp({app,getState:()=>state,setState:value=>{state=value;},persist,notify});
const musicApp=createMusicApp({app,getState:()=>state,setState:value=>{state=value;},persist,notify,compressImage});
const promptLibraries=createPromptLibraries({app,getState:()=>state,setState:value=>{state=value;},persist,notify});
const stickerLibrary=createStickerLibrary({app,getState:()=>state,setState:value=>{state=value;},getUI:()=>chatUI,persist,notify,compressImage});
const chatMedia=createChatMedia({files:chatPreview?.files,app,getState:()=>state,getUI:()=>chatUI,isChat:()=>page==='chat',render,notify});
const backupManager=createBackupManager({app,getState:()=>state,storage,media:{music:musicFile,voice:chatPreview?.files||voiceFile},snapshots:chatPreview?memorySnapshots():undefined,allowAuto:!chatPreview,persist,notify,applyRestored,canStart:()=>!musicApp.ui.busy&&!galleryApp.ui.busy&&!chatUI.voiceBusy});
function notify(value){const n=document.querySelector('#notice');n.textContent=value;n.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('visible'),3500);}
function persist(){try{saveState(storage,state);return true;}catch{notify('本机存储不足或不可用。修改尚未保存，请导出备份或换一张更小的图片。');return false;}}
function saveNotice(text){if(persist())notify(text);}
function applyAppearance(){const root=document.documentElement,a=state.appearance;root.dataset.theme=state.theme;root.style.setProperty('--accent',a.accent);const rgb=a.accent.slice(1).match(/../g).map(c=>parseInt(c,16));root.style.setProperty('--tint',rgb.join(' '));const luminance=rgb.map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);root.style.setProperty('--accent-ink',luminance>.179?'#000000':'#ffffff');root.style.setProperty('--glass-alpha',a.opacity/100);root.style.setProperty('--glass-blur',`${a.blur}px`);root.style.setProperty('--wall-image',a.wallpaper?`url("${a.wallpaper}")`:'none');root.dataset.wallpaper=String(Boolean(a.wallpaper));document.querySelector('meta[name=theme-color]').content=state.theme==='dark'?'#0c0d11':'#eceef3';}
function render(){
 for(const node of app.querySelectorAll('details')){if(node.open)opened.add(node.id);else opened.delete(node.id);}
 applyAppearance();
 const desktopApp=findApp(page),utilityPage=['memory','settings'].includes(page),immersive=page!=='home';
 app.innerHTML=`<div class="shell ${immersive?'immersive':''}"><div class="wallpaper" aria-hidden="true"></div><main>${page==='chat'?chat(state,chatUI):page==='sessions'?sessions(state,sessionSearch,oldestFirst):`<div class="page-content ${page==='home'?'home-page':desktopApp||utilityPage?'desktop-app-page':''}">${desktopApp?appView(page,state,page==='app-music'?musicApp.ui:page==='app-gallery'?galleryApp.ui:promptLibraries.ui[desktopApp.icon]||diaryApp.ui):page==='home'?home(state,homeEditor.ui):page==='memory'?memory(state,memoryFilter,memorySearch):page==='settings'?settings(state,backupManager.ui):`<header class="session-header">${backButton('chat','返回对话')}</header>${sessions(state)}`}</div>`}</main>${immersive?'':`<div class="nav-dock"><nav class="bottom-nav" aria-label="桌面快捷栏">${nav.filter(([p])=>p!=='home').map(([p,i,l])=>`<button data-action="${p}" aria-label="${l}" class="dock-launch"><span class="launcher-tile">${launcherIcon(i)}</span></button>`).join('')}</nav></div>`}</div>`;
 if(sidebarDialog.open){const scroll=sidebarDialog.querySelector('.sidebar-conversations')?.scrollTop||0;sidebarDialog.innerHTML=sidebar(state,page);sidebarDialog.querySelector('.sidebar-conversations').scrollTop=scroll;}
 for(const id of opened){const d=document.getElementById(id);if(d)d.open=true;}
 const messages=document.querySelector('#messages');if(messages)messages.scrollTop=messages.scrollHeight;
 const input=app.querySelector('[name=message]');if(input){input.value=composeDraft;input.setSelectionRange(selection.start,selection.end);resizeComposer();}chatPreview?.decorate({app,state,ui:chatUI,render});updateViewport();syncTray();chatMedia.sync();
}
// Keep the wallpaper, dock and scroll container mounted during desktop updates.
function renderHome(){
 const desktop=app.querySelector('.home-desktop');if(!desktop)return;
 const focusedDot=document.activeElement?.closest('.home-page-dots button')?.dataset.page;
 const template=document.createElement('template');template.innerHTML=home(state,homeEditor.ui);
 const next=template.content.firstElementChild,currentPage=desktop.querySelector('.home-desktop-page'),nextPage=next.querySelector('.home-desktop-page');
 currentPage.replaceChildren(...nextPage.childNodes);
 currentPage.dataset.homePage=nextPage.dataset.homePage;
 currentPage.setAttribute('aria-label',nextPage.getAttribute('aria-label'));
 const dots=desktop.querySelector('.home-page-dots');dots.replaceChildren(...next.querySelector('.home-page-dots').childNodes);
 if(desktop.classList.contains('home-editing')!==homeEditor.ui.editing){
  desktop.classList.toggle('home-editing',homeEditor.ui.editing);
  desktop.querySelector('.home-edit-toolbar')?.remove();desktop.querySelector('.home-edit-help')?.remove();
  if(homeEditor.ui.editing)currentPage.before(next.querySelector('.home-edit-toolbar'),next.querySelector('.home-edit-help'));
 }else{
  const addPage=desktop.querySelector('[data-home-action=add-page]');if(addPage)addPage.disabled=state.home.pages.length>=12;
 }
 if(focusedDot!==undefined)dots.querySelector(`[data-page="${focusedDot}"]`)?.focus({preventScroll:true});
}
function goto(next){homeEditor.exit();if(next==='app-gallery')galleryApp.openHome();if(sidebarDialog.open)sidebarDialog.close();chatUI.tray='';page=next;render();app.querySelector('.page-content')?.scrollTo(0,0);if(findApp(next)||['memory','settings'].includes(next))app.querySelector('.desktop-app-header h1,.music-header h1')?.focus({preventScroll:true});if(!matchMedia('(prefers-reduced-motion: reduce)').matches)app.querySelector('main')?.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:210,easing:'ease-out'});}
function focusSettings(id){if(id==='appearance-settings'){goto('app-appearance');return;}goto('settings');const d=document.getElementById(id);if(d){d.open=true;opened.add(id);d.scrollIntoView({behavior:'smooth',block:'start'});}}
function showMemoryEditor(item,source=''){dialog.innerHTML=memoryEditor(item,source);dialog.showModal();dialog.querySelector('[name=title]').focus();}
function closeModal(){dialog.close();}
function applyRestored(next){chatMedia.reset();stickerLibrary.reset();galleryApp.reset();musicApp.reset();state=next;composeDraft='';chatUI={tray:'',tab:'stickers',attachments:[]};memorySearch='';memoryFilter='all';opened.add('storage-settings');goto('settings');}

function validEndpoint(value){if(!value)return true;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{return false;}}
function handleAction(e){
 const target=e.target.closest('button');if(!target)return;
 if(target.dataset.open){if(state.active!==target.dataset.open){composeDraft='';chatUI.attachments=[];chatUI.replyTo=null;}state.active=target.dataset.open;persist();goto('chat');return;}
 const action=target.dataset.action;
 if(action==='open-app'){if(findApp(target.dataset.app))goto(target.dataset.app);return;}
 if(action==='show-reasoning'){const scroll=app.querySelector('#messages').scrollTop;rememberSelection();chatUI.messageId=target.dataset.id;chatUI.tray='reasoning';render();app.querySelector('#messages').scrollTop=scroll;return;}
 if(action==='cancel-reply'){chatUI.replyTo=null;render();app.querySelector('[name=message]')?.focus({preventScroll:true});return;}
 if(action==='jump-reply'){const targetMessage=[...app.querySelectorAll('.bubble[data-message-id]')].find(el=>el.dataset.messageId===target.dataset.id);if(!targetMessage)return notify('原消息已不在当前对话中。');const article=targetMessage.closest('.message');targetMessage.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});targetMessage.focus({preventScroll:true});article.classList.add('is-reference-target');setTimeout(()=>article.classList.remove('is-reference-target'),1600);return;}
 if(action==='copy-reasoning'){const message=state.sessions.find(s=>s.id===state.active)?.messages.find(m=>m.id===chatUI.messageId);if(message?.reasoningSummary&&!navigator.clipboard?.writeText)return notify('可以长按选择摘要文字后复制。');if(message?.reasoningSummary)navigator.clipboard.writeText(message.reasoningSummary).then(()=>notify('摘要已复制。')).catch(()=>notify('浏览器未允许复制，可以长按选择摘要文字。'));return;}
 if(action==='open-sidebar'){rememberSelection();chatUI.tray='';render();sidebarDialog.innerHTML=sidebar(state,page);sidebarDialog.showModal();sidebarDialog.querySelector('[data-action=close-sidebar]').focus();return;}
 if(action==='close-sidebar'){sidebarDialog.close();return;}
 if(action==='sort-sessions'){oldestFirst=!oldestFirst;render();return;}
 if(action==='pin-session'){const s=state.sessions.find(x=>x.id===target.dataset.id);if(!s)return;s.pinned=!s.pinned;persist();render();return;}
 if(action==='rename-session'){const s=state.sessions.find(x=>x.id===target.dataset.id);if(!s)return;const title=prompt('给这段对话起个名字',s.title);if(title?.trim()){s.title=title.trim().slice(0,80);persist();render();}return;}

 if(action?.startsWith('toggle-')){rememberSelection();const tray=action.slice(7);chatUI.tray=chatUI.tray===tray?'':tray;render();return;}
 if(action==='close-tray'){closeTray();return;}
 if(action==='expression-tab'){chatUI.tab=target.dataset.tab;chatUI.category='all';chatUI.search='';chatUI.managing=false;chatUI.selected=[];render();app.querySelector(`[data-action=expression-tab][data-tab="${chatUI.tab}"]`)?.focus({preventScroll:true});return;}
 if(action==='open-mcp'){focusSettings('plugins-settings');return;}
 if(action==='pick-camera'||action==='pick-image'||action==='pick-file'){app.querySelector(action==='pick-camera'?'#chat-camera':action==='pick-image'?'#chat-images':'#chat-files').click();return;}
 if(action==='remove-attachment'){chatUI.attachments=chatUI.attachments.filter(a=>a.id!==target.dataset.id);render();return;}
 if(action==='add-kaomoji'||action==='edit-kaomoji'){expressionRevision++;expressionClosing=false;expressionDialog.style.transform='';expressionDialog.getAnimations().forEach(a=>a.cancel());const item=state.expressions.kaomoji.find(x=>x.id===target.dataset.id);expressionDialog.innerHTML=`<form id="kaomoji-form">${drawerHeader({title:(item?'编辑':'收藏')+'颜文字',action:'close',actionAttribute:'data-close-expression'})}<p class="sticker-error" role="alert" hidden></p><input name="id" type="hidden" value="${escape(item?.id||'')}"><label class="field"><span>颜文字（最多 200 个字符）</span><textarea name="value" required maxlength="200" rows="3">${escape(item?.value||'')}</textarea></label>${categoryField(state.expressions,item?.category||(!item&&expressionCategories(state.expressions,'kaomoji').some(c=>c.id===chatUI.category)?chatUI.category:''),'kaomoji')}<button class="primary" type="submit">保存</button></form>`;expressionDialog.showModal();expressionDialog.querySelector('[name=value]').focus();return;}
 if(['use-expression','favorite-expression','delete-expression'].includes(action)){
 const items=state.expressions[chatUI.tab],item=items.find(x=>x.id===target.dataset.id);if(!item)return;
 if(action==='favorite-expression')item.favorite=!item.favorite;
 if(action==='delete-expression'){if(!confirm('删除这项收藏？'))return;state.expressions[chatUI.tab]=items.filter(x=>x.id!==item.id);}
 if(action==='use-expression'){
  if(chatUI.tab==='kaomoji'){const before=composeDraft.slice(0,selection.start),after=composeDraft.slice(selection.end);if(before.length+item.value.length+after.length>12000)return notify('消息太长，先删掉一些文字吧。');composeDraft=before+item.value+after;selection.start=selection.end=before.length+item.value.length;}
  else{if(chatUI.attachments.length>=6)return notify('一次最多添加 6 项附件。');chatUI.attachments.push({id:crypto.randomUUID(),name:item.name,note:item.note||item.name,kind:'sticker',size:0,type:'image/*',data:item.value});}
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
 else if(action==='new'){newSession(state);composeDraft='';chatUI.attachments=[];chatUI.replyTo=null;persist();goto('chat');app.querySelector('[name=message]').focus();}
 else if(action==='delete-session'){if(!confirm('删除这段会话？已收藏的记忆会保留。'))return;if(state.active===target.dataset.id){composeDraft='';chatUI.attachments=[];chatUI.replyTo=null;}state.sessions=state.sessions.filter(s=>s.id!==target.dataset.id);if(!state.sessions.length)newSession(state);if(!state.sessions.some(s=>s.id===state.active))state.active=state.sessions[0].id;persist();render();}
 else if(action==='delete-plugin'){if(!confirm('删除这项插件配置？'))return;state.plugins=state.plugins.filter(p=>p.id!==target.dataset.id);persist();render();}
 else if(action==='edit-plugin'){const p=state.plugins.find(x=>x.id===target.dataset.id),form=app.querySelector('#plugin-form');for(const key of ['id','name','url','type'])form.elements[key].value=p[key];document.querySelector('#plugin-form-title').textContent='编辑配置';form.scrollIntoView({behavior:'smooth'});form.elements.name.focus();}
 else if(action==='new-memory')showMemoryEditor();
 else if(action==='filter-memory'){memoryFilter=target.dataset.filter;render();}
 else if(action==='edit-memory')showMemoryEditor(state.memories.find(m=>m.id===target.dataset.id));
 else if(action==='delete-memory'){if(!confirm('删除这条记忆？删除后无法恢复。'))return;state.memories=state.memories.filter(m=>m.id!==target.dataset.id);persist();render();}
 else if(action==='remember'){const s=state.sessions.find(x=>x.id===state.active),m=s.messages.find(x=>x.id===target.dataset.id);showMemoryEditor({content:m.text||m.attachments?.map(a=>a.name).join('、')||'',title:'',kind:'short'},s.title);}
 else if(action==='export')backupManager.exportJSON();
}
app.addEventListener('click',handleAction);
sidebarDialog.addEventListener('click',e=>{if(e.target===sidebarDialog){const r=sidebarDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)sidebarDialog.close();}else handleAction(e);});
app.addEventListener('submit',e=>{
 e.preventDefault();const form=e.target,data=Object.fromEntries(new FormData(form));
 if(form.getAttribute('id')==='compose'){if(chatUI.voiceBusy)return notify('语音还在读取，稍等一下。');if(!data.message.trim()&&!chatUI.attachments.length)return;const snapshot=structuredClone(state);addDraftMessage(state,data.message,chatUI.attachments,chatUI.replyTo);const ok=persist();if(!ok){state=snapshot;return;}composeDraft='';selection={start:0,end:0};chatUI.attachments=[];chatUI.replyTo=null;chatUI.tray='';render();app.querySelector('[name=message]').focus();if(ok)notify('已保存本机；模型未连接，这条消息没有发送。');}
 else if(form.getAttribute('id')==='persona-form'){if(!data.name.trim())return notify('请填写 AI 名字。');state.persona={name:data.name.trim().slice(0,40),prompt:data.prompt};saveNotice('角色已保存。');}
 else if(form.getAttribute('id')==='provider-form'){if(!validEndpoint(data.baseUrl.trim()))return notify('请使用不含密钥、查询参数或账号信息的 HTTPS 地址。');state.provider={protocol:data.protocol,baseUrl:data.baseUrl.trim(),model:data.model.trim()};saveNotice('模型配置已保存，尚未连接服务。');}
 else if(form.getAttribute('id')==='plugin-form'){if(!data.name.trim()||!data.url.trim())return notify('请填写名称和服务地址。');if(!validEndpoint(data.url.trim()))return notify('请使用不含密钥、查询参数或账号信息的 HTTPS 地址。');const p={id:data.id||crypto.randomUUID(),name:data.name.trim().slice(0,80),type:data.type,url:data.url.trim()},i=state.plugins.findIndex(x=>x.id===p.id);if(i<0)state.plugins.push(p);else state.plugins[i]=p;saveNotice('配置已保存，插件运行尚未接入。');render();}
});
app.addEventListener('input',e=>{
 const t=e.target;
 if(t.name==='message'){composeDraft=t.value;selection={start:t.selectionStart,end:t.selectionEnd};resizeComposer();}
 if(t.id==='session-search'){const pos=t.selectionStart;sessionSearch=t.value;render();const n=app.querySelector('#session-search');n.focus();try{n.setSelectionRange(pos,pos);}catch{}}
 if(t.id==='memory-search'){const pos=t.selectionStart;memorySearch=t.value;render();const n=app.querySelector('#memory-search');n.focus();try{n.setSelectionRange(pos,pos);}catch{}}
 if(['accent','blur','opacity'].includes(t.name)&&t.closest('#appearance-settings')){state.appearance[t.name]=t.name==='accent'?t.value:Number(t.value);applyAppearance();if(t.type==='range')t.style.setProperty('--range-fill',`${(Number(t.value)-Number(t.min))/(Number(t.max)-Number(t.min))*100}%`);if(t.name==='accent'){app.querySelector('.custom-color-picker')?.style.setProperty('--swatch',t.value);const value=app.querySelector('[data-custom-color-value]');if(value)value.textContent=t.value;}const output=document.querySelector(`#${t.name}-output`);if(output)output.textContent=t.name==='opacity'?`${100-state.appearance.opacity}%`:`${state.appearance.blur}px`;if(t.name==='opacity')t.setAttribute('aria-valuetext',`${100-state.appearance.opacity}% 透明度`);}
});
app.addEventListener('change',async e=>{
 const t=e.target;
 if(['chat-camera','chat-images','chat-files'].includes(t.id)&&t.files?.length){
  t.disabled=true;
  try{
   for(const file of t.files){
     if(chatUI.attachments.length>=6)throw new Error('一次最多添加 6 项附件。');
     if(file.size>10*1024*1024)throw new Error('单个附件不能超过 10MB。');
     const data=['chat-camera','chat-images'].includes(t.id)?await compressImage(file,1024):'';
     chatUI.attachments.push({id:crypto.randomUUID(),name:file.name,size:file.size,type:file.type,data});
    }
  }catch(error){notify(error.message);}finally{t.disabled=false;t.value='';if(page==='chat'){chatUI.tray='';render();}}
  return;
 }
 if(['accent','blur','opacity'].includes(t.name)&&t.closest('#appearance-settings'))persist();
 if(t.dataset.image && t.files[0]){
   const key=t.dataset.image,previous=state.appearance[key];
   try{const data=await compressImage(t.files[0],key==='wallpaper'?1440:256);state.appearance[key]=data;if(!persist()){state.appearance[key]=previous;return;}const y=app.querySelector('.page-content').scrollTop;render();app.querySelector('.page-content').scrollTop=y;notify('图片已保存。');}catch(error){notify(error.message);}
 }

});
app.addEventListener('keydown',e=>{if(e.target.name==='message'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!e.repeat){e.preventDefault();e.target.form.requestSubmit();}});
dialog.addEventListener('click',e=>{if(e.target.closest('[data-action=close-modal]'))closeModal();});
dialog.addEventListener('change',e=>{if(e.target.name==='kind')document.querySelector('#memory-days-field').hidden=e.target.value==='permanent';});
dialog.addEventListener('submit',e=>{e.preventDefault();try{saveMemory(state,Object.fromEntries(new FormData(e.target)));const ok=persist();closeModal();render();if(ok)notify('记忆已收藏。');}catch(error){notify(error.message);}});
async function compressImage(file,max,{transparent=false}={}){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('请选择 JPG、PNG 或 WebP 图片。');
 if(file.size>12*1024*1024)throw new Error('图片超过 12MB，请先压缩。');
 const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await img.decode();if(!img.naturalWidth||!img.naturalHeight)throw new Error('无法读取图片。');const ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));const context=canvas.getContext('2d');if(!transparent){context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);}context.drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL(transparent?'image/webp':'image/jpeg',.78);if(data.length>1100000)throw new Error('图片保存后仍然太大，请换一张较小图片。');return data;}finally{URL.revokeObjectURL(url);}
}
let shownDate=localDate();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&page==='home'&&shownDate!==localDate()){shownDate=localDate();render();}});
render();

finishSplash().catch(()=>{document.querySelector('#splash')?.remove();app.inert=false;});

function rememberSelection(){const input=app.querySelector('[name=message]');if(input)selection={start:input.selectionStart,end:input.selectionEnd};}
function resizeComposer(){const input=app.querySelector('[name=message]');if(!input)return;input.style.height='auto';const style=getComputedStyle(input),max=parseFloat(style.lineHeight)*6+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);input.style.height=`${Math.min(input.scrollHeight,max)}px`;input.style.overflowY=input.scrollHeight>max?'auto':'hidden';const footer=app.querySelector('.composer-wrap');if(footer)app.querySelector('.chat-view').style.setProperty('--composer-height',`${footer.getBoundingClientRect().height}px`);}
function updateViewport(){const shell=app.querySelector('.immersive');if(!shell)return;const vv=window.visualViewport;shell.style.height=`${vv?vv.height:window.innerHeight}px`;shell.style.top=`${vv?vv.offsetTop:0}px`;}
window.visualViewport?.addEventListener('resize',updateViewport);window.visualViewport?.addEventListener('scroll',updateViewport);window.addEventListener('resize',()=>{updateViewport();resizeComposer();});
app.addEventListener('focusout',e=>{if(e.target.name==='message')rememberSelection();});
app.addEventListener('keyup',e=>{if(e.target.name==='message')rememberSelection();});
app.addEventListener('click',e=>{if(e.target.name==='message')rememberSelection();});
app.addEventListener('keydown',e=>{if(e.key==='Escape'&&chatUI.tray){e.preventDefault();closeTray();}else if(e.key==='Escape'&&chatUI.replyTo){chatUI.replyTo=null;render();app.querySelector('[name=message]')?.focus({preventScroll:true});}});
const closeExpression=async()=>{if(!expressionDialog.open||expressionClosing)return;expressionClosing=true;const revision=expressionRevision;await animateDrawerClose(expressionDialog);if(revision!==expressionRevision)return;expressionDialog.close();expressionClosing=false;};
bindDrawerDismiss(expressionDialog,{panel:()=>expressionDialog.open&&!expressionClosing?expressionDialog:null,close:closeExpression,backdrop:true});
expressionDialog.addEventListener('cancel',e=>{e.preventDefault();void closeExpression();});
expressionDialog.addEventListener('click',e=>{if(e.target.closest('[data-close-expression]'))void closeExpression();});
expressionDialog.addEventListener('submit',e=>{e.preventDefault();const form=e.target,snapshot=structuredClone(state.expressions);
 try{saveKaomoji(state.expressions,Object.fromEntries(new FormData(form)));if(!persist())throw new Error('保存失败，内容仍保留在这里，请释放本机空间后重试。');}
 catch(error){state.expressions=snapshot;const alert=expressionDialog.querySelector('[role=alert]');alert.textContent=error.message;alert.hidden=false;return;}
 expressionDialog.close();render();notify('颜文字已保存。');
});

const trayMotion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
function syncTray(){const panel=app.querySelector('.chat-tray');if(!panel){visibleTray='';closingTray=false;return;}for(const el of app.querySelectorAll('.chat-header,.messages,.composer-wrap'))el.inert=true;panel.focus({preventScroll:true});if(visibleTray!==chatUI.tray&&trayMotion())panel.animate([{transform:'translateY(100%)'},{transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});visibleTray=chatUI.tray;}
async function closeTray(){if(closingTray)return;const previous=chatUI.tray,panel=app.querySelector('.chat-tray');closingTray=true;await animateDrawerClose(panel);if(panel&&app.querySelector('.chat-tray')!==panel){closingTray=false;return;}const scroll=app.querySelector('#messages')?.scrollTop;chatUI.tray='';render();if(scroll!==undefined)app.querySelector('#messages').scrollTop=scroll;const trigger=previous==='reasoning'?[...app.querySelectorAll('[data-action=show-reasoning]')].find(e=>e.dataset.id===chatUI.messageId):app.querySelector(`[data-action="toggle-${previous}"]`);trigger?.focus({preventScroll:true});}
app.addEventListener('keydown',e=>{const panel=app.querySelector('.chat-tray');if(!panel||e.key!=='Tab')return;const nodes=[...panel.querySelectorAll('button:not(:disabled),input,textarea,select')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});
bindDrawerDismiss(app,{panel:()=>closingTray?null:app.querySelector('.chat-tray'),close:closeTray});

const messageDialog=document.createElement('dialog');messageDialog.className='glass message-dialog';messageDialog.setAttribute('aria-label','消息操作');document.body.append(messageDialog);
let press=null,messageTarget=null;
function openMessageMenu(id,anchor){const session=state.sessions.find(s=>s.id===state.active),message=session.messages.find(m=>m.id===id);if(!message||chatUI.tray||messageDialog.open)return;messageTarget={session:session.id,id};const actions=message.role==='user'?[['copy','复制'],['reply','引用'],['edit','编辑消息'],['rollback','回滚至此'],['branch','创建分支'],['delete','删除']]:[['copy','复制'],['reply','引用'],['branch','创建分支'],['delete','删除']];messageDialog.innerHTML=`<div class="message-menu">${actions.map(([action,label])=>`<button data-message-action="${action}" class="${action==='delete'?'destructive':''}">${label}</button>`).join('')}</div>`;messageDialog.style.left=`${Math.max(12,Math.min(innerWidth-212,anchor.x))}px`;messageDialog.style.top=`${Math.max(12,Math.min(innerHeight-actions.length*48-24,anchor.y))}px`;messageDialog.showModal();messageDialog.querySelector('button').focus({preventScroll:true});}
function cancelPress(){if(press)clearTimeout(press.timer);press=null;}
app.addEventListener('pointerdown',e=>{const bubble=e.target.closest('[data-message-id]');if(!bubble||e.button!==0||e.target.closest('button,input,textarea,select,a'))return;cancelPress();const id=bubble.dataset.messageId,x=e.clientX,y=e.clientY;press={x,y,timer:setTimeout(()=>{press=null;openMessageMenu(id,{x,y});},500)};});
app.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>10)cancelPress();});
for(const event of ['pointerup','pointercancel','scroll'])app.addEventListener(event,cancelPress,true);
app.addEventListener('contextmenu',e=>{const bubble=e.target.closest('[data-message-id]');if(!bubble)return;e.preventDefault();cancelPress();openMessageMenu(bubble.dataset.messageId,{x:e.clientX,y:e.clientY});});
app.addEventListener('keydown',e=>{const bubble=e.target.closest('[data-message-id]');if(bubble&&(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')){e.preventDefault();const r=bubble.getBoundingClientRect();openMessageMenu(bubble.dataset.messageId,{x:r.left,y:r.bottom});}});
messageDialog.addEventListener('click',async e=>{if(e.target===messageDialog){const r=messageDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)messageDialog.close();return;}if(e.target.closest('[data-cancel-edit]')){messageDialog.close();return;}const action=e.target.closest('[data-message-action]')?.dataset.messageAction;if(!action||messageTarget?.session!==state.active)return;const message=state.sessions.find(s=>s.id===state.active)?.messages.find(m=>m.id===messageTarget.id);if(!message)return;
 if(action==='copy'){try{await navigator.clipboard.writeText(message.text||message.attachments?.map(a=>a.name).join('、')||'');messageDialog.close();notify('已复制。');}catch{notify('浏览器未允许复制，请重试或手动选择文字。');}return;}
 if(action==='reply'){chatUI.replyTo=makeReply(state,message);messageTarget=null;messageDialog.close();render();app.querySelector('[name=message]')?.focus({preventScroll:true});return;}
 if(action==='edit'){messageDialog.style.left='';messageDialog.style.top='';messageDialog.classList.add('editing');messageDialog.innerHTML=`<form id="message-edit-form"><div class="dialog-heading"><h2>编辑消息</h2><button type="button" data-cancel-edit aria-label="取消">${icon('close')}</button></div><label class="field"><span>消息内容</span><textarea name="text" maxlength="12000" rows="6">${escape(message.text)}</textarea></label><p class="hint">附件会保留，已有回复不会重新生成。</p><button type="submit" class="primary">保存修改</button></form>`;messageDialog.querySelector('textarea').focus();return;}
 if(action==='rollback'&&!confirm('保留这条消息，移除它后面的所有消息？'))return;
 if(action==='delete'&&!confirm('删除这条消息？'))return;
 const snapshot=structuredClone(state);try{changeMessage(state,messageTarget.id,action);if(!persist()){state=snapshot;return;}messageDialog.close();if(action==='branch'){composeDraft='';chatUI.attachments=[];chatUI.replyTo=null;}render();notify(action==='branch'?'已创建分支，原对话保留。':action==='rollback'?'已回滚至这条消息。':'消息已删除。');}catch(error){state=snapshot;notify(error.message);}
});
messageDialog.addEventListener('submit',e=>{e.preventDefault();if(e.target.id!=='message-edit-form'||messageTarget?.session!==state.active)return;const snapshot=structuredClone(state),scroll=app.querySelector('#messages')?.scrollTop;try{changeMessage(state,messageTarget.id,'edit',e.target.elements.text.value);if(!persist()){state=snapshot;return;}messageDialog.close();render();app.querySelector('#messages').scrollTop=scroll;notify('消息已修改。');}catch(error){state=snapshot;notify(error.message);}});
messageDialog.addEventListener('close',()=>{messageDialog.classList.remove('editing');const bubble=[...app.querySelectorAll('[data-message-id]')].find(e=>e.dataset.messageId===messageTarget?.id);bubble?.focus({preventScroll:true});});

// Tool entry for a future model service; validates an existing user photo.
export function saveConversationPhoto(request){return galleryApp.saveConversationPhoto(request);}
