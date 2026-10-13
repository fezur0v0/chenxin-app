import { music, musicSheet, musicArtwork } from './view.js';
import { musicIcon } from './icons.js';
import { musicCollections, trackFromFile, nextMusicId, PLAY_MODES, formatMusicTime } from './model.js';
import { musicFile } from './files.js';
export function createMusicApp({app,getState,setState,persist,notify,compressImage}) {
 const ui={screen:'home',playlistId:'builtin:all',returnScreen:'home',search:'',playing:false,time:0,duration:0,loading:false,missing:false,busy:false,seeking:false};
 const audio=new Audio();audio.preload='metadata';
 const dialog=document.createElement('dialog');dialog.className='music-sheet glass';document.body.append(dialog);
 const picker=document.createElement('input');picker.type='file';picker.multiple=true;picker.accept='audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus';picker.hidden=true;picker.dataset.musicFiles='';document.body.append(picker);
 let objectUrl='',loadedId='',generation=0,sheetKind='',sheetItem='',draftArt='',returnFocus,importTarget='builtin:all',replaceId='';
 function data(){return getState().music;}
 function refresh(focus,top=false) {
  const scope=app.querySelector('.music-app');if(!scope)return;
  const scroller=app.querySelector('.page-content'),scroll=scroller.scrollTop;
  scope.innerHTML=music(getState(),ui);scroller.scrollTop=top?0:scroll;
  if(focus)scope.querySelector(focus)?.focus({preventScroll:true});
  app.querySelectorAll('[data-music-action=import]').forEach(el=>el.disabled=ui.busy);
 }
 function commit(change) {
  const snapshot=structuredClone(getState());
  try{change(getState());if(!persist())throw new Error('音乐信息尚未保存，请检查本机储存空间。');return true;}
  catch(error){setState(snapshot);const alert=dialog.open?dialog.querySelector('[role=alert]'):null;if(alert){alert.hidden=false;alert.textContent=error.message;}else notify(error.message);return false;}
 }
 function navigate(screen,playlistId) {
  if(playlistId)ui.playlistId=playlistId;
  if(screen==='player'&&ui.screen!=='player')ui.returnScreen=ui.screen;
  ui.screen=screen;ui.search='';refresh('.music-header h1',true);
 }
 function stop() {
  generation++;audio.pause();audio.removeAttribute('src');audio.load();loadedId='';
  if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl='';ui.playing=false;ui.time=0;ui.duration=0;ui.loading=false;ui.missing=false;
 }
 function syncPlayback() {
  ui.playing=!audio.paused&&!audio.ended;
  for(const scope of [app,dialog]) {
   scope.querySelectorAll('[data-music-action=toggle]:not(.music-vinyl)').forEach(el=>{el.innerHTML=musicIcon(ui.playing?'pause':'play');el.setAttribute('aria-label',ui.playing?'暂停':'播放');});
   scope.querySelectorAll('.music-vinyl,.music-mini-disc').forEach(el=>{el.classList.toggle('is-spinning',ui.playing);if(el.matches('.music-vinyl'))el.setAttribute('aria-label',ui.playing?'暂停音乐':'播放音乐');});
   scope.querySelectorAll('.music-player-page,.music-equalizer').forEach(el=>el.classList.toggle('is-playing',ui.playing));
  }
 }
 function syncProgress() {
  ui.time=Number.isFinite(audio.currentTime)?audio.currentTime:0;
  if(Number.isFinite(audio.duration))ui.duration=audio.duration;
  app.querySelectorAll('[data-music-time]').forEach(el=>el.textContent=formatMusicTime(ui.time));
  app.querySelectorAll('[data-music-duration]').forEach(el=>el.textContent=formatMusicTime(ui.duration));
  const range=app.querySelector('[name=music-seek]');
  if(range){range.disabled=!ui.duration;range.max=String(ui.duration||1);if(!ui.seeking)range.value=String(Math.min(ui.time,ui.duration));range.style.setProperty('--range-fill',`${ui.duration?ui.time/ui.duration*100:0}%`);range.setAttribute('aria-valuetext',`${formatMusicTime(ui.time)} / ${formatMusicTime(ui.duration)}`);}
  app.querySelectorAll('[data-music-progress-line]').forEach(el=>el.style.width=`${ui.duration?ui.time/ui.duration*100:0}%`);
 }
 async function playTrack(id,queue) {
  const track=data().tracks.find(t=>t.id===id);if(!track||ui.busy)return;
  stop();const ticket=generation;
  if(!commit(state=>{state.music.currentId=id;state.music.queue=queue?.length?[...queue]:[id];}))return;
  ui.loading=true;ui.duration=track.duration;refresh();
  try {
   const file=await musicFile(id);if(ticket!==generation)return;
   if(!file){ui.missing=true;throw new Error('这首歌的文件不在当前设备，请重新选择音乐文件。');}
   objectUrl=URL.createObjectURL(file);loadedId=id;audio.src=objectUrl;
   await audio.play();if(ticket!==generation)return;
   commit(state=>{const entry=state.music.tracks.find(t=>t.id===id);if(entry)entry.lastPlayed=Date.now();});
  }catch(error){if(ticket!==generation)return;notify(error.name==='NotAllowedError'?'再点一下播放，就可以开始聆听。':ui.missing?error.message:'这首音乐暂时无法播放，请换一个浏览器支持的音频文件。');}
  finally{if(ticket===generation){ui.loading=false;refresh();if(dialog.open&&sheetKind==='queue')updateQueue();}}
 }
 function queueForTrack() {
  return (musicCollections(data()).find(list=>list.id===ui.playlistId)?.tracks||data().tracks).map(t=>t.id);
 }
 async function toggle() {
  if(ui.loading)return;
  if(ui.playing){audio.pause();syncPlayback();return;}
  if(loadedId===data().currentId&&objectUrl){try{await audio.play();}catch{notify('音乐暂时无法播放，请重新选择文件。');}return;}
  if(data().currentId)await playTrack(data().currentId,data().queue);
  else chooseFiles();
 }
 function openSheet(kind,item) {
  returnFocus=document.activeElement;sheetKind=kind;sheetItem=item?.id||'';draftArt=item?.cover||'';
  dialog.setAttribute('aria-label',{queue:'播放队列',playlist:'歌单编辑',track:'歌曲信息'}[kind]);dialog.innerHTML=musicSheet(kind,getState(),ui,item);
  const title=dialog.querySelector('[name=title]');if(title){title.required=true;title.maxLength=kind==='playlist'?60:120;}
  const description=dialog.querySelector('[name=description]');if(description)description.maxLength=300;
  const artist=dialog.querySelector('[name=artist]');if(artist)artist.maxLength=120;
  dialog.showModal();dialog.querySelector('[data-music-action=close-sheet]').focus({preventScroll:true});
 }
 function updateQueue(){if(dialog.open&&sheetKind==='queue'){const scroll=dialog.scrollTop;dialog.innerHTML=musicSheet('queue',getState(),ui);dialog.scrollTop=scroll;}}
 function chooseFiles(replace=false) {
  if(ui.busy)return;
  importTarget=ui.screen==='playlist'?ui.playlistId:'builtin:all';replaceId=replace?(sheetKind==='track'&&dialog.open?sheetItem:data().currentId):'';
  picker.multiple=!replaceId;picker.click();
 }
 function handle(event) {
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.musicList){navigate('playlist',button.dataset.musicList);return;}
  if(button.dataset.musicPlaylist){
   const list=musicCollections(data()).find(p=>p.id===button.dataset.musicPlaylist);
   if(list?.tracks.length)void playTrack(list.tracks[0].id,list.tracks.map(t=>t.id));
   else{navigate('playlist',list?.id||'builtin:all');notify('先添加一些喜欢的音乐吧。');}return;
  }
  if(button.dataset.musicTrack){const queue=button.hasAttribute('data-music-from-queue')?data().queue:queueForTrack();void playTrack(button.dataset.musicTrack,queue);return;}
  if(button.dataset.musicTrackMenu){const track=data().tracks.find(t=>t.id===button.dataset.musicTrackMenu);if(track){if(dialog.open)dialog.close();openSheet('track',track);}return;}
  switch(button.dataset.musicAction) {
   case 'music-home':navigate('home');break;
   case 'player':navigate('player');break;
   case 'leave-player':navigate(ui.returnScreen==='playlist'?'playlist':'home');break;
   case 'search':if(ui.screen!=='playlist')navigate('playlist','builtin:all');app.querySelector('[name=music-search]')?.focus();break;
   case 'import':chooseFiles();break;
   case 'replace-file':chooseFiles(true);break;
   case 'toggle':void toggle();break;
   case 'previous':case 'next':{const id=nextMusicId(data(),button.dataset.musicAction==='next'?1:-1);if(id)void playTrack(id,data().queue);break;}
   case 'mode':if(commit(state=>{state.music.mode=PLAY_MODES[(PLAY_MODES.indexOf(state.music.mode)+1)%PLAY_MODES.length];})){const mode={list:['repeat','列表循环'],one:['repeatOne','单曲循环'],shuffle:['shuffle','随机播放']}[data().mode];button.innerHTML=musicIcon(mode[0]);button.setAttribute('aria-label',mode[1]);}break;
   case 'like':if(commit(state=>{const track=state.music.tracks.find(t=>t.id===state.music.currentId);if(track)track.liked=!track.liked;})){const liked=Boolean(data().tracks.find(t=>t.id===data().currentId)?.liked);button.classList.toggle('is-liked',liked);button.setAttribute('aria-pressed',String(liked));button.setAttribute('aria-label',liked?'取消喜欢':'喜欢这首歌');}break;
   case 'queue':openSheet('queue');break;
   case 'close-sheet':dialog.close();break;
   case 'new-playlist':openSheet('playlist');break;
   case 'manage-playlist':{const list=data().playlists.find(p=>p.id===ui.playlistId);if(list)openSheet('playlist',list);break;}
   case 'edit-track':{const track=data().tracks.find(t=>t.id===data().currentId);if(track)openSheet('track',track);else chooseFiles();break;}
   case 'clear-art':draftArt='';dialog.querySelector('[data-music-art-preview]').innerHTML=musicArtwork();break;
   case 'delete-playlist':if(confirm('删除这份歌单？歌曲仍会保留在曲库里。')&&commit(state=>{state.music.playlists=state.music.playlists.filter(p=>p.id!==sheetItem);})){dialog.close();navigate('home');notify('歌单已删除，歌曲仍保留。');}break;
   case 'delete-track':if(confirm('删除这首本机音乐？它会从曲库和歌单中移除。')){const id=sheetItem;if(commit(state=>{const m=state.music;m.tracks=m.tracks.filter(t=>t.id!==id);m.queue=m.queue.filter(x=>x!==id);m.playlists.forEach(p=>p.trackIds=p.trackIds.filter(x=>x!==id));if(m.currentId===id)m.currentId='';})){if(loadedId===id)stop();dialog.close();refresh();void musicFile(id,null).catch(error=>notify(error.message));notify('歌曲已删除。');}}break;
  }
 }
 app.addEventListener('click',event=>{if(event.target.closest('.music-app'))handle(event);});
 dialog.addEventListener('click',handle);
 dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
 app.addEventListener('pointerdown',event=>{if(event.target.name==='music-seek')ui.seeking=true;});
 window.addEventListener('pointerup',()=>{if(ui.seeking){ui.seeking=false;syncProgress();}});
 window.addEventListener('pointercancel',()=>{ui.seeking=false;});
 app.addEventListener('input',event=>{
  if(event.target.name==='music-seek'&&ui.duration){audio.currentTime=Math.min(ui.duration,Math.max(0,Number(event.target.value)));syncProgress();}
  if(event.target.name==='music-search'){const position=event.target.selectionStart;ui.search=event.target.value;refresh('[name=music-search]');const input=app.querySelector('[name=music-search]');try{input.setSelectionRange(position,position);}catch{}}
 });
 dialog.addEventListener('change',async event=>{
  if(!event.target.hasAttribute('data-music-art')||!event.target.files?.[0])return;
  const target=sheetItem;
  try{const cover=await compressImage(event.target.files[0],384);if(cover.length>=400000)throw new Error('封面图片较大，请换一张小一些的图片。');if(dialog.open&&sheetItem===target){draftArt=cover;dialog.querySelector('[data-music-art-preview]').innerHTML=musicArtwork({cover});}}
  catch(error){notify(error.message);}finally{event.target.value='';}
 });
 dialog.addEventListener('submit',event=>{
  event.preventDefault();const form=new FormData(event.target),title=String(form.get('title')||'').trim();if(!title)return;
  if(event.target.getAttribute('id')==='music-playlist-form') {
   const id=String(form.get('id')||'')||crypto.randomUUID(),existing=data().playlists.find(p=>p.id===id);
   if(commit(state=>{const list={id,title:title.slice(0,60),description:String(form.get('description')||'').slice(0,300),cover:existing?.cover||'',trackIds:form.getAll('trackIds').filter(id=>state.music.tracks.some(t=>t.id===id)),created:existing?.created||Date.now()};if(existing)state.music.playlists[state.music.playlists.findIndex(p=>p.id===id)]=list;else state.music.playlists.push(list);})){dialog.close();navigate('playlist',id);notify('歌单已保存。');}
  } else if(event.target.getAttribute('id')==='music-track-form') {
   if(commit(state=>{const track=state.music.tracks.find(t=>t.id===form.get('id'));if(!track)throw new Error('这首歌已经不在曲库里。');track.title=title.slice(0,120);track.artist=String(form.get('artist')||'').trim().slice(0,120)||'本机音乐';track.cover=draftArt;})){dialog.close();refresh();notify('歌曲信息已保存。');}
  }
 });
 picker.addEventListener('change',async()=>{
  const files=[...picker.files],target=importTarget,replacement=replaceId,library=data();if(!files.length||ui.busy)return;
  ui.busy=true;picker.disabled=true;refresh();let count=0,errorText='';
  try {
   if(!replacement&&data().tracks.length+files.length>500)throw new Error('本机曲库最多 500 首，请先整理一下。');
   for(const file of files) {
    try {
     const imported=trackFromFile(file),id=replacement||imported.id,previous=replacement?await musicFile(id):undefined;
     await musicFile(id,file);
     if(data()!==library){await musicFile(id,previous||null);continue;}
     const saved=commit(state=>{
      if(replacement){const track=state.music.tracks.find(t=>t.id===id);if(!track)throw new Error('这首歌已不存在。');Object.assign(track,{fileName:imported.fileName,type:imported.type,size:imported.size,duration:0});}
      else{if(target==='builtin:liked')imported.liked=true;state.music.tracks.push(imported);const list=state.music.playlists.find(p=>p.id===target);if(list)list.trackIds.push(id);}
     });
     if(!saved){await musicFile(id,previous||null);continue;}
     if(replacement&&data().currentId===id){stop();ui.missing=false;}
     count++;
    }catch(error){errorText=error.message;}
   }
  }catch(error){errorText=error.message;}
  finally{ui.busy=false;picker.disabled=false;picker.value='';if(dialog.open&&sheetKind==='track'&&replacement)dialog.close();refresh();notify(`${count?`已添加 ${count} 首音乐。`:''}${errorText||(count?'':'没有添加新的音乐。')}`);}
 });
 audio.addEventListener('play',()=>{ui.loading=false;syncPlayback();});audio.addEventListener('pause',syncPlayback);audio.addEventListener('timeupdate',syncProgress);
 audio.addEventListener('loadedmetadata',()=>{
  if(!loadedId||loadedId!==data().currentId)return;syncProgress();
  const track=data().tracks.find(t=>t.id===loadedId);if(track&&Number.isFinite(audio.duration)&&Math.abs(track.duration-audio.duration)>.1)commit(()=>{track.duration=audio.duration;});
 });
 audio.addEventListener('ended',()=>{syncPlayback();const id=nextMusicId(data(),1,true);if(id)void playTrack(id,data().queue);});
 return {ui,reset(){stop();ui.screen='home';ui.playlistId='builtin:all';ui.search='';if(dialog.open)dialog.close();}};
}
