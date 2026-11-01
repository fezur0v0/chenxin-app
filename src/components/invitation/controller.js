import {invitationLetter} from './view.js';
import {bindDrawerDismiss,animateDrawerClose,drawerHeader} from '../../drawer.js';

// The host supplies data and decisions; this component owns only dialog interaction.
export function createInvitation({root,getInvitation,onWait,onAccept,onRead,notify}){
 const dialog=document.createElement('dialog');
 dialog.className='invitation-dialog';dialog.dataset.invitationSkin='stationery';
 dialog.dataset.invitationPart='dialog';dialog.setAttribute('aria-label','邀请函');
 document.body.append(dialog);
 let current=null,opener=null,restore=true,revision=0,closing=false,busy=false;
 function report(message){const error=dialog.querySelector('[data-invitation-part="error"]');if(error){error.textContent=message;error.hidden=false;error.scrollIntoView({block:'nearest'});}notify(message);}
 function reset(){revision++;restore=false;closing=false;current=null;dialog.close();dialog.style.transform='';dialog.getAnimations().forEach(a=>a.cancel());}
 async function dismiss(){
  if(!dialog.open||closing)return;
  closing=true;const version=revision;await animateDrawerClose(dialog);
  if(version!==revision)return;dialog.close();closing=false;current=null;
 }
 function open(id,sourceId=''){
  const data=getInvitation(id,sourceId);if(!data)throw new Error('这份邀请已不在本机记录中。');
  revision++;closing=false;restore=true;current={id,sourceId};opener=document.activeElement;
  dialog.style.transform='';dialog.getAnimations().forEach(a=>a.cancel());
  dialog.innerHTML=drawerHeader({title:'邀请函',heading:'<span class="sr-only">一份见面邀请</span>',action:'close',actionAttribute:'data-invitation-action'})+invitationLetter(data);
  dialog.setAttribute('aria-label',`来自${data.sender.name}的邀请函：${data.title}`);
  if(!dialog.open)dialog.showModal();dialog.querySelector('.drawer-handle').focus({preventScroll:true});
 }
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-invitation-action="open"]');if(!button)return;
  try{open(button.dataset.invitationId,button.dataset.invitationSource);}catch(error){notify(error.message);}
 });
 dialog.addEventListener('click',event=>{
  const action=event.target.closest('[data-invitation-action]')?.dataset.invitationAction;
  if(!action||busy||closing)return;
  if(action==='close'){void dismiss();return;}
  if(!current)return;
  busy=true;
  try{
   const data=getInvitation(current.id,current.sourceId);if(!data)throw new Error('这份邀请已不在本机记录中。');
   const pending=['invited','deferred'].includes(data.stage);
   const ok=action==='wait'?(pending?onWait(data):true):action==='accept'?(pending?onAccept(data):onRead(data)):false;
   if(ok===false){report('尚未保存，请检查本机存储空间后重试。');return;}
   if(dialog.open)void dismiss();
  }catch(error){report(error.message);}finally{busy=false;}
 });
 dialog.addEventListener('cancel',event=>{event.preventDefault();void dismiss();});
 bindDrawerDismiss(dialog,{panel:()=>dialog.open&&!closing?dialog:null,close:dismiss,backdrop:true});
 dialog.addEventListener('close',()=>{
  if(dialog.open)return;dialog.style.transform='';dialog.getAnimations().forEach(a=>a.cancel());
  if(!restore)return;
  if(opener?.isConnected){opener.focus({preventScroll:true});return;}
  const match=[...root.querySelectorAll('[data-invitation-action="open"]')].find(e=>e.dataset.invitationId===opener?.dataset.invitationId&&e.dataset.invitationSource===opener?.dataset.invitationSource);
  match?.focus({preventScroll:true});
 });
 return {open,reset};
}
