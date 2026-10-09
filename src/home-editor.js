import { avatar, escape, field, widgetLabels } from './views.js';
import { icon } from './icons.js';
import { daysTogether, isExpired, localDate } from './store.js';

export function createHomeEditor({app,getState,setState,persist,render,notify,compressImage}) {
 const ui={editing:false};
 const dialog=document.createElement('dialog');dialog.className='glass home-editor-dialog';dialog.setAttribute('aria-label','编辑主页小组件');document.body.append(dialog);
 let draft=null,type='',press=null,ignoreClickUntil=0,held=false,lastDate=localDate(),uploads=0;
 const motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
 function refresh(){const y=app.querySelector('.home-page')?.scrollTop||0;render();const page=app.querySelector('.home-page');if(page)page.scrollTop=y;}
 function report(message){const el=dialog.querySelector('.home-editor-error');if(el){el.hidden=false;el.textContent=message;}else notify(message);}
 function commit(change){const before=structuredClone(getState());change(getState());if(!persist()){setState(before);if(dialog.open)report('保存失败，本机存储空间可能不足。当前修改尚未保存。');return false;}return true;}
 function begin(){if(ui.editing)return;ui.editing=true;refresh();if(motion())app.querySelectorAll('.home-widget').forEach(el=>el.animate([{transform:'rotate(-.5deg)'},{transform:'rotate(.5deg)'},{transform:'rotate(0)'}],{duration:260,iterations:2}));}
 function header(title){return `<div class="home-editor-heading"><h2>${title}</h2><button type="button" data-home-close aria-label="关闭编辑">${icon('close')}</button></div><p class="home-editor-error hint" role="alert" hidden></p>`;}
 function open(kind){
  type=kind;uploads=0;draft=structuredClone(getState());const h=draft.home;
  let content='';
  if(kind==='add'){content=`${header('添加小组件')}<div class="home-widget-picker">${h.widgets.map(w=>`<button data-home-add="${w.type}" ${w.enabled?'disabled':''}><span>${widgetLabels[w.type]}</span><small>${w.enabled?'已在主页':'添加 +'}</small></button>`).join('')}</div>`;}
  else if(kind==='anniversary'){
   content=field('纪念日名称','title',h.title)+field('开始日期','since',h.since,'','date')+`<div class="home-avatar-editor">${[['user','userAvatar','你的头像'],['ai','aiAvatar','AI 头像']].map(([who,key,label])=>`<div><div data-avatar-preview="${key}">${avatar(draft,who)}</div><label class="upload-label">${label}<input type="file" data-home-avatar="${key}" accept="image/jpeg,image/png,image/webp"></label><button type="button" data-reset-avatar="${key}" class="text-button">恢复默认</button></div>`).join('')}</div>`+field('你的名字','userName',h.userName)+field('AI 名字','aiName',draft.persona.name)+field('你的气泡','userBubble',h.userBubble||'喵……')+field('AI 的气泡','aiBubble',h.aiBubble||'我在。')+field('下方的一句话','subtitle',h.subtitle)+`<p class="hint">开始当天为第 1 天。头像与名字也会同步用于对话。</p>`;
  }else{
   content=field('组件标题','widgetTitle',h.widgetTitles?.[kind]||widgetLabels[kind]);
   if(kind==='note')content+=`<label class="field"><span>便签内容</span><textarea name="note" maxlength="500" rows="5">${escape(h.note)}</textarea></label>`;
   if(kind==='date')content+=`<label class="home-check"><input name="showWeekday" type="checkbox" ${h.showWeekday!==false?'checked':''}>显示星期</label>`;
   if(kind==='mood')content+=`<label class="field"><span>此刻的心情</span><select name="mood">${['','开心','平静','疲惫','想念'].map(m=>`<option value="${m}" ${h.mood===m?'selected':''}>${m||'还没想好'}</option>`).join('')}</select></label>`;
   if(kind==='memory')content+=`<label class="field"><span>主页展示的记忆</span><select name="memoryId"><option value="">自动显示最新记忆</option>${draft.memories.filter(m=>!isExpired(m)).map(m=>`<option value="${escape(m.id)}" ${h.memoryId===m.id?'selected':''}>${escape(m.title)}</option>`).join('')}</select></label>`;
  }
  dialog.innerHTML=kind==='add'?content:`<form id="home-widget-form">${header(kind==='anniversary'?'编辑纪念日':`编辑${widgetLabels[kind]}`)}${content}<div class="home-editor-footer"><button type="button" class="secondary" data-home-close>取消</button><button class="primary" type="submit">保存</button></div></form>`;
  if(!dialog.open)dialog.showModal();
  dialog.querySelector('[name=since]')?.setAttribute('required','');
  dialog.querySelectorAll('[name=userBubble],[name=aiBubble],[name=userName],[name=aiName],[name=title]').forEach(el=>el.maxLength=40);
  dialog.querySelector('[name=subtitle]')?.setAttribute('maxlength','200');
  dialog.querySelector('[name=widgetTitle]')?.setAttribute('maxlength','20');
  dialog.querySelector('[data-home-close]')?.focus({preventScroll:true});
 }
 function act(target){const action=target.dataset.homeAction,kind=target.dataset.type;
  if(action==='begin'){begin();return;}
  if(action==='done'){ui.editing=false;refresh();return;}
  if(action==='edit'){open(kind);return;}
  if(action==='add'){begin();open('add');return;}
  if(action==='hide'){if(commit(s=>{s.home.widgets.find(w=>w.type===kind).enabled=false;}))refresh();return;}
  if(action==='move'){
   const positions=new Map([...app.querySelectorAll('.home-widget')].map(el=>[el.dataset.homeWidget,el.getBoundingClientRect()]));
   const visible=getState().home.widgets.filter(w=>w.enabled),i=visible.findIndex(w=>w.type===kind),other=visible[i+Number(target.dataset.direction)];if(!other)return;
   if(commit(s=>{const list=s.home.widgets,a=list.findIndex(w=>w.type===kind),b=list.findIndex(w=>w.type===other.type);[list[a],list[b]]=[list[b],list[a]];})){refresh();if(motion())app.querySelectorAll('.home-widget').forEach(el=>{const a=positions.get(el.dataset.homeWidget),b=el.getBoundingClientRect();if(a)el.animate([{transform:`translate(${a.x-b.x}px,${a.y-b.y}px)`},{transform:'translate(0,0)'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});});}return;
  }
 }
 app.addEventListener('click',e=>{if(Date.now()<ignoreClickUntil&&e.target.closest('.home-content')){e.preventDefault();e.stopImmediatePropagation();return;}const target=e.target.closest('[data-home-action]');if(target){e.preventDefault();e.stopImmediatePropagation();act(target);}},true);
 function cancel(){if(press)clearTimeout(press.timer);press=null;}
 app.addEventListener('pointerdown',e=>{if(e.button!==0||ui.editing||!e.target.closest('[data-home-widget]'))return;cancel();held=false;press={x:e.clientX,y:e.clientY,timer:setTimeout(()=>{press=null;held=true;begin();},550)};});
 app.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>10)cancel();});
 app.addEventListener('pointerup',()=>{cancel();if(held){ignoreClickUntil=Date.now()+100;held=false;}});
 for(const name of ['pointercancel','scroll'])app.addEventListener(name,cancel,true);
 app.addEventListener('contextmenu',e=>{if(!e.target.closest('[data-home-widget]'))return;e.preventDefault();cancel();begin();});
 app.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.editing){ui.editing=false;refresh();}if(e.target.matches('[data-home-widget]')&&(e.key==='Enter'||e.key===' '||e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')){e.preventDefault();begin();}});
 dialog.addEventListener('click',e=>{
  if(e.target.closest('[data-home-close]')){dialog.close();return;}
  if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();return;}
  const add=e.target.closest('[data-home-add]');if(add){if(commit(s=>{s.home.widgets.find(w=>w.type===add.dataset.homeAdd).enabled=true;})){refresh();open('add');}return;}
  const reset=e.target.closest('[data-reset-avatar]');if(reset){const key=reset.dataset.resetAvatar;draft.appearance[key]='';dialog.querySelector(`[data-avatar-preview="${key}"]`).innerHTML=avatar(draft,key==='userAvatar'?'user':'ai');}
 });
 dialog.addEventListener('change',async e=>{const input=e.target,key=input.dataset.homeAvatar;if(!key||!input.files[0])return;const editingDraft=draft,save=dialog.querySelector('[type=submit]');uploads++;save.disabled=true;
  try{const data=await compressImage(input.files[0],256);if(!dialog.open||draft!==editingDraft)return;draft.appearance[key]=data;dialog.querySelector(`[data-avatar-preview="${key}"]`).innerHTML=avatar(draft,key==='userAvatar'?'user':'ai');}catch(error){if(draft===editingDraft)report(error.message);}finally{if(draft===editingDraft){uploads--;save.disabled=uploads>0;}input.value='';}
 });
 dialog.addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));if(type==='anniversary'&&daysTogether(data.since)===null){notify('请选择有效的日期。');return;}
  if(commit(s=>{if(type==='anniversary'){Object.assign(s.home,{title:data.title.trim().slice(0,40)||'在一起的日子',since:data.since,userName:data.userName.trim().slice(0,40)||'我',userBubble:data.userBubble.trim().slice(0,40),aiBubble:data.aiBubble.trim().slice(0,40),subtitle:data.subtitle.slice(0,200)});s.persona.name=data.aiName.trim().slice(0,40)||s.persona.name;s.appearance.userAvatar=draft.appearance.userAvatar;s.appearance.aiAvatar=draft.appearance.aiAvatar;}
   else{s.home.widgetTitles={...s.home.widgetTitles,[type]:data.widgetTitle.trim().slice(0,20)};if(type==='note')s.home.note=data.note.slice(0,500);if(type==='date')s.home.showWeekday=data.showWeekday==='on';if(type==='mood')s.home.mood=data.mood;if(type==='memory')s.home.memoryId=data.memoryId;}
  })){dialog.close();refresh();notify('小组件已保存。');}
 });
 dialog.addEventListener('close',()=>{draft=null;app.querySelector(`[data-home-widget="${type}"]`)?.focus({preventScroll:true});});
 function clock(){if(lastDate!==localDate()){lastDate=localDate();if(app.querySelector('.home-page'))refresh();}const clock=app.querySelector('[data-home-clock]');if(!clock)return;const now=new Date(),h=getState().home,days=daysTogether(h.since);clock.textContent=now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false});clock.dateTime=now.toISOString();const count=app.querySelector('[data-home-days]');if(count)count.textContent=days>0?days:1-(days||0);const unit=app.querySelector('[data-home-days-unit]');if(unit)unit.textContent=days>0?'天':'天后开始';}
 setInterval(clock,1000);document.addEventListener('visibilitychange',clock);
 return {ui,exit(){ui.editing=false;cancel();},clock};
}
