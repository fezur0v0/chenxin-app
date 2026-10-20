import {moomSheet,scenesSidebar} from './view.js';
import {createScene,findScene,acceptScene,deferScene,addSceneEntry,endScene,saveSceneStatus,SCENE_TONES} from './model.js';
import {bindDrawerDismiss,animateDrawerClose} from '../../drawer.js';

export function createMoomApp({app,getState,setState,persist,render,notify,navigate,preview=false}){
 const ui={drafts:Object.create(null),bookmarks:false,preview,arrival:false};
 const sheet=document.createElement('dialog');sheet.className='glass app-sheet bottom-sheet moom-sheet';sheet.setAttribute('aria-label','moom 场景操作');document.body.append(sheet);
 const sidebar=document.createElement('dialog');sidebar.id='moom-sidebar';sidebar.className='moom-sidebar app-sidebar glass';sidebar.setAttribute('aria-label','Moom 侧边栏');document.body.append(sidebar);
 let returnFocus=null,closing=false,revision=0;
 function commit(operation){const before=structuredClone(getState());try{const result=operation(getState());if(!persist()){setState(before);return null;}return result||true;}catch(error){setState(before);throw error;}}
 function closeAll(){revision++;closing=false;sheet.close();sheet.style.transform='';sheet.getAnimations().forEach(a=>a.cancel());sidebar.close();}
 async function closeSheet(){if(!sheet.open||closing)return;closing=true;const current=revision;await animateDrawerClose(sheet);if(current!==revision)return;sheet.close();closing=false;}
 bindDrawerDismiss(sheet,{panel:()=>sheet.open&&!closing?sheet:null,close:closeSheet,backdrop:true});
 sheet.addEventListener('cancel',e=>{e.preventDefault();void closeSheet();});
 sheet.addEventListener('close',()=>{if(sheet.open)return;sheet.style.transform='';sheet.getAnimations().forEach(a=>a.cancel());if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});else app.querySelector('[data-moom-action=options],[data-moom-action=new]')?.focus({preventScroll:true});});
 sidebar.addEventListener('click',e=>{if(e.target!==sidebar)return;const r=sidebar.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)sidebar.close();});
 sidebar.addEventListener('close',()=>{const toggle=app.querySelector('[data-moom-action=scenes]');toggle?.setAttribute('aria-expanded','false');toggle?.focus({preventScroll:true});});
 function show(kind,id,options={}){const scene=id?findScene(getState(),id):null;returnFocus=document.activeElement;sidebar.close();revision++;closing=false;sheet.style.transform='';sheet.getAnimations().forEach(a=>a.cancel());sheet.innerHTML=moomSheet(kind,getState(),scene,{...options,preview,bookmarks:ui.bookmarks});if(!sheet.open)sheet.showModal();sheet.querySelector('input:not([type=hidden]),textarea,.drawer-handle')?.focus({preventScroll:true});}
 function repaint({bottom=false}={}){const reading=app.querySelector('#moom-reading'),scroll=reading?.scrollTop||0;render();const next=app.querySelector('#moom-reading');if(next)next.scrollTop=bottom?next.scrollHeight:scroll;}
 function refreshSidebar(){if(!sidebar.open)return;const scroll=sidebar.querySelector('.sidebar-conversations')?.scrollTop||0;sidebar.innerHTML=scenesSidebar(getState());sidebar.querySelector('.sidebar-conversations').scrollTop=scroll;}
 function goScene(id,{arrive=false}={}){closeAll();ui.bookmarks=false;ui.arrival=arrive;if(getState().moom.active!==id&&!commit(s=>{findScene(s,id);s.moom.active=id;}))return;navigate('app-moom');}
 function chat(id,{pause=false}={}){
  const scene=findScene(getState(),id),available=getState().sessions.some(s=>s.id===scene.sessionId);
  if((available||pause)&&!commit(s=>{if(available)s.active=scene.sessionId;if(pause&&scene.status==='active'){scene.status='paused';scene.updated=Date.now();}}))return;
  closeAll();if(!available){repaint();return notify('关联的聊天已被删除，剧情仍保存在 moom。');}navigate('chat');
 }
 function handle(event){
  const button=event.target.closest('[data-moom-action]');if(!button)return;const action=button.dataset.moomAction,id=button.dataset.scene||getState().moom.active;
  try{
   if(action==='close-sheet'){void closeSheet();return;}
   if(action==='close-sidebar'){sidebar.close();return;}
   if(action==='switch-chat'){
    const scene=getState().moom.scenes.find(s=>s.id===id);closeAll();
    if(scene&&getState().sessions.some(s=>s.id===scene.sessionId))chat(id);else navigate('chat');return;
   }
   if(action==='memory'||action==='settings'){closeAll();navigate(action);return;}
   if(action==='home'){closeAll();navigate('home');return;}
   if(action==='scenes'){sidebar.innerHTML=scenesSidebar(getState());sidebar.showModal();app.querySelector('[data-moom-action=scenes]')?.setAttribute('aria-expanded','true');return;}
   if(action==='new'){show('new',null,{invite:button.dataset.invite==='true'});return;}
   if(action==='reasoning'){show('reasoning',id,{entryId:button.dataset.entry});return;}
   if(action==='invitation'){show('invitation',id);return;}
   if(['details','end','options','tools','status'].includes(action)){show(action,id);return;}
   if(action==='regenerate'||action==='continue'){notify(action==='regenerate'?'模型还没有连接，暂时不能重说。':'模型还没有连接，暂时不能继续剧情。');return;}
   if(action==='read'){goScene(id);return;}
   if(action==='accept'){const scene=findScene(getState(),id),arrive=['invited','deferred'].includes(scene.status);if(commit(s=>acceptScene(s,id)))goScene(id,{arrive});return;}
   if(action==='defer'){if(commit(s=>deferScene(s,id)))repaint();return;}
   if(action==='enter'){ui.arrival=false;repaint();app.querySelector('[name=sceneMessage]')?.focus({preventScroll:true});return;}
   if(action==='pause'||action==='chat'){chat(id,{pause:action==='pause'});return;}
   if(action==='filter-bookmarks'){ui.bookmarks=!ui.bookmarks;closeAll();repaint();app.querySelector('[data-moom-action=filter-bookmarks],[data-moom-action=options]')?.focus({preventScroll:true});return;}
   if(action==='bookmark'){if(commit(s=>{const entry=findScene(s,id).entries.find(e=>e.id===button.dataset.entry);if(!entry)throw new Error('找不到这段内容。');entry.bookmarked=!entry.bookmarked;})){repaint();app.querySelector(`[data-entry="${CSS.escape(button.dataset.entry)}"] .moom-bookmark`)?.focus({preventScroll:true});}return;}
  }catch(error){notify(error.message);}
 }
 [app,sheet,sidebar].forEach(root=>root.addEventListener('click',handle));
 sheet.addEventListener('submit',event=>{
  if(!['moom-scene-form','moom-end-form','moom-status-form'].includes(event.target.id))return;event.preventDefault();const form=event.target,data=Object.fromEntries(new FormData(form));
  try{
   if(form.id==='moom-status-form'){
    if(!commit(s=>saveSceneStatus(s,form.dataset.scene,data)))throw new Error('尚未保存，请释放本机空间后再试。');closeAll();repaint();return;
   }else if(form.id==='moom-scene-form'){
    if(data.sceneId){if(!commit(s=>{const scene=findScene(s,data.sceneId);if(!data.title.trim())throw new Error('请填写场景名称。');Object.assign(scene,{title:data.title.trim().slice(0,80),place:data.place.trim().slice(0,100),timeLabel:data.timeLabel.trim().slice(0,80),premise:data.premise.trim().slice(0,2000),tone:SCENE_TONES.some(([id])=>id===data.tone)?data.tone:'sea',updated:Date.now()});}))throw new Error('尚未保存，请释放本机空间后再试。');closeAll();repaint();return;}
    const scene=commit(s=>{const value=createScene(s,data,{invite:data.invite==='on'});if(data.invite==='on')s.active=value.sessionId;return value;});if(!scene)throw new Error('尚未保存，请释放本机空间后再试。');closeAll();ui.bookmarks=false;ui.arrival=scene.status==='active';
    if(scene.status==='invited'){navigate('chat');notify('邀请函已保存在关联聊天中。');}else navigate('app-moom');
   }else{
    const id=form.dataset.scene;if(!commit(s=>endScene(s,id,data.summary)))throw new Error('尚未保存，请释放本机空间后再试。');closeAll();ui.arrival=false;
    if(getState().sessions.some(s=>s.id===findScene(getState(),id).sessionId)){chat(id);notify('这一幕已结束，小记已留在聊天里。');}
    else{repaint();notify('这一幕已结束，小记保存在 moom 中。');}
   }
  }catch(error){const alert=form.querySelector('[role=alert]');alert.textContent=error.message;alert.hidden=false;}
 });
 app.addEventListener('input',event=>{if(event.target.name==='sceneMessage'){ui.drafts[getState().moom.active]=event.target.value;resize();}});
 app.addEventListener('submit',event=>{
  if(event.target.id!=='moom-compose')return;event.preventDefault();const id=getState().moom.active,value=ui.drafts[id]||'';
  if(!value.trim())return;
  try{if(!commit(s=>addSceneEntry(s,id,value,'say')))return;delete ui.drafts[id];ui.bookmarks=false;repaint({bottom:true});app.querySelector('[name=sceneMessage]')?.focus({preventScroll:true});notify('回应已保存在本机；模型尚未连接。');}catch(error){notify(error.message);}
 });
 app.addEventListener('keydown',event=>{if(event.target.name==='sceneMessage'&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&!event.repeat){event.preventDefault();event.target.form.requestSubmit();}});
 function resize(){const input=app.querySelector('[name=sceneMessage]');if(input){input.style.height='auto';input.style.height=`${Math.min(input.scrollHeight,144)}px`;}}
 return {ui,resize,refreshSidebar,forgetScene(id,wasActive=false){delete ui.drafts[id];if(wasActive){ui.bookmarks=false;ui.arrival=false;}},reset(){closeAll();ui.drafts=Object.create(null);ui.arrival=false;ui.bookmarks=false;}};
}
