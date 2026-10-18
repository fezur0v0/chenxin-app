// Scenes and chat cards share IDs. No model output is fabricated here.
const text=(value,max=12000)=>typeof value==='string'?value.slice(0,max):'';
const date=(value,fallback)=>Number.isFinite(value)&&Math.abs(value)<8.64e15?value:fallback;
export const SCENE_TONES=[['sea','海蓝'],['mist','雾白'],['rose','淡粉'],['sage','鼠尾草'],['dusk','暮紫']];
const statuses=['invited','deferred','active','paused','ended'];
export const emptyMoom=()=>({active:'',scenes:[]});
export function normalizeStoryLink(value){return ['invite','record'].includes(value?.kind)&&typeof value.sceneId==='string'?{kind:value.kind,sceneId:text(value.sceneId,100)}:null;}
export function normalizeMoom(value){
 const seen=new Set(),now=Date.now();
 const scenes=(Array.isArray(value?.scenes)?value.scenes:[]).filter(s=>s&&typeof s.id==='string'&&s.id&&s.id.length<=100&&!seen.has(s.id)&&seen.add(s.id)).map(s=>{
  const entryIds=new Set(),created=date(s.created,now);
  return {id:text(s.id,100),title:text(s.title,80)||'未命名的一幕',place:text(s.place,100),timeLabel:text(s.timeLabel,80),premise:text(s.premise,2000),tone:SCENE_TONES.some(([id])=>id===s.tone)?s.tone:'sea',sessionId:text(s.sessionId,100),status:statuses.includes(s.status)?s.status:'paused',created,updated:date(s.updated,created),summary:text(s.summary,2000),entries:(Array.isArray(s.entries)?s.entries:[]).filter(e=>e&&typeof e.id==='string'&&e.id&&e.id.length<=100&&!entryIds.has(e.id)&&entryIds.add(e.id)&&typeof e.text==='string'&&['narration','dialogue','say','act'].includes(e.kind)).map(e=>({id:text(e.id,100),kind:e.kind,text:text(e.text),time:date(e.time,created),bookmarked:e.bookmarked===true}))};
 });
 return {active:scenes.some(s=>s.id===value?.active)?value.active:'',scenes};
}
export function createScene(state,data,{invite=false,assistant=false}={}){
 const title=text(data.title,80).trim();if(!title)throw new Error('给这一幕起个名字吧。');
 const session=state.sessions.find(s=>s.id===(data.sessionId||state.active));if(!session)throw new Error('找不到这段聊天，请重新选择。');
 const now=Date.now(),scene={id:crypto.randomUUID(),title,place:text(data.place,100).trim(),timeLabel:text(data.timeLabel,80).trim(),premise:text(data.premise,2000).trim(),tone:SCENE_TONES.some(([id])=>id===data.tone)?data.tone:'sea',sessionId:session.id,status:invite?'invited':'active',created:now,updated:now,summary:'',entries:[]};
 state.moom.scenes.unshift(scene);state.moom.active=scene.id;
 if(invite)session.messages.push({id:crypto.randomUUID(),role:assistant?'assistant':'user',text:'',time:now,status:'local',attachments:[],storyLink:{kind:'invite',sceneId:scene.id}});
 if(!invite)acceptScene(state,scene.id);
 return scene;
}
export function findScene(state,id){const scene=state.moom.scenes.find(s=>s.id===id);if(!scene)throw new Error('这一幕已不在本机记录中。');return scene;}
export function acceptScene(state,id){
 const scene=findScene(state,id);if(scene.status==='ended')throw new Error('这一幕已经结束，可以重读或新建另一幕。');
 // A single shared timeline has only one ongoing scene.
 for(const other of state.moom.scenes)if(other.id!==id&&other.status==='active'){other.status='paused';other.updated=Date.now();}
 scene.status='active';scene.updated=Date.now();state.moom.active=id;return scene;
}
export function deferScene(state,id){const scene=findScene(state,id);if(!['invited','deferred'].includes(scene.status))throw new Error('这份邀请已经处理过了。');scene.status='deferred';scene.updated=Date.now();return scene;}
export function addSceneEntry(state,id,value,kind){
 const scene=findScene(state,id),content=text(value).trim();if(scene.status!=='active')throw new Error('先继续这一幕，再写下你的回应。');if(!content)throw new Error('写下一句话或一个动作吧。');
 const entry={id:crypto.randomUUID(),kind:kind==='act'?'act':'say',text:content,time:Date.now(),bookmarked:false};scene.entries.push(entry);scene.updated=entry.time;return entry;
}
export function endScene(state,id,summary){
 const scene=findScene(state,id);if(scene.status==='ended')return scene;
 const value=text(summary,2000).trim();if(!value)throw new Error('留下一句小记，方便下次接着聊。');
 scene.status='ended';scene.summary=value;scene.updated=Date.now();
 const session=state.sessions.find(s=>s.id===scene.sessionId);
 if(session&&!session.messages.some(m=>m.storyLink?.kind==='record'&&m.storyLink.sceneId===id))session.messages.push({id:crypto.randomUUID(),role:'user',text:'',time:scene.updated,status:'local',attachments:[],storyLink:{kind:'record',sceneId:id}});
 return scene;
}
