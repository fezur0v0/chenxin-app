import {escape} from '../ui.js';
import {icon} from '../icons.js';
import {musicIcon} from '../apps/music/icons.js';
import {drawerHeader} from '../drawer.js';
import {formatVoiceTime,messageExcerpt} from './model.js';
export function reasoningTrigger(message){
 if(message.role!=='assistant'||(!message.reasoningSummary?.trim()&&message.reasoningStatus!=='thinking'))return '';
 const thinking=message.reasoningStatus==='thinking',duration=Number.isFinite(message.reasoningDurationMs)?`${Math.round(message.reasoningDurationMs/100)/10}s`:'';
 return `<button class="reasoning-trigger ${thinking?'is-thinking':''}" data-action="show-reasoning" data-id="${escape(message.id)}" ${!message.reasoningSummary?.trim()?'disabled':''} aria-label="${thinking?'正在思考':'查看思考摘要'}">${icon('memory')}<span>${thinking?'正在思考':'思考摘要'}</span>${!thinking&&duration?`<time>${duration}</time>`:''}${message.reasoningSummary?.trim()?icon('chevron'):''}</button>`;
}
export function reasoningSheet(message){
 const summary=message?.reasoningSummary?.trim(),duration=Number.isFinite(message?.reasoningDurationMs)?`${Math.round(message.reasoningDurationMs/100)/10}s`:'';
 return `<section class="chat-tray glass bottom-sheet reasoning-tray" role="dialog" aria-modal="true" tabindex="-1" aria-label="思考摘要">${drawerHeader({title:'思考摘要',heading:'<span class="sr-only">思考摘要</span>'})}<div class="reasoning-intro"><span class="reasoning-mark">${icon('memory')}</span><div><span class="chat-eyebrow">A LITTLE THOUGHT</span><h2>思考摘要${duration?`<time>${duration}</time>`:''}</h2></div>${summary?'<button data-action="copy-reasoning" class="reasoning-copy">复制</button>':''}</div><div class="reasoning-content">${summary?summary.split(/\n\s*\n/).map(p=>`<p>${escape(p)}</p>`).join(''):'<p class="hint">还没有可展示的思考摘要。</p>'}</div><p class="reasoning-footnote">仅展示模型提供的摘要</p></section>`;
}
export function replyPreview(reply,session,{draft=false}={}){
 if(!reply)return '';
 const original=session.messages.find(m=>m.id===reply.messageId),image=original?.attachments?.find(a=>a.data)?.data;
 const body=`<span class="reply-body"><strong>${escape(reply.author||(reply.role==='assistant'?'对方':'我'))}</strong><span>${escape(reply.text||messageExcerpt(original||{}))}</span>${!original?'<small>原消息已不在当前对话中</small>':''}</span>${reply.kind==='image'&&image?`<img src="${escape(image)}" alt="引用图片" referrerpolicy="no-referrer">`:''}`;
 if(draft)return `<div class="reply-compose" aria-label="正在引用消息"><div class="reply-snippet">${body}</div><button type="button" data-action="cancel-reply" aria-label="取消引用">取消</button></div>`;
 return `<button type="button" class="message-reply ${original?'':'is-unavailable'}" data-action="jump-reply" data-id="${escape(reply.messageId)}" ${original?'':'disabled'} aria-label="${original?'定位引用的消息':'引用的原消息已不在当前对话中'}">${body}</button>`;
}
export function voiceMessage(attachment,message){
 const voice=attachment.voice;if(!voice)return '';
 const key=`${message.id}/${attachment.id}`,width=Math.round(220+Math.min(60,voice.duration)*1.05),peaks=voice.peaks.length?voice.peaks:Array(32).fill(0);
 const bars=peaks.map((peak,i)=>{const h=3+Math.round(peak*25);return `<rect x="${i*160/peaks.length}" y="${(36-h)/2}" width="2.4" height="${h}" rx="1.2"/>`;}).join(''),wave=`<svg viewBox="0 0 160 36" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
 return `<section class="voice-message" data-voice-key="${escape(key)}" data-voice-file="${escape(voice.fileId)}" data-voice-duration="${voice.duration}" style="--voice-width:${width}px" aria-label="语音消息 ${formatVoiceTime(voice.duration)}"><div class="voice-player"><button type="button" class="voice-play" data-voice-action="play" aria-label="播放语音" aria-pressed="false">${musicIcon('play')}</button><label class="voice-seek"><span class="voice-wave" aria-hidden="true">${wave}<span class="voice-wave-fill">${wave}</span></span><input type="range" data-voice-seek min="0" max="${voice.duration||1}" step="0.1" value="0" aria-label="语音进度" aria-valuetext="0:00 / ${formatVoiceTime(voice.duration)}"></label><time class="voice-time">${formatVoiceTime(voice.duration)}</time></div>${voice.transcript?.trim()?`<button class="voice-transcript-toggle" data-voice-action="transcript" aria-expanded="false">文字 ${icon('down')}</button><p class="voice-transcript" hidden>${escape(voice.transcript)}</p>`:''}<div class="voice-status" role="status" hidden></div><button type="button" class="voice-relink" data-voice-action="relink" hidden>重新选择原音频</button></section>`;
}
export function messageAttachments(items,message){
 return (items||[]).map(a=>a.kind==='voice'?voiceMessage(a,message):`<div class="attachment">${a.data?`<img src="${escape(a.data)}" alt="${escape(a.note||a.name)}" referrerpolicy="no-referrer">`:`${icon('file')}<span>${escape(a.name)}<small>仅保存文件信息</small></span>`}</div>`).join('');
}
