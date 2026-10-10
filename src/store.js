import { normalizeHomePages } from './home-layout.js';
export const STORAGE_KEY = 'chenxin.frontend.v1';
export const WIDGETS = ['date', 'note', 'mood', 'memory'];
const text = (v, fallback = '', max = 12000) => typeof v === 'string' ? v.slice(0, max) : fallback;
const image = v => typeof v === 'string' && v.length < 1200000 && /^data:image\/(jpeg|png|webp);base64,[a-z\d+/=]+$/i.test(v) ? v : '';
export function localDate(date = new Date()) {
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function daysTogether(since, now = new Date()) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(since || '')) return null;
 const [y,m,d] = since.split('-').map(Number), start = new Date(y,m-1,d);
 if (localDate(start) !== since) return null;
 return Math.floor((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()) - Date.UTC(y,m-1,d))/86400000) + 1;
}
function extras() {
 return { appearance: { accent:'#7a879a', wallpaper:'', userAvatar:'', aiAvatar:'', blur:22, opacity:60 },
 home: { pages:[['anniversary',...WIDGETS]], anniversaryVisible:true, since:localDate(), title:'在一起的日子', userName:'我', subtitle:'把普通的日子，慢慢收藏。', note:'', mood:'', userBubble:'喵……', aiBubble:'我在。', widgetTitles:{}, showWeekday:true, memoryId:'', widgets:WIDGETS.map(type=>({type,enabled:true})) }, memories:[], expressions:{kaomoji:['❍⩊❍','˶ᵔ ᵕ ᵔ˶','˃ ˄ ˂̥̥','(｡･ω･｡)'].map(value=>({id:crypto.randomUUID(),value,favorite:true,used:0})),stickers:[]} };
}
export function createState() {
 const id = crypto.randomUUID();
 return { version:2, active:id, theme:'light', persona:{name:'尘',prompt:''}, provider:{protocol:'openai',baseUrl:'',model:''}, plugins:[], sessions:[{id,title:'我们的日常',created:Date.now(),messages:[]}], ...extras() };
}
export function normalizeState(s) {
 if (![1,2].includes(s?.version) || !Array.isArray(s.sessions) || !s.sessions.length || !s.persona || !s.provider || !Array.isArray(s.plugins)) throw new Error('不是有效的尘备份');
 const ids = new Set();
 const sessions = s.sessions.map(x => {
   if (typeof x?.id !== 'string' || ids.has(x.id) || typeof x.title !== 'string' || !Array.isArray(x.messages)) throw new Error('会话数据损坏');
   ids.add(x.id);
   return { id:x.id, title:text(x.title,'新的对话',80), created:Number.isFinite(x.created)?x.created:Date.now(), pinned:x.pinned===true,branchedFrom:text(x.branchedFrom,'',100),model:text(x.model,'',200), messages:x.messages.map(m=>{
     if (typeof m?.text !== 'string') throw new Error('消息数据损坏');
     return { id:text(m.id,crypto.randomUUID(),100), role:m.role==='assistant'?'assistant':'user', text:text(m.text), time:Number.isFinite(m.time)?m.time:Date.now(),status:'local',reasoningSummary:text(m.reasoningSummary,'',30000),model:text(m.model,'',200),attachments:normalizeAttachments(m.attachments) };
   }) };
 });
 const defaults = extras(), a = s.appearance || {}, h = s.home || {};
 const widgets = Array.isArray(h.widgets) ? h.widgets.filter(w=>WIDGETS.includes(w?.type)) : defaults.home.widgets;
 const seen = new Set();
 const normalizedWidgets = widgets.filter(w=>!seen.has(w.type) && seen.add(w.type)).map(w=>({type:w.type,enabled:w.enabled !== false}));
 WIDGETS.forEach(type=>{if(!seen.has(type)) normalizedWidgets.push({type,enabled:true});});
 return {version:2, expressions:normalizeExpressions(s.expressions,defaults.expressions), active:ids.has(s.active)?s.active:sessions[0].id, theme:s.theme==='dark'?'dark':'light', sessions,
 persona:{name:text(s.persona.name,'尘',40)||'尘',prompt:text(s.persona.prompt)},
 provider:{protocol:['openai','anthropic','gemini'].includes(s.provider.protocol)?s.provider.protocol:'openai',baseUrl:text(s.provider.baseUrl,'',2000),model:text(s.provider.model,'',200)},
 plugins:s.plugins.map(p=>{if(typeof p?.id!=='string'||typeof p.name!=='string'||typeof p.url!=='string')throw new Error('插件数据损坏');return {id:p.id,name:text(p.name,'',80),url:text(p.url,'',2000),type:p.type==='plugin'?'plugin':'mcp'};}),
 appearance:{accent:/^#[a-f\d]{6}$/i.test(a.accent)?a.accent:defaults.appearance.accent,wallpaper:image(a.wallpaper),userAvatar:image(a.userAvatar),aiAvatar:image(a.aiAvatar),blur:Number.isFinite(a.blur)?Math.min(40,Math.max(0,a.blur)):22,opacity:Number.isFinite(a.opacity)?Math.min(95,Math.max(30,a.opacity)):60},
 home:{pages:normalizeHomePages(h.pages,normalizedWidgets),anniversaryVisible:h.anniversaryVisible!==false,userBubble:text(h.userBubble,'喵……',40),aiBubble:text(h.aiBubble,'我在。',40),widgetTitles:Object.fromEntries(WIDGETS.map(type=>[type,text(h.widgetTitles?.[type],'',20)])),showWeekday:h.showWeekday!==false,memoryId:text(h.memoryId,'',100),since:daysTogether(h.since)!==null?h.since:defaults.home.since,title:text(h.title,defaults.home.title,40),userName:text(h.userName,'我',40),subtitle:text(h.subtitle,defaults.home.subtitle,200),note:text(h.note,'',500),mood:text(h.mood,'',30),widgets:normalizedWidgets},
 memories:Array.isArray(s.memories)?s.memories.map(m=>{
   if (typeof m?.id !== 'string'|| typeof m.content !== 'string') throw new Error('记忆数据损坏');
   return {id:m.id,title:text(m.title,'',80),content:text(m.content),kind:m.kind==='permanent'?'permanent':'short',created:Number.isFinite(m.created)?m.created:Date.now(),expires:m.kind==='permanent'?null:Number.isFinite(m.expires)?m.expires:Date.now()+7*86400000,source:text(m.source,'',200)};
 }):[] };
}
export function loadState(storage) { try { return normalizeState(JSON.parse(storage.getItem(STORAGE_KEY))); } catch { return createState(); } }
export function saveState(storage,state) { storage.setItem(STORAGE_KEY,JSON.stringify(state)); }
export function newSession(state) { const s={id:crypto.randomUUID(),title:'新的对话',created:Date.now(),pinned:false,messages:[]};state.sessions.unshift(s);state.active=s.id;return s; }
export function addDraftMessage(state,value,attachments=[]) { const s=state.sessions.find(x=>x.id===state.active), content=value.trim();const files=normalizeAttachments(attachments);if(!content&&!files.length)return null;const m={id:crypto.randomUUID(),role:'user',text:content,time:Date.now(),status:'local',attachments:files,model:s.model||state.provider.model||''};if(!s.messages.length)s.title=content.slice(0,18)||files[0].name;s.messages.push(m);return m; }
export function isExpired(memory,now=Date.now()) { return memory.kind==='short' && Number.isFinite(memory.expires) && memory.expires <= now; }
export function saveMemory(state,data) {
 const content=data.content.trim(); if(!content)throw new Error('请填写记忆内容');
 const existing=state.memories.find(m=>m.id===data.id), kind=data.kind==='permanent'?'permanent':'short';
 const item={id:existing?.id||crypto.randomUUID(),title:data.title.trim().slice(0,80)||content.slice(0,24),content:content.slice(0,12000),kind,created:existing?.created||Date.now(),expires:kind==='permanent'?null:Date.now()+([1,7,30].includes(Number(data.days))?Number(data.days):7)*86400000,source:data.source||existing?.source||''};
 if(existing)state.memories[state.memories.indexOf(existing)]=item;else state.memories.unshift(item);return item;
}
export function exportData(state) { return JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2); }

