const text=(value,max)=>typeof value==='string'?value.slice(0,max):'';
export function normalizeVoice(value){
 if(!value||typeof value.fileId!=='string'||!value.fileId.trim()||value.fileId.length>100)return null;
 return {fileId:value.fileId,duration:Number.isFinite(value.duration)?Math.min(600,Math.max(0,value.duration)):0,peaks:(Array.isArray(value.peaks)?value.peaks:[]).slice(0,48).filter(Number.isFinite).map(n=>Math.min(1,Math.max(0,n))),transcript:text(value.transcript,12000)};
}
export function normalizeReply(value){
 if(!value||typeof value.messageId!=='string'||!value.messageId.trim()||value.messageId.length>100)return null;
 return {messageId:value.messageId,role:value.role==='assistant'?'assistant':'user',author:text(value.author,40),text:text(value.text,240),kind:['image','voice','file'].includes(value.kind)?value.kind:'text'};
}
export function messageExcerpt(message){
 if(message.text?.trim())return message.text.trim().slice(0,240);
 if(message.attachments?.some(a=>a.kind==='voice'))return '[语音消息]';
 if(message.attachments?.some(a=>a.data))return '[图片]';
 return message.attachments?.length?`[文件] ${message.attachments[0].name}`:'消息内容为空';
}
export function makeReply(state,message){
 return normalizeReply({messageId:message.id,role:message.role,author:message.role==='assistant'?state.persona.name:state.home.userName,text:messageExcerpt(message),kind:message.text?.trim()?'text':message.attachments?.some(a=>a.kind==='voice')?'voice':message.attachments?.some(a=>a.data)?'image':'file'});
}
export function formatVoiceTime(value){
 if(!Number.isFinite(value)||value<0)return '0:00';const seconds=Math.floor(value);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}
export function audioPeaks(buffer,count=32){
 const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i)),peaks=[];
 for(let i=0;i<count;i++){
  const start=Math.floor(i*buffer.length/count),end=Math.floor((i+1)*buffer.length/count);let peak=0;
  const step=Math.max(1,Math.floor((end-start)/1800));
  for(let j=start;j<end;j+=step)for(const channel of channels)peak=Math.max(peak,Math.abs(channel[j]||0));peaks.push(peak);
 }
 const max=Math.max(...peaks);return peaks.map(p=>max?p/max:0);
}
