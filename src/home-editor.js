import { moveHomeWidget, widgetMenuPosition } from './home-layout.js';
import { avatar, escape, field, widgetLabels } from './views.js';
import { icon } from './icons.js';
import { daysTogether, isExpired, localDate } from './store.js';

export function createHomeEditor({app,getState,setState,persist,render,notify,compressImage}) {
 const ui={editing:false,page:0,dragPages:null};
 const dialog=document.createElement('dialog');dialog.className='glass home-editor-dialog';dialog.setAttribute('aria-label','编辑主页小组件');document.body.append(dialog);
 let draft=null,type='',press=null,ignoreClickUntil=0,held=false,lastDate=localDate(),uploads=0;
 const menu=document.createElement('dialog');menu.className='glass home-context-menu';menu.setAttribute('aria-label','小组件菜单');document.body.append(menu);
 let menuType='',suppressMenuClick=false;
 function closeMenu(){if(menu.open)menu.close();}
 function showMenu(widget){
  if(ui.editing)return;menuType=widget.dataset.homeWidget;const r=widget.getBoundingClientRect();
  menu.innerHTML=`<div role="menu" aria-label="小组件操作"><button role="menuitem" data-widget-menu="content">${icon('edit')}编辑内容</button><button role="menuitem" data-widget-menu="layout">${icon('layout')}编辑主页</button><button role="menuitem" data-widget-menu="remove">${icon('trash')}移除</button></div>`;
  menu.style.left='0px';menu.style.top='0px';menu.showModal();
  const v=window.visualViewport,position=widgetMenuPosition(r,{width:menu.offsetWidth,height:menu.offsetHeight},{left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||innerWidth,height:v?.height||innerHeight});
  menu.style.left=`${position.x}px`;menu.style.top=`${position.y}px`;
  menu.querySelector('button').focus({preventScroll:true});
 }
 function remove(kind){if(commit(s=>{if(kind==='anniversary')s.home.anniversaryVisible=false;else s.home.widgets.find(w=>w.type===kind).enabled=false;})){refresh();notify('已从主页移除，内容保留，可重新添加。');}}
 menu.addEventListener('pointerdown',()=>{suppressMenuClick=false;});
 document.addEventListener('pointerup',()=>{if(held){held=false;suppressMenuClick=true;}},true);
 menu.addEventListener('click',e=>{if(suppressMenuClick){suppressMenuClick=false;e.preventDefault();return;}const button=e.target.closest('[data-widget-menu]');if(!button){if(e.target===menu)closeMenu();return;}const kind=menuType;closeMenu();if(button.dataset.widgetMenu==='content')open(kind);else if(button.dataset.widgetMenu==='layout')begin();else remove(kind);});
 menu.addEventListener('close',()=>!dialog.open&&app.querySelector(`[data-home-widget="${menuType}"]`)?.focus({preventScroll:true}));
 menu.addEventListener('keydown',e=>{const items=[...menu.querySelectorAll('button')],i=items.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();}});
 window.addEventListener('resize',closeMenu);window.visualViewport?.addEventListener('resize',closeMenu);
 const motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
 function refresh(){ui.page=Math.max(0,Math.min(ui.page,getState().home.pages.length-1));const y=app.querySelector('.home-page')?.scrollTop||0;render();const page=app.querySelector('.home-page');if(page)page.scrollTop=y;}
 function report(message){const el=dialog.querySelector('.home-editor-error');if(el){el.hidden=false;el.textContent=message;}else notify(message);}
 function commit(change){const before=structuredClone(getState());change(getState());if(!persist()){setState(before);if(dialog.open)report('保存失败，本机存储空间可能不足。当前修改尚未保存。');return false;}return true;}
 function begin(){closeMenu();if(ui.editing)return;ui.editing=true;refresh();if(motion())app.querySelectorAll('.home-widget').forEach(el=>el.animate([{transform:'rotate(-.5deg)'},{transform:'rotate(.5deg)'},{transform:'rotate(0)'}],{duration:260,iterations:2}));}
 function header(title){return `<div class="home-editor-heading"><h2>${title}</h2><button type="button" data-home-close aria-label="关闭编辑">${icon('close')}</button></div><p class="home-editor-error hint" role="alert" hidden></p>`;}
 function open(kind){
  type=kind;uploads=0;draft=structuredClone(getState());const h=draft.home;
  let content='';
  if(kind==='add'){content=`${header('添加小组件')}<div class="home-widget-picker">${[{type:'anniversary',enabled:h.anniversaryVisible!==false},...h.widgets].map(w=>`<button data-home-add="${w.type}" ${w.enabled?'disabled':''}><span>${widgetLabels[w.type]||'纪念日'}</span><small>${w.enabled?'已在主页':'添加 +'}</small></button>`).join('')}</div>`;}
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
  if(action==='hide'){remove(kind);return;}
  if(action==='page'){switchPage(Number(target.dataset.page));return;}
  if(action==='add-page'){if(getState().home.pages.length>=12)return;if(commit(s=>s.home.pages.push([]))){ui.page=getState().home.pages.length-1;refresh();}return;}

 }
 app.addEventListener('click',e=>{if(Date.now()<ignoreClickUntil&&e.target.closest('.home-content')){e.preventDefault();e.stopImmediatePropagation();return;}const target=e.target.closest('[data-home-action]');if(target){e.preventDefault();e.stopImmediatePropagation();act(target);}},true);
 function cancel(){if(press)clearTimeout(press.timer);press=null;}
 let gesture=null,drag=null,edgeTimer=null,edgePage=null,consumeTouchEnd=false;
 app.addEventListener('touchmove',e=>{const t=e.touches[0];if(!gesture||!t)return;const dx=Math.abs(t.clientX-gesture.x),dy=Math.abs(t.clientY-gesture.y);if((ui.editing&&gesture.type||dx>8&&dx>dy*1.2)&&e.cancelable)e.preventDefault();},{passive:false});
 app.addEventListener('touchend',e=>{if(consumeTouchEnd){if(e.cancelable)e.preventDefault();consumeTouchEnd=false;}},{passive:false});
 function switchPage(next){const pages=ui.dragPages||getState().home.pages;if(next<0||next>=pages.length||next===ui.page)return;const direction=next>ui.page?1:-1;closeMenu();ui.page=next;refresh();app.querySelector('.home-page').scrollTop=0;const page=app.querySelector('.home-desktop-page');if(motion())page?.animate([{opacity:.5,transform:`translateX(${direction*28}px)`},{opacity:1,transform:'none'}],{duration:180,easing:'ease-out'});}
 function clearEdge(){clearTimeout(edgeTimer);edgeTimer=null;edgePage=null;}
 function finishDrag(save){if(!drag)return;clearEdge();drag.ghost.remove();const pages=ui.dragPages;drag=null;ui.dragPages=null;if(save)commit(s=>{s.home.pages=pages;s.home.widgets.sort((a,b)=>pages.flat().indexOf(a.type)-pages.flat().indexOf(b.type));});refresh();ignoreClickUntil=Date.now()+200;}
 function startDrag(e){
  const widget=app.querySelector(`[data-home-widget="${gesture.type}"]`),r=widget.getBoundingClientRect(),ghost=widget.cloneNode(true);
  ghost.className='home-widget home-drag-ghost';ghost.removeAttribute('tabindex');ghost.setAttribute('aria-hidden','true');ghost.querySelectorAll('button,.widget-drag-surface').forEach(el=>el.remove());ghost.style.width=`${r.width}px`;ghost.style.height=`${r.height}px`;document.body.append(ghost);
  ui.dragPages=structuredClone(getState().home.pages);drag={type:gesture.type,ghost,dx:gesture.x-r.left,dy:gesture.y-r.top};app.setPointerCapture(e.pointerId);widget.classList.add('home-drag-placeholder');updateDrag(e);
 }
 function updateDrag(e){
  drag.ghost.style.left=`${e.clientX-drag.dx}px`;drag.ghost.style.top=`${e.clientY-drag.dy}px`;
  const bounds=app.querySelector('.home-desktop').getBoundingClientRect(),pages=ui.dragPages;
  const dot=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-home-action="page"]');
  const next=dot?Number(dot.dataset.page):e.clientX<bounds.left+24?ui.page-1:e.clientX>bounds.right-24?ui.page+1:null;
  if(next!==null&&next>=0&&next<pages.length&&next!==ui.page){if(edgePage!==next){clearEdge();edgePage=next;edgeTimer=setTimeout(()=>{edgeTimer=null;switchPage(next);moveHomeWidget(pages,drag.type,next,pages[next].length);refresh();app.querySelector(`[data-home-widget="${drag.type}"]`)?.classList.add('home-drag-placeholder');},650);}}else clearEdge();
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-home-widget]');
  if(target&&target.dataset.homeWidget!==drag.type){const type=target.dataset.homeWidget,r=target.getBoundingClientRect(),index=pages[ui.page].filter(t=>t!==drag.type).indexOf(type),after=pages[ui.page].indexOf(drag.type)<pages[ui.page].indexOf(type)||e.clientY>r.top+r.height*.65;
   moveHomeWidget(pages,drag.type,ui.page,index+(after?1:0));refresh();app.querySelector(`[data-home-widget="${drag.type}"]`)?.classList.add('home-drag-placeholder');
  }
  const scroll=app.querySelector('.home-page'),r=scroll.getBoundingClientRect();if(e.clientY>r.bottom-40)scroll.scrollTop+=12;else if(e.clientY<r.top+60)scroll.scrollTop-=12;
 }
 app.addEventListener('pointerdown',e=>{
  ignoreClickUntil=0;consumeTouchEnd=false;
  if(e.button!==0||!e.target.closest('.home-desktop')||e.target.closest('.widget-remove,.home-edit-toolbar,.home-page-controls'))return;
  cancel();held=false;const widget=e.target.closest('[data-home-widget]');gesture={x:e.clientX,y:e.clientY,type:widget?.dataset.homeWidget,id:e.pointerId};
  if(!ui.editing&&widget)press={x:e.clientX,y:e.clientY,timer:setTimeout(()=>{press=null;gesture=null;held=true;showMenu(widget);},550)};
 });
 app.addEventListener('pointermove',e=>{if(!gesture||e.pointerId!==gesture.id)return;const distance=Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y);if(distance>10)cancel();if(ui.editing&&gesture.type){if(!drag&&distance>8)startDrag(e);else if(drag)updateDrag(e);}});
 app.addEventListener('pointerup',e=>{cancel();if(drag){consumeTouchEnd=e.pointerType==='touch';finishDrag(true);}else if(gesture&&e.pointerId===gesture.id){const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4){consumeTouchEnd=e.pointerType==='touch';const next=ui.page+(dx<0?1:-1);ignoreClickUntil=Date.now()+200;setTimeout(()=>{if(app.querySelector('.home-desktop'))switchPage(next);},0);}}gesture=null;if(held){ignoreClickUntil=Date.now()+200;held=false;}});
 app.addEventListener('pointercancel',()=>{cancel();finishDrag(false);gesture=null;});
 app.addEventListener('scroll',cancel,true);
 app.addEventListener('contextmenu',e=>{const widget=e.target.closest('[data-home-widget]');if(!widget)return;e.preventDefault();cancel();showMenu(widget);});
 app.addEventListener('keydown',e=>{
  if(e.key==='Escape'){finishDrag(false);if(ui.editing){ui.editing=false;refresh();}}
  const widget=e.target.closest('[data-home-widget]');if(!widget||e.target!==widget)return;
  if(ui.editing&&e.altKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
   e.preventDefault();const kind=widget.dataset.homeWidget,pages=structuredClone(getState().home.pages),index=pages[ui.page].indexOf(kind),next=e.key==='ArrowLeft'?ui.page-1:e.key==='ArrowRight'?ui.page+1:ui.page;
   if(next<0||next>=pages.length)return;moveHomeWidget(pages,kind,next,next===ui.page?index+(e.key==='ArrowUp'?-1:1):pages[next].length);
   if(commit(s=>{s.home.pages=pages;s.home.widgets.sort((a,b)=>pages.flat().indexOf(a.type)-pages.flat().indexOf(b.type));})){ui.page=next;refresh();app.querySelector(`[data-home-widget="${kind}"]`)?.focus({preventScroll:true});}return;
  }
  if(!ui.editing&&['Enter',' ','ContextMenu'].includes(e.key)||!ui.editing&&e.shiftKey&&e.key==='F10'){e.preventDefault();showMenu(widget);}
 });
 dialog.addEventListener('click',e=>{
  if(e.target.closest('[data-home-close]')){dialog.close();return;}
  if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();return;}
  const add=e.target.closest('[data-home-add]');if(add){if(commit(s=>{if(add.dataset.homeAdd==='anniversary')s.home.anniversaryVisible=true;else s.home.widgets.find(w=>w.type===add.dataset.homeAdd).enabled=true;moveHomeWidget(s.home.pages,add.dataset.homeAdd,ui.page,s.home.pages[ui.page].length);})){refresh();open('add');}return;}
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
 return {ui,exit(){closeMenu();finishDrag(false);ui.editing=false;ui.page=Math.max(0,Math.min(ui.page,getState().home.pages.length-1));cancel();gesture=null;},clock};
}
