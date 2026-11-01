// Adapt existing scene/message data to the independent invitation component.
export function sceneInvitation(state,scene,message){
 const source=message||state.sessions.flatMap(s=>s.messages).find(m=>m.storyLink?.kind==='invite'&&m.storyLink.sceneId===scene.id);
 const assistant=source?.role==='assistant';
 const ai={name:state.persona.name,avatar:state.appearance.aiAvatar};
 const user={name:state.home.userName,avatar:state.appearance.userAvatar};
 return {id:scene.id,sourceId:source?.id||'',title:scene.title,message:scene.premise,when:scene.timeLabel,place:scene.place,stage:scene.status,sender:assistant?ai:user,recipient:assistant?user:ai};
}
