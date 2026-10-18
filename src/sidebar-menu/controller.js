import {sidebarItem,manageSidebarItem} from './model.js';
import {sidebarItemMenu} from './view.js';
import {animateDrawerClose,bindDrawerDismiss} from '../drawer.js';

const selector='.app-sidebar [data-sidebar-kind][data-sidebar-id]';
export function createSidebarItemMenu({getState,setState,persist,onChange,notify}){
 const dialog=document.createElement('dialog');dialog.className='glass app-sheet bottom-sheet sidebar-item-menu';dialog.setAttribute('aria-label','记录操作');document.body.append(dialog);
 let target=null,press=null,suppressed=null,closing=false,revision=0;
 function cancelPress(){if(press)clearTimeout(press.timer);press=null;}
 function row(){return target?document.querySelector(`.app-sidebar[open] [data-sidebar-kind="${target.kind}"][data-sidebar-id="${CSS.escape(target.id)}"]`):null;}
 function restoreFocus(){(row()||document.querySelector('.app-sidebar[open] .nav-sidebar'))?.focus({preventScroll:true});}
 async function close(){if(!dialog.open||closing)return;closing=true;const current=revision;await animateDrawerClose(dialog);if(revision!==current)return;dialog.close();closing=false;}
 bindDrawerDismiss(dialog,{panel:()=>dialog.open&&!closing?dialog:null,close,backdrop:true});
 dialog.addEventListener('cancel',event=>{event.preventDefault();void close();});
 dialog.addEventListener('close',()=>{if(dialog.open)return;closing=false;dialog.style.transform='';dialog.getAnimations().forEach(a=>a.cancel());restoreFocus();});
 function paint(screen='menu'){
  const item=sidebarItem(getState(),target.kind,target.id);revision++;closing=false;dialog.style.transform='';dialog.getAnimations().forEach(a=>a.cancel());dialog.innerHTML=sidebarItemMenu(target.kind,item,screen);
  if(!dialog.open)dialog.showModal();
  const input=dialog.querySelector('[name=title]');if(input){input.focus({preventScroll:true});input.select();}else dialog.querySelector('[data-item-menu-action=pin],.drawer-handle')?.focus({preventScroll:true});
 }
 function open(element){
  const next={kind:element.dataset.sidebarKind,id:element.dataset.sidebarId};
  if(dialog.open&&target?.kind===next.kind&&target?.id===next.id)return;
  target=next;try{paint();}catch(error){notify(error.message);}
 }
 function error(message){const alert=dialog.querySelector('[role=alert]');if(alert){alert.hidden=false;alert.textContent=message;}}
 function apply(operation,value){
  if(!target||closing)return;const before=structuredClone(getState()),previousActive=before.active;let item;
  try{item=manageSidebarItem(getState(),target.kind,target.id,operation,value);if(!persist())throw new Error('尚未保存，请释放本机空间后再试。');}
  catch(reason){setState(before);error(reason.message);return;}
  onChange({...target,operation,previousActive,previousScene:before.moom.active});void close();notify(operation==='rename'?'名字已保存。':operation==='delete'?'记录已删除。':item.pinned?'已置顶。':'已取消置顶。');
 }
 dialog.addEventListener('click',event=>{
  const action=event.target.closest('[data-item-menu-action]')?.dataset.itemMenuAction;if(!action||closing)return;
  if(action==='close'){void close();return;}
  if(action==='pin'){apply('pin');return;}
  if(action==='confirm-delete'){apply('delete');return;}
  if(['rename','delete','back'].includes(action))try{paint(action==='back'?'menu':action);}catch(reason){error(reason.message);}
 });
 dialog.addEventListener('submit',event=>{if(event.target.id!=='sidebar-item-rename')return;event.preventDefault();apply('rename',new FormData(event.target).get('title'));});
 document.addEventListener('pointerdown',event=>{
  cancelPress();suppressed=null;const element=event.target.closest(selector);if(!element||event.button!==0||event.isPrimary===false)return;
  const active={element,id:event.pointerId,x:event.clientX,y:event.clientY,timer:null};
  active.timer=setTimeout(()=>{if(press!==active||!element.isConnected)return;press=null;suppressed={kind:element.dataset.sidebarKind,id:element.dataset.sidebarId};open(element);},520);press=active;
 },true);
 document.addEventListener('pointermove',event=>{if(press&&event.pointerId===press.id&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>8)cancelPress();},true);
 document.addEventListener('pointerup',cancelPress,true);document.addEventListener('pointercancel',cancelPress,true);
 document.addEventListener('scroll',cancelPress,true);window.addEventListener('blur',cancelPress);
 document.addEventListener('click',event=>{
  const element=event.target.closest(selector);if(!element||!suppressed||event.detail===0)return;
  if(suppressed.kind===element.dataset.sidebarKind&&suppressed.id===element.dataset.sidebarId){suppressed=null;event.preventDefault();event.stopImmediatePropagation();}
 },true);
 document.addEventListener('contextmenu',event=>{const element=event.target.closest(selector);if(!element)return;event.preventDefault();cancelPress();suppressed={kind:element.dataset.sidebarKind,id:element.dataset.sidebarId};open(element);},true);
 document.addEventListener('keydown',event=>{if(event.key!=='ContextMenu'&&!(event.key==='F10'&&event.shiftKey))return;const element=event.target.closest(selector);if(!element)return;event.preventDefault();cancelPress();open(element);},true);
 return {reset(){cancelPress();suppressed=null;target=null;revision++;closing=false;dialog.close();}};
}
