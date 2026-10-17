import {audioPeaks} from './model.js';
let database;
function open(){
 if(!database)database=new Promise((resolve,reject)=>{
  const request=indexedDB.open('chenxin.chat.voice.v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('files');
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=undefined;};resolve(db);};
  request.onerror=()=>{database=undefined;reject(new Error('本机语音存储不可用。'));};
  request.onblocked=()=>{database=undefined;reject(new Error('请关闭其他页面后重试。'));};
 });
 return database;
}
export async function voiceFile(id,file){
 const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('files',file===undefined?'readonly':'readwrite'),store=tx.objectStore('files');
  const request=file===undefined?store.get(id):file===null?store.delete(id):store.put(file,id);
  tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(new Error('语音文件未能保存，请检查本机空间。'));
 });
}
export async function analyzeVoice(file){
 if(file.size>10*1024*1024)throw new Error('语音文件不能超过 10MB。');
 if(!file.size||!(/^audio\//i.test(file.type)||/\.(mp3|m4a|aac|wav|ogg|opus|flac|webm)$/i.test(file.name)))throw new Error('请选择 MP3、M4A、WAV 等音频文件。');
 const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)throw new Error('这个浏览器暂不支持读取音频。');
 const context=new AudioContext();
 try{
  let buffer;try{buffer=await context.decodeAudioData(await file.arrayBuffer());}catch{throw new Error('无法读取这段音频，请换用此浏览器支持的格式。');}
  if(!Number.isFinite(buffer.duration)||buffer.duration<=0||buffer.duration>600)throw new Error('语音时长需在 10 分钟以内。');
  return {duration:buffer.duration,peaks:audioPeaks(buffer)};
 }finally{await context.close().catch(()=>{});}
}
