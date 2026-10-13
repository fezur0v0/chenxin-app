const text=(value,max=120)=>typeof value==='string'?value.slice(0,max):'';
const artwork=value=>typeof value==='string'&&value.length<400000&&/^data:image\/(jpeg|png|webp);base64,[a-z\d+/=]+$/i.test(value)?value:'';
export const PLAY_MODES=['list','one','shuffle'];
export function emptyMusic(){return {tracks:[],playlists:[],currentId:'',queue:[],mode:'list'};}
export function normalizeMusic(value) {
 if(value===undefined)return emptyMusic();
 if(!value||!Array.isArray(value.tracks)||!Array.isArray(value.playlists))throw new Error('音乐数据损坏');
 const ids=new Set();
 const tracks=value.tracks.map(track=>{
  if(typeof track?.id!=='string'||!track.id||ids.has(track.id)||typeof track.title!=='string')throw new Error('歌曲数据损坏');
  ids.add(track.id);
  return {id:track.id,title:text(track.title)||'未命名歌曲',artist:text(track.artist)||'本机音乐',cover:artwork(track.cover),fileName:text(track.fileName,240),type:text(track.type,100),size:Number.isFinite(track.size)?Math.max(0,track.size):0,duration:Number.isFinite(track.duration)?Math.max(0,track.duration):0,liked:track.liked===true,created:Number.isFinite(track.created)?track.created:Date.now(),lastPlayed:Number.isFinite(track.lastPlayed)?track.lastPlayed:0};
 });
 const listIds=new Set(),playlists=value.playlists.map(list=>{
  if(typeof list?.id!=='string'||!list.id||list.id.startsWith('builtin:')||listIds.has(list.id)||typeof list.title!=='string'||!Array.isArray(list.trackIds))throw new Error('歌单数据损坏');
  listIds.add(list.id);
  return {id:list.id,title:text(list.title,60)||'新的歌单',description:text(list.description,300),cover:artwork(list.cover),trackIds:[...new Set(list.trackIds.filter(id=>ids.has(id)))],created:Number.isFinite(list.created)?list.created:Date.now()};
 });
 return {tracks,playlists,currentId:ids.has(value.currentId)?value.currentId:'',queue:[...new Set((Array.isArray(value.queue)?value.queue:[]).filter(id=>ids.has(id)))],mode:PLAY_MODES.includes(value.mode)?value.mode:'list'};
}
export function musicCollections(music) {
 return [
  {id:'builtin:liked',title:'我喜欢的音乐',description:'每一次心动，都放在这里。',symbol:'heart',tint:'#f2a7be',tracks:music.tracks.filter(t=>t.liked)},
  {id:'builtin:all',title:'全部音乐',description:'属于你的小小唱片架。',symbol:'music',tint:'#8dc3f0',tracks:music.tracks},
  {id:'builtin:recent',title:'最近播放',description:'再听一遍，喜欢的旋律。',symbol:'clock',tint:'#b7a2e2',tracks:music.tracks.filter(t=>t.lastPlayed>0).slice().sort((a,b)=>b.lastPlayed-a.lastPlayed)},
  ...music.playlists.map((p,i)=>({...p,symbol:'disc',tint:['#8ed6c0','#f4d66e','#f7b99a'][i%3],tracks:p.trackIds.map(id=>music.tracks.find(t=>t.id===id)).filter(Boolean)})),
 ];
}
export function nextMusicId(music,direction=1,ended=false,random=Math.random) {
 const queue=music.queue.filter(id=>music.tracks.some(t=>t.id===id));if(!queue.length)return '';
 if(ended&&music.mode==='one'&&queue.includes(music.currentId))return music.currentId;
 if(music.mode==='shuffle'&&queue.length>1){const others=queue.filter(id=>id!==music.currentId);return others[Math.min(others.length-1,Math.floor(random()*others.length))];}
 const index=queue.indexOf(music.currentId);
 return index===-1?queue[0]:queue[(index+direction+queue.length)%queue.length];
}
export function trackFromFile(file) {
 if(!file.size||file.size>80*1024*1024||!(/^audio\//.test(file.type)||/\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i.test(file.name)))throw new Error('请选择 80MB 以内的音乐文件。');
 const name=file.name.replace(/\.[^.]+$/,''),parts=name.split(' - ');
 return {id:crypto.randomUUID(),title:text(parts.length>1?parts.slice(1).join(' - '):name)||'未命名歌曲',artist:text(parts.length>1?parts[0]:'本机音乐'),cover:'',fileName:text(file.name,240),type:file.type,size:file.size,duration:0,liked:false,created:Date.now(),lastPlayed:0};
}
export function formatMusicTime(seconds) {
 const safe=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;
 return `${String(Math.floor(safe/60)).padStart(2,'0')}:${String(safe%60).padStart(2,'0')}`;
}
