import {voiceFile,analyzeVoice} from './voice-files.js';
import {formatVoiceTime} from './model.js';
import {musicIcon} from '../apps/music/icons.js';
import {createVoiceRecorder} from './recorder.js';
export function createChatMedia({files=voiceFile,app,getState,getUI,isChat,render,notify}){
 const audio=new Audio();audio.preload='metadata';
 const picker=document.createElement('input');picker.type='file';picker.accept='audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.webm';picker.hidden=true;picker.dataset.chatVoice='';document.body.append(picker);
 let active=null,url='',revision=0,importRevision=0,busy=false,relink=null,loading=false,error='',pendingSession='',seeking=false;
 const drafts=new Set();
 let recordingSession='';
 const recorder=createVoiceRecorder({notify,onState(active,finishing=false){
  getUI().voiceRecording=active;getUI().voiceFinishing=finishing;
  if(isChat())render();
 },async onFile(file,transcript,duration,isCurrent){
  if(!isCurrent()||!isChat()||recordingSession!==getState().active)return;
  if(getUI().attachments.length>=6)throw new Error('一次最多添加 6 项附件。');
  let metadata;try{metadata=await analyzeVoice(file);}catch{metadata={duration,peaks:[]};}
  if(!isCurrent()||!isChat()||recordingSession!==getState().active)return;
  const fileId=crypto.randomUUID();await files(fileId,file);
  if(!isCurrent()||!isChat()||recordingSession!==getState().active){await files(fileId,null);return;}
  if(getUI().attachments.length>=6){await files(fileId,null);throw new Error('一次最多添加 6 项附件，录音未加入，请腾出一个位置后重录。');}
  drafts.add(fileId);getUI().attachments.push({id:crypto.randomUUID(),name:file.name,type:file.type,size:file.size,kind:'voice',data:'',voice:{fileId,...metadata,transcript}});
  notify('录音已加入待发送内容。');
 }});
 function resolve(key){
  for(const message of getState().sessions.find(s=>s.id===getState().active)?.messages||[]){
   const attachment=message.attachments?.find(a=>a.kind==='voice'&&`${message.id}/${a.id}`===key);if(attachment?.voice)return {message,attachment};
  }
 }
 function stop(){revision++;audio.pause();audio.removeAttribute('src');audio.load();if(url)URL.revokeObjectURL(url);url='';active=null;loading=false;error='';seeking=false;}
 function paint(){
  for(const card of app.querySelectorAll('[data-voice-key]')){
   const current=active?.key===card.dataset.voiceKey&&active.session===getState().active,playing=current&&!audio.paused&&!audio.ended;
   const play=card.querySelector('[data-voice-action=play]');if(play.getAttribute('aria-pressed')!==String(playing))play.innerHTML=musicIcon(playing?'pause':'play');play.setAttribute('aria-label',playing?'暂停语音':'播放语音');play.setAttribute('aria-pressed',String(playing));play.disabled=current&&loading;
   card.classList.toggle('is-playing',playing);card.classList.toggle('is-loading',current&&loading);
   const range=card.querySelector('[data-voice-seek]'),duration=current&&Number.isFinite(audio.duration)?audio.duration:Number(card.dataset.voiceDuration)||0;
   range.disabled=!current||loading||!!error||!duration;range.max=String(duration||1);
   if(!current||!seeking){const time=current?audio.currentTime||0:0;range.value=String(time);card.style.setProperty('--voice-progress',`${duration?Math.min(100,time/duration*100):0}%`);range.setAttribute('aria-valuetext',`${formatVoiceTime(time)} / ${formatVoiceTime(duration)}`);}
   card.querySelector('.voice-time').textContent=formatVoiceTime(duration);
   const status=card.querySelector('.voice-status');status.hidden=!(current&&(error||loading));status.textContent=current?(error||'正在载入音频…'):'';card.querySelector('.voice-relink').hidden=!(current&&error);
  }
 }
 function sync(){
  if(recorder.active&&(!isChat()||recordingSession!==getState().active))recorder.cancel();
  if(active&&(!isChat()||active.session!==getState().active||resolve(active.key)?.attachment.voice.fileId!==active.fileId))stop();
  if(busy&&pendingSession&&(!isChat()||pendingSession!==getState().active)){importRevision++;busy=false;pendingSession='';getUI().voiceBusy=false;picker.disabled=false;}
  for(const id of drafts){
   const sent=getState().sessions.some(s=>s.messages.some(m=>m.attachments?.some(a=>a.voice?.fileId===id)));
   if(sent){drafts.delete(id);continue;}
   if(!getUI().attachments.some(a=>a.voice?.fileId===id)){drafts.delete(id);void files(id,null).catch(()=>{});}
  }
  paint();
 }
 async function play(card){
  const key=card.dataset.voiceKey,entry=resolve(key);if(!entry)return;
  if(active?.key===key&&active.session===getState().active&&url&&!error){
   if(!audio.paused){audio.pause();paint();return;}
   if(audio.ended||audio.currentTime>=audio.duration)audio.currentTime=0;
   try{await audio.play();}catch{error='这段语音暂时无法播放，请重试或补回原音频。';}paint();return;
  }
  stop();active={key,fileId:entry.attachment.voice.fileId,session:getState().active};loading=true;paint();const ticket=revision;
  try{
   const file=await files(active.fileId);if(ticket!==revision)return;
   if(!file)throw new Error('音频不在此浏览器中，请重新选择原音频。');
   url=URL.createObjectURL(file);audio.src=url;await audio.play();if(ticket!==revision)return;
   loading=false;paint();
  }catch(e){if(ticket!==revision)return;loading=false;error=e.message?.includes('此浏览器')?e.message:'这段语音暂时无法播放，请重试或补回原音频。';paint();}
 }
 app.addEventListener('click',event=>{
  if(event.target.closest('[data-voice-action=cancel-record]')){recorder.cancel();return;}
  if(event.target.closest('[data-voice-action=record]')){
   if(recorder.recording){recorder.stop();return;}
   if(recorder.active||busy)return;
   if(getUI().attachments.length>=6){notify('一次最多添加 6 项附件。');return;}
   stop();document.dispatchEvent(new CustomEvent('chenxin:media-play',{detail:'voice-recording'}));
   recordingSession=getState().active;void recorder.start();return;
  }
  const live=event.target.closest('[data-live-voice]');
  if(live){
   notify('这条语音暂未附带可播放的音频，长按可转文字。');
   return;
  }
  const button=event.target.closest('[data-voice-action]');if(!button)return;
  const action=button.dataset.voiceAction,card=button.closest('[data-voice-key]');
  if(action==='import'){if(busy||recorder.active)return;relink=null;picker.value='';picker.click();return;}
  if(!card)return;
  if(action==='play')void play(card);
  if(action==='relink'){relink={key:card.dataset.voiceKey,session:getState().active};picker.value='';picker.click();}
 });
 app.addEventListener('pointerdown',e=>{if(e.target.matches('[data-voice-seek]'))seeking=true;});
 window.addEventListener('pointerup',()=>{if(seeking){seeking=false;paint();}});window.addEventListener('pointercancel',()=>{if(seeking){seeking=false;paint();}});
 app.addEventListener('input',e=>{if(!e.target.matches('[data-voice-seek]')||!active)return;const card=e.target.closest('[data-voice-key]');if(card.dataset.voiceKey!==active.key||!Number.isFinite(audio.duration))return;audio.currentTime=Math.max(0,Math.min(audio.duration,Number(e.target.value)));card.style.setProperty('--voice-progress',`${audio.currentTime/audio.duration*100}%`);e.target.setAttribute('aria-valuetext',`${formatVoiceTime(audio.currentTime)} / ${formatVoiceTime(audio.duration)}`);});
 picker.addEventListener('change',async()=>{
  const file=picker.files?.[0];if(!file||busy)return;
  const target=relink,session=getState().active,ticket=++importRevision;busy=true;picker.disabled=true;pendingSession=session;getUI().voiceBusy=true;getUI().tray='';render();let stored='';
  try{
   if(!target&&getUI().attachments.length>=6)throw new Error('一次最多添加 6 项附件。');
   const metadata=await analyzeVoice(file);if(ticket!==importRevision)return;
   if(target){
    if(target.session!==getState().active)throw new Error('对话已切换，请回到原消息补回音频。');
    const entry=resolve(target.key);if(!entry)throw new Error('原语音消息已不存在。');
    if((entry.attachment.size&&entry.attachment.size!==file.size)||(entry.attachment.voice.duration&&Math.abs(entry.attachment.voice.duration-metadata.duration)>.5))throw new Error('这份文件与原语音不一致，请选择原来的音频。');
    await files(entry.attachment.voice.fileId,file);if(ticket!==importRevision)return;stop();notify('原音频已补回，可以播放了。');
   }else{
    const id=crypto.randomUUID();stored=id;await files(id,file);if(ticket!==importRevision)return;
    if(getUI().attachments.length>=6)throw new Error('一次最多添加 6 项附件。');
    getUI().attachments.push({id:crypto.randomUUID(),name:file.name,size:file.size,type:file.type,kind:'voice',data:'',voice:{fileId:id,...metadata,transcript:''}});drafts.add(id);stored='';notify('语音已加入待发送内容。');
   }
  }catch(e){if(ticket===importRevision)notify(e.message||'音频读取失败。');}
  finally{
   if(stored)void files(stored,null).catch(()=>{});
   if(ticket===importRevision){busy=false;pendingSession='';picker.disabled=false;picker.value='';getUI().voiceBusy=false;if(isChat())render();}
  }
 });
 for(const event of ['timeupdate','loadedmetadata','pause','ended'])audio.addEventListener(event,paint);
 audio.addEventListener('play',()=>{loading=false;error='';document.dispatchEvent(new CustomEvent('chenxin:media-play',{detail:'voice'}));paint();});
 audio.addEventListener('error',()=>{if(active){loading=false;error='这段语音暂时无法播放，请重试或补回原音频。';paint();}});
 document.addEventListener('chenxin:media-play',event=>{if(event.detail!=='voice')audio.pause();});
 window.addEventListener('pagehide',()=>{recorder.cancel();stop();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&recorder.active){recorder.cancel();notify('录音已取消。');}});
 function showTranscript(target){
  if(!target?.isConnected||!app.contains(target))return;
  const text=target.matches('[data-live-voice]')?target.nextElementSibling:target.querySelector('.voice-transcript');
  if(!text?.matches('.voice-transcript,[data-live-voice-text]')||!text.textContent.trim()){notify('这段语音还没有对应文字，暂未接入语音识别。');return;}
  text.hidden=false;
  text.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }
 return {sync,showTranscript,reset(){recorder.cancel();importRevision++;busy=false;pendingSession='';picker.disabled=false;getUI().voiceBusy=false;stop();}};
}
