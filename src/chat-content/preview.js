import {makeReply,audioPeaks} from './model.js';
import {icon} from '../icons.js';

// Sample portraits for the style preview. Real chats keep whatever was saved; an empty avatar still falls back to the first character.
const previewAiAvatar='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAALCUlEQVR42u2ayXJjSRWG78OwgFoQBNFsCAheiCeoXdMNNF0uV3mSbc2SrcGWB0keS5JddHdVtQt4AFbloViwYMGCBQsikvxP5smbN3WvdAfJbWgvjiXbUt5zPv//nynJ3np1V2StjWpHbNb2RL6+LwpbB6KwfSiKja4oNbui3OyJcqsvKu0jqurOsana7kmssp/D62BNrI1r4Fq4Jq6NHtALeprFbF5mOLKZTdlUPgBGQSm3+wEoPHC9c6rrTNT3zsRWROF39Bj9eBcYgZLXwLVwTQaFXtATessOqCLvpChSTV2qZkuqZvsgAMZWixpKAzHDn4ut/XOxTfVK1YFT/PN99Vh6joF2SmsyLFtVPqgD6g09kppSzunlKjsiSRGcWidSNQEwWiUEhYFoAD958kniUuAYmFJXrRMEFa0mBSnpvIkA2ZYKU804GK0UOVjjYCAahwPxy5/9iioNIC6shTVZWdNBBS03F0BBOGGqYStZijFghgbMLACFg9KKkj2glzA1pYHkrZV3xLSKhAPvIzBZNTHAzBJQGCj0gF7QE3pDj1GQ4swuAbXFpFKZ48Lp04XZUghNZSfki7JSsxsNZ9aACNLhgK6NHpTtfMspSP1xSJVdMW3+iYByViCHw/GzBjsOq6bZHU2EMw9ACtJQqclAYstFQerQjJMBleSdkFK54+9Wrq0MHLaUVk0rBpx5AUKhB6UmbTkNybUb726YEbNGcfBW5Re3VO50SIa0lZtAngRnJFq9i1hw5glIQRpFQ2opSAUNSeVRh2YOYyEBtYRdvrVk7vA5h3crHcjGVgRnaOD8/Ke/eDClIA0VJG03E9xyFsxEVtOQ2GouD2+1KO9wyR8ErMW5Q1s571Y4zerMcZTzkAAFlCR7Rc81hiRnwUxkNZ1HbDUCYzHxVuQXLsgsp7d031ocyryV+7uVa6uHBogh8e6mIKlzEoe2bbWc3vptJgbQaklZa93etazcqZrc4a1cWkvCafUvHzYg2aOymoZEKvLzyFgNKtK7GlhYgJqWejoh6jnW6tHWsrbyVu8yELwPEZBvNQXJWI1UdByioo6loqbwlgtNFc5Qj509rnpCrNXu/28AQq+u1VwV2Vm0RipqCbDxlotNYy+zc9nq2Q1TT9Ba97F1Z9/6L8ZVtBtUkb2jgQnYeGwvOveYnasnUz5EPdaW3u6/vndAH/80Sv1coyI5g6sizIqZMfsGq0jbjA6KZC9z7ulKyfX1iTm+euYJ6OOfL1RJQFkghamoonc0zIzZwQAs1rSKPGUvhPO+/OWhsleL7XVKi6jskUf4CeqZFyADxwJ0lxISem9QFikV1fSOVtbnImWzQ2IBJgTI7F5j9jqx7DXQ9lLqaR/dD6AAHAdQGkjoHTMomw0sm52M2Yx3MwkIuxfezjiQvwyzlzyqk71G+tzz+l4A/e0vl1MB3b0fJgT0Wp+LRjQTZnNtBgZgASZg44Xnz7GoaHvVLXs15bknyl6zhAQ4cQElhYQZ2GZ1bbOKtllYDnnw2rrJn14wf6zdqwF7ycVbUwBlhcRw5gWoRYAuzG5W0zbzc6hHLNZ1Dnnq9GwDOhJlnT+1kPyJ2sFmAcmGkwRQEkhuDhlAOocYEAV1lQHpgC4EAlpt7/DqNvJHLgp5NnuXM3/PxwUzT0A0AwHiHDqnWSsWIDuoNSAV0IWmBSgkoJMAsgdNAycpoLiQ1AzBoK52LED0sqNLTDSgPQMIIVVqHU8ApCopoEn1ox88mQgIv58toIsJgI7NTqYA7cUBNKTFEGxxGogChEGjKhSQhjLpeQFAV8OEb/CPaLZEgAozAhSllKlQHDi+cpR6JgG6vRpQZQVUSANomwCNMgFKVAmz5/YqOaDtLIDKGlBNZxAWQ8UGJIcKq//8+19UP/7hEyrcD3ucC8d9Dsq2FsNJDmhAM2LW8jRAmwDU6FvnoPSAxnYfB84///H3wLBhj2dr8WP4OS4kG05qQLtn1jmoTywCgNYBaKtLZ4CiA6iuD4qoLIAYEg8ZD9BoTHX8PNdaVN8mATSk2WxARXNQ7BITArTmvNQgQO0T+foE/wRwTovAq6isgFxILpy/Dg8CxdnjPifMWoBz+238/zui/AEgOSNmxcxF6yQNJmATAJQHoOaRKBGgU+nN2QOaVGGAooN5MBNAVQJ0SjNj9nwYoJz8ZqMuAW33VFC3EdQKkLLZkCouoDvZ7N27c3H39kzcvjmjW/pe/pxUEQvQvg/o/SgI5u25uPnmVNx8fSLrWJe8/+Y0NiDMowL6nGbFzCqge8Qix4BWy7siENT4D4iWAlSxcggVF9DtNyfi9ivZ9B+PxM3rPt3ie/ycYF0N9NkmWDYc1BgcqRAC89WRuJbrXl/2xPVFVxXuy5/FB6Tyh+wlZy3qHcwOaLAhQGtWUOcbffJiSecQ2ywJINSNbPhGN49b+h6gvgakc/FRDswZwxUANNgPWgvKkQrBGoDxYXQoPsjHfhgcqFtZSU7Svr3OlL1aRzQ7B/QaA1op7QjOoQ2dQwWdQ7bNanuDRA3QX1UOYQqQ5F+YlPSGVTSKrHD1nCjlyLUUnH3x4dW+uh0kAxS01wnNjNk3rPwBGwK0ihyqqhwKs1mVACX7z9Qblj/DgYIASCroFjaTQw+ePg2UDcf9HUIY9roeU9C+UVGS/qqR9jokFqsMaLnYFpNsVtY2SwqIICF/uLS9XPW4IMLKnHnenSsVMSQoSVfS3kg9U+wFNt5SoSXYZjlts81tZbOAijrJASEzbuVfnW5pJ3ulLGNv32H1fjT2St3fzqXVJGQCJe16jcCWt0l7C6rniGbG7DnLXmBDgJZhs7KyWaiKdpSK0ryNOhVGKKB4Z54bXWn6wkxh6iF7SRbLDOhlvklSWoHNKnuS4EGkilIBej9KUcPIF6MunJt3aQGFqeeAGKxoe4GN92KzIYyKKuMqsne0tJ9UuIpIUuPqeZVZPSh/53LUU/HVAzbe4sa2mKSivN7RsGCWj3PSwRnO3FpcmClPO1e0esDGe76+JQIqkv5b0yraIBX5Vsv6gWAiQBFwbmcAB+Wfe3jnCmYPmICNt5CrC1bRElRU2pUy26M0X9fnIrbaLD41TW+twczgoPL6fZ91/boLM2P2JUs9YOM9W6sJVtFLqKi4o6xW1Vara6s1+jP73D2LtWbVw6Z5UarOPcpaO8SA1QM23perVcEqegEVFdoBq6k86tKCcS7866cL8UFdDUMry9sYca+PmRQc21ptYsDqARvvDysVIrUgiS1uNByrcR4d0oJxG0wCyRwqXUtdDRKvkeTamGnNvKSwrdUgFmACNt4Xy2Ui9UwSg6wWtdWWtNXgTYaUpMk0kLJU0usqOMpaS9pai2wtrR6w8X6/VBRfrChIkNVzWG2zGcgjgiSDLGmj9wUpzTVXK27uNGl2thaYgI33u5dFeadEcvoSVsttKUh5QGprSB1aME2z8wSV5VqYScFRuaPgbBEDsAATsJGACnQHcnLzyEAqKUhZmp4lqFlcAzO9NKEczB2wABOw8X77oiBQBhLyKARS3AtPaz4LqFmujceNwdG5AxbMxQAiSEs2pDo9MW5TScv9BCNOzasXzGrgLPlwxgCh4D2GNK+G7Lp+eza17qMPzIzZXR7e5y/ywi6GdB9NPSRAKMzu8vA+X5R3nLqvhh4aIJTLwvsu4TzUcgBtCrseAS0EeHifPd8UXI9w/GImj4AeAWUE9JuFDWHXI5yFAI9HQEkBfZ9BhXHwPpVfJtX3Acyk+b1Pn62LOPV/CSbG3P8F4yHkwyQKwX8AAAAASUVORK5CYII=';
const previewUserAvatar='data:image/png;base64,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';

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
  state.appearance.aiAvatar=previewAiAvatar;
  state.appearance.userAvatar=previewUserAvatar;
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
