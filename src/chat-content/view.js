import {escape} from '../ui.js';
import {icon} from '../icons.js';
import {musicIcon} from '../apps/music/icons.js';
import {drawerHeader} from '../drawer.js';
import {formatVoiceTime,messageExcerpt} from './model.js';
import {renderReplyContent} from './reply.js';
import {transferStatus} from './transfers.js';
export function reasoningTrigger(message){
 if(message.role!=='assistant'||(!message.reasoningSummary?.trim()&&message.reasoningStatus!=='thinking'))return '';
 const thinking=message.reasoningStatus==='thinking',duration=Number.isFinite(message.reasoningDurationMs)?`${Math.round(message.reasoningDurationMs/100)/10}s`:'';
 return `<button class="reasoning-trigger ${thinking?'is-thinking':''}" data-action="show-reasoning" data-id="${escape(message.id)}" ${!message.reasoningSummary?.trim()?'disabled':''} aria-label="${thinking?'正在思考':'查看思考摘要'}">${icon('memory')}<span>${thinking?'正在思考':'思考摘要'}</span>${!thinking&&duration?`<time>${duration}</time>`:''}${message.reasoningSummary?.trim()?icon('chevron'):''}</button>`;
}
export function reasoningSheet(message){
 const summary=message?.reasoningSummary?.trim(),duration=Number.isFinite(message?.reasoningDurationMs)?`${Math.round(message.reasoningDurationMs/100)/10}s`:'';
 return `<section class="chat-tray glass bottom-sheet reasoning-tray" role="dialog" aria-modal="true" tabindex="-1" aria-label="思考摘要">${drawerHeader({title:'思考摘要',heading:'<span class="sr-only">思考摘要</span>'})}<div class="drawer-scroll"><div class="reasoning-intro"><span class="reasoning-mark">${icon('memory')}</span><div><span class="chat-eyebrow">A LITTLE THOUGHT</span><h2>思考摘要${duration?`<time>${duration}</time>`:''}</h2></div>${summary?'<button data-action="copy-reasoning" class="reasoning-copy">复制</button>':''}</div><div class="reasoning-content">${summary?summary.split(/\n\s*\n/).map(p=>`<p>${escape(p)}</p>`).join(''):'<p class="hint">还没有可展示的思考摘要。</p>'}</div><p class="reasoning-footnote">仅展示模型提供的摘要</p></div></section>`;
}
export function replyPreview(reply,session,{draft=false}={}){
 if(!reply)return '';
 const original=session.messages.find(m=>m.id===reply.messageId),image=original?.attachments?.find(a=>a.data)?.data;
 const body=`<span class="reply-body"><strong>${escape(reply.author||(reply.role==='assistant'?'对方':'我'))}</strong><span class="reply-rendered">${renderReplyContent(reply,messageExcerpt(original||{}))}</span>${!original?'<small>原消息已不在当前对话中</small>':''}</span>${reply.kind==='image'&&image?`<img src="${escape(image)}" alt="引用图片" referrerpolicy="no-referrer">`:''}`;
 if(draft)return `<div class="reply-compose" aria-label="正在引用消息"><div class="reply-snippet quote-box">${body}</div><button type="button" data-action="cancel-reply" aria-label="取消引用">${icon('close')}</button></div>`;
 return `<button type="button" class="message-reply quote-box ${original?'':'is-unavailable'}" data-action="jump-reply" data-id="${escape(reply.messageId)}" ${original?'':'disabled'} aria-label="${original?'定位引用的消息':'引用的原消息已不在当前对话中'}">${body}</button>`;
}
function waveHeights(peaks,count=14){
 const source=peaks?.length?peaks:Array.from({length:count},()=>.4);
 return Array.from({length:count},(_,i)=>5+Math.round(Math.min(1,source[Math.min(source.length-1,Math.floor(i*source.length/count))]||0)*15));
}
function waveMarkup(heights){
 const bars=heights.map(h=>`<i style="--h:${h}px"></i>`).join('');
 return `<span class="voice-wave" aria-hidden="true">${bars}<span class="voice-wave-fill">${bars}</span></span>`;
}
const liveWave=[6,12,18,10,16,8,14,7,11,15,9,13];
function formatTransferAmount(raw){
 const value=String(raw??'').trim(),cleaned=value.replace(/[¥￥,\s]/g,'');
 if(/^\d+(\.\d+)?$/.test(cleaned))return `¥${Number(cleaned).toFixed(2)}`;
 return value||'¥0.00';
}
function quotedName(state,role){
 return role==='user'?(state.persona?.name||'对方'):(state.home?.userName||'我');
}
export function renderLiveRow(part,state,{message,index,receipt=false}={}){
 if(part.kind==='transfer')part={...part,status:transferStatus(message,index,part)};
 const user=part.role==='user';
 const read=part.read?'<p class="live-read" data-live-part="read">已读</p>':'';
 const body=part.kind==='voice'?`<button type="button" class="bubble live-voice" data-live-part="voice" data-live-voice aria-label="语音 ${formatVoiceTime(part.seconds)}，长按转文字"><span class="voice-row"><span class="voice-play" aria-hidden="true">${musicIcon('play')}</span>${waveMarkup(liveWave)}<span class="voice-sec">${formatVoiceTime(part.seconds)}</span></span></button>${part.text?`<p class="live-voice-text" data-live-voice-text hidden>${escape(part.text)}</p>`:''}`
  :part.kind==='image'?`<div class="bubble live-image" data-live-part="image">${escape(part.text)}</div>`
  :part.kind==='transfer'?`<div class="live-transfer ${part.status!=='pending'?'is-done':''}" data-live-part="transfer" data-transfer-status="${part.status}"><div class="transfer-head">转账</div><div class="transfer-body"><div class="transfer-mark" aria-hidden="true">$</div><div class="transfer-copy"><div class="transfer-amount">${escape(formatTransferAmount(part.amount))}</div>${part.note?`<div class="transfer-note">${escape(part.note)}</div>`:''}</div></div><div class="transfer-foot">${part.status==='done'?'<span class="transfer-done">已收款</span>':part.status==='refused'?'<span class="transfer-done">已退还</span>':!user&&message&&!receipt?`<button type="button" class="transfer-receive" data-transfer-action="done" data-transfer-message="${escape(message.id)}" data-transfer-index="${index}">收款</button><button type="button" class="transfer-refuse" data-transfer-action="refused" data-transfer-message="${escape(message.id)}" data-transfer-index="${index}">拒收</button>`:'<span class="transfer-done">待收款</span>'}</div></div>`
  :part.kind==='quote'?`<div class="bubble live-quote" data-live-part="quote"><span class="quote-box"><span class="quote-name">${escape(quotedName(state,part.role))}</span><span class="quote-src">${escape(part.quote)}</span></span>${part.text?`<div class="quote-body">${escape(part.text)}</div>`:''}</div>`
  :part.kind==='blocked'?`<div class="block-row"><span class="block-mark" role="img" aria-label="拉黑">!</span><div class="bubble" data-live-part="blocked">${escape(part.text)}</div></div><p class="block-hint">消息已发出，但被对方拉黑了</p>`
  :`<div class="bubble" data-live-part="bubble">${escape(part.text)}</div>`;
 return `<div class="conversation-live-row ${user?'is-user':''}"><div class="live-stack">${body}${read}</div></div>`;
}
export function voiceMessage(attachment,message){
 const voice=attachment.voice;if(!voice)return '';
 const key=`${message.id}/${attachment.id}`,width=Math.round(220+Math.min(60,voice.duration)*1.05);
 return `<section class="voice-message" tabindex="0" data-voice-key="${escape(key)}" data-voice-file="${escape(voice.fileId)}" data-voice-duration="${voice.duration}" style="--voice-width:${width}px" aria-label="语音消息 ${formatVoiceTime(voice.duration)}"><div class="voice-player"><button type="button" class="voice-play" data-voice-action="play" aria-label="播放语音" aria-pressed="false">${musicIcon('play')}</button><label class="voice-seek">${waveMarkup(waveHeights(voice.peaks))}<input type="range" data-voice-seek min="0" max="${voice.duration||1}" step="0.1" value="0" aria-label="语音进度" aria-valuetext="0:00 / ${formatVoiceTime(voice.duration)}"></label><time class="voice-time">${formatVoiceTime(voice.duration)}</time></div>${voice.transcript?.trim()?`<p class="voice-transcript" hidden>${escape(voice.transcript)}</p>`:''}<div class="voice-status" role="status" hidden></div><button type="button" class="voice-relink" data-voice-action="relink" hidden>重新选择原音频</button></section>`;
}
export function messageAttachments(items,message){
 return (items||[]).map(a=>a.kind==='voice'?voiceMessage(a,message):`<div class="attachment">${a.data?`<img src="${escape(a.data)}" alt="${escape(a.note||a.name)}" referrerpolicy="no-referrer">`:`${icon('file')}<span>${escape(a.name)}<small>仅保存文件信息</small></span>`}</div>`).join('');
}
