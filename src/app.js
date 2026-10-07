import { finishSplash } from './splash.js';
import { icon } from './icons.js';
import { localDate, loadState, saveState, normalizeState, newSession, addDraftMessage, exportData, saveMemory } from './store.js';
import { home, chat, sessions, settings, memory, memoryEditor, escape, button } from './views.js';
let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw new Error('本机存储不可用');}};}
let state=loadState(storage), page='home', memoryFilter='all', memorySearch='', toastTimer, composeDraft='';
const app=document.querySelector('#app'), nav=[['home','home','主页'],['chat','chat','对话'],['memory','memory','记忆'],['settings','settings','设置']];
const opened=new Set();
const dialog=document.createElement('dialog');dialog.id='memory-dialog';dialog.className='glass';document.body.append(dialog);
function notify(value){const n=document.querySelector('#notice');n.textContent=value;n.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('visible'),3500);}
function persist(){try{saveState(storage,state);return true;}catch{notify('本机存储不足或不可用。修改尚未保存，请导出备份或换一张更小的图片。');return false;}}
function saveNotice(text){if(persist())notify(text);}
function applyAppearance(){const root=document.documentElement,a=state.appearance;root.dataset.theme=state.theme;root.style.setProperty('--accent',a.accent);const rgb=a.accent.slice(1).match(/../g).map(c=>parseInt(c,16));root.style.setProperty('--tint',rgb.join(' '));root.style.setProperty('--glass-alpha',a.opacity/100);root.style.setProperty('--glass-blur',`${a.blur}px`);root.style.setProperty('--wall-image',a.wallpaper?`url("${a.wallpaper}")`:'none');root.dataset.wallpaper=String(Boolean(a.wallpaper));document.querySelector('meta[name=theme-color]').content=state.theme==='dark'?'#20232d':'#eceef3';}
function render(){
 for(const node of app.querySelectorAll('details')){if(node.open)opened.add(node.id);else opened.delete(node.id);}
 applyAppearance();
 const activePage=page==='sessions'?'chat':page;
 app.innerHTML=`<div class="shell"><div class="wallpaper" aria-hidden="true"></div><main>${page==='chat'?chat(state):`<div class="page-content ${page==='home'?'home-page':''}">${page==='home'?home(state):page==='memory'?memory(state,memoryFilter,memorySearch):page==='settings'?settings(state):`<header class="session-header">${button('chat','back','返回对话')}</header>${sessions(state)}`}</div>`}</main><div class="nav-dock"><nav class="bottom-nav glass" aria-label="主导航">${nav.map(([p,i,l])=>`<button data-action="${p}" class="${activePage===p?'active':''}" ${activePage===p?'aria-current="page"':''}>${icon(i)}<span>${l}</span></button>`).join('')}</nav></div></div>`;
 for(const id of opened){const d=document.getElementById(id);if(d)d.open=true;}
 const messages=document.querySelector('#messages');if(messages)messages.scrollTop=messages.scrollHeight;
 const input=app.querySelector('[name=message]');if(input)input.value=composeDraft;
}
function goto(next){page=next;render();app.querySelector('.page-content')?.scrollTo(0,0);}
function focusSettings(id){goto('settings');const d=document.getElementById(id);if(d){d.open=true;opened.add(id);d.scrollIntoView({behavior:'smooth',block:'start'});}}
function showMemoryEditor(item,source=''){dialog.innerHTML=memoryEditor(item,source);dialog.showModal();dialog.querySelector('[name=title]').focus();}
function closeModal(){dialog.close();}
function exportBackup(){const url=URL.createObjectURL(new Blob([exportData(state)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`chenxin-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function validEndpoint(value){if(!value)return true;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{return false;}}
app.addEventListener('click',e=>{
 const target=e.target.closest('button');if(!target)return;
 if(target.dataset.open){state.active=target.dataset.open;composeDraft='';persist();goto('chat');return;}
 const action=target.dataset.action;
 if(nav.some(n=>n[0]===action)||action==='sessions')goto(action);
 else if(action==='customize')focusSettings(target.dataset.section||'appearance-settings');
 else if(action==='persona')focusSettings('persona-settings');
 else if(action==='theme'){state.theme=state.theme==='dark'?'light':'dark';persist();const y=app.querySelector('.page-content').scrollTop;render();app.querySelector('.page-content').scrollTop=y;}
 else if(action==='accent'){state.appearance.accent=target.dataset.color;persist();const y=app.querySelector('.page-content').scrollTop;render();app.querySelector('.page-content').scrollTop=y;}
 else if(action==='clear-image'){const key=target.dataset.key;if(!['wallpaper','userAvatar','aiAvatar'].includes(key))return;state.appearance[key]='';persist();const y=app.querySelector('.page-content').scrollTop;render();app.querySelector('.page-content').scrollTop=y;}
 else if(action==='mood'){state.home.mood=target.dataset.mood;persist();render();}
 else if(action==='move-widget'){const i=state.home.widgets.findIndex(w=>w.type===target.dataset.type),j=i+Number(target.dataset.direction);if(j<0||j>=state.home.widgets.length)return;[state.home.widgets[i],state.home.widgets[j]]=[state.home.widgets[j],state.home.widgets[i]];persist();const y=app.querySelector('.page-content').scrollTop;render();app.querySelector('.page-content').scrollTop=y;}
 else if(action==='new'){newSession(state);composeDraft='';persist();goto('chat');app.querySelector('[name=message]').focus();}
 else if(action==='delete-session'){if(!confirm('删除这段会话？已收藏的记忆会保留。'))return;state.sessions=state.sessions.filter(s=>s.id!==target.dataset.id);if(!state.sessions.length)newSession(state);if(!state.sessions.some(s=>s.id===state.active))state.active=state.sessions[0].id;persist();render();}
 else if(action==='delete-plugin'){if(!confirm('删除这项插件配置？'))return;state.plugins=state.plugins.filter(p=>p.id!==target.dataset.id);persist();render();}
 else if(action==='edit-plugin'){const p=state.plugins.find(x=>x.id===target.dataset.id),form=app.querySelector('#plugin-form');for(const key of ['id','name','url','type'])form.elements[key].value=p[key];document.querySelector('#plugin-form-title').textContent='编辑配置';form.scrollIntoView({behavior:'smooth'});form.elements.name.focus();}
 else if(action==='new-memory')showMemoryEditor();
 else if(action==='filter-memory'){memoryFilter=target.dataset.filter;render();}
 else if(action==='edit-memory')showMemoryEditor(state.memories.find(m=>m.id===target.dataset.id));
 else if(action==='delete-memory'){if(!confirm('删除这条记忆？删除后无法恢复。'))return;state.memories=state.memories.filter(m=>m.id!==target.dataset.id);persist();render();}
 else if(action==='remember'){const s=state.sessions.find(x=>x.id===state.active),m=s.messages.find(x=>x.id===target.dataset.id);showMemoryEditor({content:m.text,title:'',kind:'short'},s.title);}
 else if(action==='export')exportBackup();
});
app.addEventListener('submit',e=>{
 e.preventDefault();const form=e.target,data=Object.fromEntries(new FormData(form));
 if(form.getAttribute('id')==='compose'){if(!addDraftMessage(state,data.message))return;composeDraft='';const ok=persist();render();app.querySelector('[name=message]').focus();if(ok)notify('已保存本机；模型未连接，这条消息没有发送。');}
 else if(form.getAttribute('id')==='persona-form'){if(!data.name.trim())return notify('请填写 AI 名字。');state.persona={name:data.name.trim().slice(0,40),prompt:data.prompt};saveNotice('角色已保存。');}
 else if(form.getAttribute('id')==='home-form'){if(!data.since)return notify('请选择开始日期。');state.home={...state.home,title:data.title.trim().slice(0,40)||'在一起的日子',since:data.since,userName:data.userName.trim().slice(0,40)||'我',subtitle:data.subtitle.slice(0,200)};saveNotice('纪念日已保存。');}
 else if(form.getAttribute('id')==='note-form'){state.home.note=data.note.slice(0,500);saveNotice('便签已保存。');}
 else if(form.getAttribute('id')==='provider-form'){if(!validEndpoint(data.baseUrl.trim()))return notify('请使用不含密钥、查询参数或账号信息的 HTTPS 地址。');state.provider={protocol:data.protocol,baseUrl:data.baseUrl.trim(),model:data.model.trim()};saveNotice('模型配置已保存，尚未连接服务。');}
 else if(form.getAttribute('id')==='plugin-form'){if(!data.name.trim()||!data.url.trim())return notify('请填写名称和服务地址。');if(!validEndpoint(data.url.trim()))return notify('请使用不含密钥、查询参数或账号信息的 HTTPS 地址。');const p={id:data.id||crypto.randomUUID(),name:data.name.trim().slice(0,80),type:data.type,url:data.url.trim()},i=state.plugins.findIndex(x=>x.id===p.id);if(i<0)state.plugins.push(p);else state.plugins[i]=p;saveNotice('配置已保存，插件运行尚未接入。');render();}
});
app.addEventListener('input',e=>{
 const t=e.target;
 if(t.name==='message')composeDraft=t.value;
 if(t.id==='memory-search'){const pos=t.selectionStart;memorySearch=t.value;render();const n=app.querySelector('#memory-search');n.focus();try{n.setSelectionRange(pos,pos);}catch{}}
 if(['accent','blur','opacity'].includes(t.name)&&t.closest('#appearance-settings')){state.appearance[t.name]=t.name==='accent'?t.value:Number(t.value);applyAppearance();const output=document.querySelector(`#${t.name}-output`);if(output)output.textContent=t.name==='opacity'?`${100-state.appearance.opacity}%`:`${state.appearance.blur}px`;}
});
app.addEventListener('change',async e=>{
 const t=e.target;
 if(['accent','blur','opacity'].includes(t.name)&&t.closest('#appearance-settings'))persist();
 if(t.dataset.widget){const w=state.home.widgets.find(w=>w.type===t.dataset.widget);w.enabled=t.checked;persist();}
 if(t.dataset.image && t.files[0]){
   const key=t.dataset.image,previous=state.appearance[key];
   try{const data=await compressImage(t.files[0],key==='wallpaper'?1440:256);state.appearance[key]=data;if(!persist()){state.appearance[key]=previous;return;}const y=app.querySelector('.page-content').scrollTop;render();app.querySelector('.page-content').scrollTop=y;notify('图片已保存。');}catch(error){notify(error.message);}
 }
 if(t.id==='import-data'&&t.files[0]){
   try{if(t.files[0].size>6*1024*1024)throw new Error('备份超过 6MB，请先缩小备份。');const next=normalizeState(JSON.parse(await t.files[0].text()));if(!confirm('导入会替换当前会话、记忆和外观。已导出当前备份了吗？'))return;try{saveState(storage,next);}catch{throw new Error('本机存储不足，原数据未替换。');}state=next;composeDraft='';memorySearch='';memoryFilter='all';goto('home');notify('备份已恢复。');}catch(error){notify(`导入失败：${error.message}`);}finally{t.value='';}
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
