const liveTag=/<(\/?live)\s*>/gi;
const rolePrefix=/^(char|user)\s*[:：]\s*/i;
const centerPrefix=/^\[(时间|系统|拍一拍|撤回)\]\s*/;
const specialPrefix=/^\[(语音|图片|转账|引用|拉黑|拒收)\]\s*/;

function fields(value,count){
 const parts=String(value||'').trim().split(/\s*[|｜]\s*/);
 if(parts.length<=count)return parts.concat(Array(Math.max(0,count-parts.length)).fill(''));
 return [...parts.slice(0,count-1),parts.slice(count-1).join('|')];
}

// 模型没写秒数时按字数估：大约四个字一秒，最短一秒。
export function estimateVoiceSeconds(text){
 const count=[...String(text||'').replace(/\s/g,'')].length;
 return Math.max(1,Math.round(count/4)||1);
}

function voiceSeconds(raw,transcript){
 const value=String(raw||'').trim();
 const clock=/^(\d{1,3}):(\d{2})$/.exec(value);
 if(clock)return Math.min(600,Number(clock[1])*60+Number(clock[2]));
 const num=/^(\d+(?:\.\d+)?)\s*秒?$/.exec(value);
 if(num)return Math.min(600,Math.max(1,Math.round(Number(num[1]))));
 return estimateVoiceSeconds(transcript);
}

function parseBubble(role,body){
 const special=specialPrefix.exec(body);
 if(!special)return {kind:'bubble',role,text:body};
 const type=special[1],rest=body.slice(special[0].length).trim();
 if(type==='语音'){
  const [words,seconds]=fields(rest,2);
  return {kind:'voice',role,text:words,seconds:voiceSeconds(seconds,words)};
 }
 if(type==='图片')return {kind:'image',role,text:rest};
 if(type==='转账'){
  const [amount,noteRaw]=fields(rest,2);
  const pieces=noteRaw?noteRaw.split(/\s*[|｜]\s*/):[];
  const done=pieces.length>1&&pieces.at(-1)==='已收款';
  return {kind:'transfer',role,amount,note:done?pieces.slice(0,-1).join('|'):noteRaw,status:done?'done':'pending',text:amount?`转账 ${amount}`:'转账'};
 }
 if(type==='引用'){
  const [quote,reply]=fields(rest,2);
  return {kind:'quote',role,quote,text:reply};
 }
 // 拉黑只画在自己发出去被拦的那一侧。写在角色身上时，只留正文。
 if(role==='user')return {kind:'blocked',role,text:rest};
 return {kind:'bubble',role,text:rest};
}

function appendLine(current,line){
 const key=current.kind==='transfer'?'note':'text';
 current[key]=current[key]?`${current[key]}\n${line}`:line;
}

function onlineRows(body){
 const rows=[];
 let current,lastUser;
 for(const raw of body.split(/\r?\n/)){
  const line=raw.trim();if(!line)continue;
  if(line==='[已读]'){if(lastUser)lastUser.read=true;continue;}
  const prefix=rolePrefix.exec(line),center=centerPrefix.exec(line);
  if(center){rows.push({kind:'center',text:line.slice(center[0].length)});current=null;continue;}
  if(prefix||!current){
   const role=prefix?.[1].toLowerCase()==='user'?'user':'assistant';
   current=parseBubble(role,prefix?line.slice(prefix[0].length):line);
   rows.push(current);
   if(current.role==='user')lastUser=current;
  }else appendLine(current,line);
 }
 return rows.filter(row=>row.text||row.quote||row.kind==='voice'||row.kind==='transfer');
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
