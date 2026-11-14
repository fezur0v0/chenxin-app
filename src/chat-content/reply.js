import {escape} from '../ui.js';
import {icon} from '../icons.js';
import {splitLiveReply} from './live.js';
import {splitMoomContent,renderMoomInline} from '../apps/moom/message.js';

// Quotes are static previews, never nested playback buttons or menus.
// Use the same parsers as the conversation and escape all model-provided text.
export function renderReplyContent(reply,fallback=''){
 const source=reply.source||reply.text||fallback;
 if(reply.role!=='assistant')return escape(source);
 return splitLiveReply(splitMoomContent(source).body).map(part=>{
  let body;
  if(part.kind==='offline')body=renderMoomInline(part.text);
  else if(part.kind==='voice')body=`<span class="reply-media">${icon('mic')}语音 · ${Math.floor(part.seconds/60)}:${String(part.seconds%60).padStart(2,'0')}</span>`;
  else if(part.kind==='image')body=`<span class="reply-media">${icon('image')}图片</span>${part.text?`<span class="reply-caption">${escape(part.text)}</span>`:''}`;
  else if(part.kind==='transfer')body=`<span class="reply-media">转账 ${escape(part.amount)}</span>${part.note?`<span class="reply-caption">${escape(part.note)}</span>`:''}`;
  else if(part.kind==='quote')body=`<span class="reply-nested">${escape(part.quote)}</span>${escape(part.text)}`;
  else body=escape(part.text);
  return `<span class="reply-part reply-${part.kind}${part.role==='user'?' is-user':''}">${body}</span>`;
 }).join('');
}
