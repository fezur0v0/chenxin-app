import {newSession} from '../store.js';
import {orderedScenes} from '../apps/moom/model.js';

export function sidebarItem(state,kind,id){
 if(!['scene','session'].includes(kind))throw new Error('不支持的记录类型。');
 const item=(kind==='scene'?state.moom.scenes:state.sessions).find(item=>item.id===id);
 if(!item)throw new Error('这条记录已不存在。');return item;
}
export function manageSidebarItem(state,kind,id,operation,value=''){
 const item=sidebarItem(state,kind,id);
 if(operation==='pin')item.pinned=!item.pinned;
 else if(operation==='rename'){
  const title=typeof value==='string'?value.trim().slice(0,80):'';
  if(!title)throw new Error('名字不能为空。');item.title=title;
 }else if(operation==='delete'){
  if(kind==='scene'){
   state.moom.scenes=state.moom.scenes.filter(scene=>scene.id!==id);
   if(state.moom.active===id)state.moom.active=state.moom.scenes.find(scene=>scene.status==='active')?.id||orderedScenes(state.moom)[0]?.id||'';
  }else{
   state.sessions=state.sessions.filter(session=>session.id!==id);
   if(!state.sessions.length)newSession(state);
   if(!state.sessions.some(session=>session.id===state.active))state.active=state.sessions[0].id;
  }
 }else throw new Error('不支持的记录操作。');
 return item;
}