export function normalizeAttachments(items) {
 return (Array.isArray(items)?items:[]).slice(0,6).filter(x=>typeof x?.name==='string').map(x=>({id:text(x.id,crypto.randomUUID(),100),name:text(x.name,'文件',180),size:Number.isFinite(x.size)?Math.max(0,x.size):0,type:text(x.type,'',100),data:image(x.data)}));
}
function normalizeExpressions(value,defaults) {
 if(!value)return defaults;
 const clean=(items,sticker)=>{const ids=new Set();return (Array.isArray(items)?items:[]).slice(0,200).filter(x=>typeof x?.id==='string'&&!ids.has(x.id)&&ids.add(x.id)).map(x=>({id:x.id,value:sticker?image(x.value):text(x.value,'',200),name:text(x.name,'表情包',80),favorite:x.favorite===true,used:Number.isFinite(x.used)?Math.max(0,x.used):0})).filter(x=>x.value.trim());};
 return {kaomoji:clean(value.kaomoji,false),stickers:clean(value.stickers,true)};
}

export function orderedSessions(state,query='',oldest=false){
 const needle=query.trim().toLocaleLowerCase();
 return state.sessions.filter(s=>!needle||s.title.toLocaleLowerCase().includes(needle)||s.messages.some(m=>m.text.toLocaleLowerCase().includes(needle))).slice().sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(oldest?1:-1)*((a.messages.at(-1)?.time||a.created)-(b.messages.at(-1)?.time||b.created)));
}

export function changeMessage(state,id,operation,value='') {
 const session=state.sessions.find(s=>s.id===state.active),index=session?.messages.findIndex(m=>m.id===id);
 if(index===undefined||index<0)throw new Error('消息不存在');
 const message=session.messages[index];
 if(['edit','rollback'].includes(operation)&&message.role!=='user')throw new Error('仅支持用户消息');
 if(operation==='edit'){const next=value.trim();if(!next&&!message.attachments?.length)throw new Error('消息不能为空');message.text=next.slice(0,12000);}
 else if(operation==='rollback')session.messages=session.messages.slice(0,index+1);
 else if(operation==='delete')session.messages.splice(index,1);
 else if(operation==='branch'){const branch={id:crypto.randomUUID(),title:(session.title+' · 分支').slice(0,80),created:Date.now(),pinned:false,model:session.model||'',branchedFrom:session.id,messages:structuredClone(session.messages.slice(0,index+1))};state.sessions.unshift(branch);state.active=branch.id;return branch;}
 else throw new Error('未知操作');
 return message;
}
