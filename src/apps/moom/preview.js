import {createScene} from './model.js';

// The invitation preview is isolated from saved conversations and files.
export function createInvitationPreview(){
 const values=new Map(),media=new Map();
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};
 async function files(id,file){if(file===null)media.delete(id);else if(file!==undefined)media.set(id,file);else return media.get(id);}
 function seed(state){
  state.persona.name='凛';state.backupSettings.dailyEnabled=false;
  const scene=createScene(state,{title:'今晚，去看海吧。',place:'海边',timeLabel:'20:30',premise:'想和你吹一会儿海风，\n就我们两个人。'},{invite:true,assistant:true});
  const session=state.sessions[0],invite=session.messages.find(message=>message.storyLink?.sceneId===scene.id),now=Date.now();
  session.title='邀请函示例';
  session.messages=[
   {id:crypto.randomUUID(),role:'assistant',text:'今晚有空吗？',time:now-120000,attachments:[]},
   {id:crypto.randomUUID(),role:'user',text:'怎么啦？',time:now-60000,attachments:[]},
   invite,
  ];
 }
 function decorate({app}){
  const label=app.querySelector('.peer-details small');if(label)label.textContent='邀请函示例 · 不影响正式聊天';
 }
 return {storage,files,seed,decorate};
}
