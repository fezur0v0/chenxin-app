const liveTag=/<(\/?live)\s*>/gi;
const rolePrefix=/^(char|user)\s*[:：]\s*/i;
const centerPrefix=/^\[(时间|系统|拍一拍|撤回)\]\s*/;

function onlineRows(body){
 const rows=[];
 let current,lastUser;
 for(const raw of body.split(/\r?\n/)){
  const line=raw.trim();if(!line)continue;
  if(line==='[已读]'){if(lastUser)lastUser.read=true;continue;}
  const prefix=rolePrefix.exec(line),center=centerPrefix.exec(line);
  if(center){rows.push({kind:'center',text:line.slice(center[0].length)});current=null;continue;}
  if(prefix||!current){
   current={kind:'bubble',role:prefix?.[1].toLowerCase()==='user'?'user':'assistant',text:prefix?line.slice(prefix[0].length):line};
   rows.push(current);
   if(current.role==='user')lastUser=current;
  }else current.text+=(current.text?'\n':'')+line;
 }
 return rows.filter(row=>row.text);
}

export function splitLiveReply(text){
 const parts=[];
 let online=false,cursor=0,buffer='';
 function flush(){
  if(online)parts.push(...onlineRows(buffer));
  else if(buffer.trim())parts.push({kind:'offline',text:buffer.trim()});
  buffer='';
 }
 for(const match of text.matchAll(liveTag)){
  buffer+=text.slice(cursor,match.index);cursor=match.index+match[0].length;
  const opening=match[1][0]!=='/';
  if(opening!==online){flush();online=opening;}
 }
 buffer+=text.slice(cursor);flush();
 return parts;
}

export function savedStoryScenes(state,session){
 const ids=new Set(state.sessions.map(item=>item.id));
 // Keep stories whose original chat is missing visible in the earliest remaining chat.
 const fallback=state.sessions.reduce((first,item)=>item.created<first.created?item:first,state.sessions[0]);
 return (state.moom?.scenes||[]).filter(scene=>scene.sessionId===session.id||session.id===fallback?.id&&!ids.has(scene.sessionId));
}

export function conversationTimeline(state,session){
 const messages=session.messages.filter(message=>!message.storyLink||message.text||message.attachments?.length||message.replyTo);
 const saved=savedStoryScenes(state,session).flatMap(scene=>[
  {story:true,kind:'narration',time:scene.created,title:scene.title,text:scene.premise,details:[scene.timeLabel,scene.place,scene.statusPanel?.weather,scene.statusPanel?.mood,scene.statusPanel?.condition].filter(Boolean).join(' · ')},
  ...scene.entries.map(entry=>({...entry,story:true,statusText:scene.statusText?.[['say','act'].includes(entry.kind)?'user':'assistant']})),
  ...(scene.summary?[{story:true,kind:'narration',time:scene.updated,text:scene.summary}]:[]),
 ]);
 return [...messages,...saved].sort((a,b)=>a.time-b.time);
}
