import {createScene,acceptScene,addSceneEntry,endScene} from './model.js';
// Explicit, isolated design preview; neither localStorage nor audio/snapshot IDB is used.
export function createMoomPreview(){
 const values=new Map(),media=new Map();
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};
 async function files(id,file){if(file===null)media.delete(id);else if(file!==undefined)media.set(id,file);else return media.get(id);}
 function seed(state){
  state.sessions[0].title='moom 场景示例';state.backupSettings.dailyEnabled=false;
  const first=createScene(state,{title:'第一次见面',place:'街角花店',timeLabel:'午后',tone:'sage'});addSceneEntry(state,first.id,'你好呀。','say');endScene(state,first.id,'在花店门口见面，聊起了今天的天气。');first.created=first.updated=Date.now()-86400000*5;
  const second=createScene(state,{title:'雨天的咖啡馆',place:'窗边',timeLabel:'傍晚',tone:'dusk'});addSceneEntry(state,second.id,'我把伞放在门边，走到窗前。','act');endScene(state,second.id,'一起在咖啡馆躲雨，看着窗上的水珠慢慢落下。');second.created=second.updated=Date.now()-86400000;
  const scene=createScene(state,{title:'深夜 · 海边',place:'海边',timeLabel:'深夜',tone:'sea',premise:'想带你去海边走一走，就我们两个人。'},{invite:true,assistant:true});acceptScene(state,scene.id);
  scene.entries=[
   {kind:'narration',text:'夜里的海很安静。潮水一层一层地退下去，又一层一层地漫上来，像有人在远处轻轻呼吸。'},
   {kind:'narration',text:'尘走在你左边半步的位置，没有说话，只是把外套的一角往你这边拢了拢。'},
   {kind:'dialogue',text:'冷不冷？要是冷，我们就坐一会儿。'},
   {kind:'act',text:'我停下来，看着远处的灯塔。'},
   {kind:'narration',text:'风吹过衣角，带着一点海水的气息。他也停下来，陪你望着远处。'}
  ].map((e,i)=>({...e,id:crypto.randomUUID(),time:Date.now()-60000+i*1000,bookmarked:false}));
 }
 function decorate({app}){
  if(!app.querySelector('.chat-view'))return;
  app.querySelector('.peer-details small').textContent='moom 示例 · 不影响正式聊天';
 }
 return {storage,files,seed,decorate};
}
