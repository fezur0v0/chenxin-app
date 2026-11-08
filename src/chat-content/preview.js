import {makeReply,audioPeaks} from './model.js';
import {icon} from '../icons.js';

// Preview messages, preferences and audio stay in memory, apart from real chats.
export function createChatPreview(){
 const values=new Map(),audioFiles=new Map();
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};
 async function files(id,file){
  if(file===null){audioFiles.delete(id);return;}
  if(file!==undefined){audioFiles.set(id,file);return;}
  return audioFiles.get(id);
 }
 function seed(state){
  const rate=16000,duration=6,samples=new Float32Array(rate*duration);
  for(let i=0;i<samples.length;i++){
   const t=i/rate,envelope=Math.sin(Math.PI*t/duration)**2;
   samples[i]=Math.sin(2*Math.PI*440*t)*envelope*.07*(.65+.35*Math.sin(t*5));
  }
  const wav=new ArrayBuffer(44+samples.length*2),view=new DataView(wav);
  const text=(offset,value)=>[...value].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,wav.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  text(36,'data');view.setUint32(40,samples.length*2,true);
  samples.forEach((sample,i)=>view.setInt16(44+i*2,Math.round(sample*32767),true));
  const file=new File([wav],'样式预览测试音.wav',{type:'audio/wav'});
  audioFiles.set('style-preview-audio',file);
  const session=state.sessions.find(s=>s.id===state.active),now=Date.now();
  session.title='聊天样式预览';
  const user={id:'style-preview-user',role:'user',text:'今天想慢一点，什么也不着急。',time:now-120000,attachments:[]};
  const assistant={id:'style-preview-assistant',role:'assistant',text:'雨落在窗台上，你把杯子往里推了推。\n\n<live>\nchar：那就慢一点吧。\nuser：好，陪我坐一会儿。\nchar：我在。\n</live>\n\n屋里安静下来，只剩窗外的雨声。',time:now-90000,attachments:[],reasoningSummary:'这是一段用于查看排版的示例摘要。\n\n回应此刻的感受，保持语气温和、简短，给对方留一点空间。',reasoningDurationMs:1800};
  const showcase={id:'style-preview-live',role:'assistant',text:`<live>
char：那就慢一点吧。
user：好，陪我坐一会儿。
char：[语音] 我刚下班，路上风好大|6秒
user：[语音] 外面好冷啊，便利店门口风特别大|8秒
char：[图片] 窗外的路灯，有点糊
user：[图片] 便利店门口的伞，水珠还在往下滴
char：[转账] 2000|打车费，别去挤晚班地铁
user：[转账] 52|奶茶钱|已收款
char：[引用] 不想去|少拿这水汪汪的小眼神糊弄我
user：[引用] 到家了吗？|还没，在便利店躲雨
user：[拉黑] 你到底怎么了
</live>`,time:now,attachments:[]};
  session.messages=[user,assistant,{id:'style-preview-voice',role:'assistant',text:'',time:now-60000,attachments:[{id:'style-preview-attachment',kind:'voice',name:file.name,type:file.type,size:file.size,voice:{fileId:'style-preview-audio',duration,peaks:audioPeaks({numberOfChannels:1,length:samples.length,getChannelData:()=>samples}),transcript:'这是一段 6 秒测试音，用来体验播放、暂停和进度拖动。'}}]},
   {id:'style-preview-reply',role:'user',text:'嗯，就这样陪我待一小会儿。',time:now-30000,attachments:[],replyTo:makeReply(state,user)},showcase];
 }
 function decorate({app,state,ui,render}){
  const header=app.querySelector('.chat-header');if(!header)return;
  header.querySelector('.peer-details small').textContent='样式预览 · 示例消息';
  header.querySelector('.chat-header-actions').innerHTML=`<button type="button" data-preview-theme aria-label="切换预览日夜模式">${icon(state.theme==='dark'?'sun':'moon')}</button><a class="preview-exit" href="./" aria-label="结束预览">${icon('back')}</a>`;
  header.querySelector('[data-preview-theme]').addEventListener('click',()=>{state.theme=state.theme==='dark'?'light':'dark';render();});
  const note=document.createElement('aside');note.className='chat-preview-note';
  note.innerHTML='<span>示例里有文字、语音、图片描述、转账、引用和拉黑。拉黑只出现在自己被拦的那一侧。</span><button type="button">试试引用消息</button>';
  note.querySelector('button').addEventListener('click',()=>{
   const original=state.sessions.find(s=>s.id===state.active)?.messages.find(m=>m.id==='style-preview-user');
   if(!original)return;ui.replyTo=makeReply(state,original);render();app.querySelector('[name=message]')?.focus({preventScroll:true});
  });
  app.querySelector('.date-line')?.replaceWith(note);
 }
 return {storage,files,seed,decorate};
}
