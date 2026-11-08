import {createInvitation} from '../../components/invitation/controller.js';
import {sceneInvitation} from './invitation.js';
import {legacyReasoning} from './view.js';
import {findScene,acceptScene,deferScene} from './model.js';
import {bindDrawerDismiss,animateDrawerClose} from '../../drawer.js';

export function createLegacyStoryReader({app,sidebar,getState,setState,persist,render,notify,navigate,getPage}){
 const ui={sceneId:''};
 let origin='sessions',opener,closing=false;
 const sheet=document.createElement('dialog');
 sheet.className='glass app-sheet bottom-sheet moom-sheet';
 sheet.setAttribute('aria-label','思考详情');document.body.append(sheet);

 function saveInvitation(change,id){
  const previous=structuredClone(getState());
  try{
   change(getState(),id);
   if(persist())return true;
   setState(previous);return false;
  }catch(error){setState(previous);throw error;}
 }
 function openStory(id){
  findScene(getState(),id);
  origin=getPage()==='chat'?'chat':'sessions';
  ui.sceneId=id;invitations.reset();navigate('legacy-story');
 }
 const invitations=createInvitation({root:app,notify,
  getInvitation(id,sourceId){
   const state=getState(),scene=findScene(state,id);
   const source=sourceId?state.sessions.flatMap(session=>session.messages).find(message=>message.id===sourceId&&message.storyLink?.kind==='invite'&&message.storyLink.sceneId===id):null;
   if(sourceId&&!source)throw new Error('这份邀请已不在聊天记录中。');
   return sceneInvitation(state,scene,source);
  },
  onWait(data){if(!saveInvitation(deferScene,data.id))return false;render();return true;},
  onAccept(data){if(!saveInvitation(acceptScene,data.id))return false;openStory(data.id);return true;},
  onRead(data){openStory(data.id);return true;},
 });
 async function closeSheet(){
  if(!sheet.open||closing)return;
  closing=true;await animateDrawerClose(sheet);
  if(closing&&sheet.open)sheet.close();
  closing=false;
 }
 bindDrawerDismiss(sheet,{panel:()=>sheet.open&&!closing?sheet:null,close:closeSheet,backdrop:true});
 sheet.addEventListener('cancel',event=>{event.preventDefault();void closeSheet();});
 sheet.addEventListener('click',event=>{if(event.target.closest('[data-story-action=close]'))void closeSheet();});
 sheet.addEventListener('close',()=>{
  if(sheet.open)return;
  sheet.getAnimations().forEach(animation=>animation.cancel());sheet.style.transform='';
  opener?.focus({preventScroll:true});
 });
 function handle(event){
  const button=event.target.closest('[data-story-action]');if(!button)return;
  try{
   const action=button.dataset.storyAction;
   if(action==='read')openStory(button.dataset.scene);
   if(action==='back')navigate(origin);
   if(action==='reasoning'){
    opener=button;sheet.innerHTML=legacyReasoning(findScene(getState(),ui.sceneId),button.dataset.entry);
    sheet.showModal();sheet.querySelector('.drawer-handle')?.focus({preventScroll:true});
   }
  }catch(error){notify(error.message);}
 }
 app.addEventListener('click',handle);
 sidebar.addEventListener('click',handle);
 return {ui,reset(){ui.sceneId='';closing=false;sheet.close();invitations.reset();}};
}
