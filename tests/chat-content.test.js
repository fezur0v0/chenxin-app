import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,addDraftMessage,changeMessage,exportData} from '../src/store.js';
import {makeReply,normalizeReply,normalizeVoice,messageExcerpt,audioPeaks,formatVoiceTime} from '../src/chat-content/model.js';
import {chat} from '../src/views.js';
import {replyPreview} from '../src/chat-content/view.js';

test('formatted reply snapshots render safely before and after sending and survive original changes',()=>{
 const s=createState(),session=s.sessions[0];
 const source={id:'formatted',role:'assistant',text:'<think>不应出现在引用里</think>\n*轻轻点头* **好呀**\n<live>\nchar：那就慢一点吧。\nuser：好，陪我坐一会儿。\nchar：[语音] 好想见你|6秒\nchar：[图片] <img src=x onerror=alert(1)>\n</live>',time:1,attachments:[]};
 session.messages.push(source);const quote=makeReply(s,source);
 assert.equal(quote.source,source.text);
 const draft=replyPreview(quote,session,{draft:true});
 assert(draft.includes('data-moom-part="action"'));assert(draft.includes('data-moom-part="emphasis"'));
 assert(draft.includes('reply-voice'));assert(draft.includes('语音 · 0:06'));
 assert(draft.includes('那就慢一点吧。'));assert(!draft.includes('&lt;live&gt;'));assert(!draft.includes('char：'));assert(!draft.includes('不应出现在引用里'));
 assert(!draft.includes('<img src=x'));assert(draft.includes('&lt;img src=x'));
 assert(!draft.includes('data-live-voice'));assert(!draft.includes('data-voice-action'));
 const response=addDraftMessage(s,'引用后的回答',[],quote);
 source.text='修改后的正文';session.messages=session.messages.filter(m=>m.id!==source.id);
 const restored=normalizeState(JSON.parse(exportData(s))),reply=restored.sessions[0].messages.find(m=>m.id===response.id).replyTo;
 assert.equal(reply.source,quote.source);assert(chat(restored).includes('那就慢一点吧。'));assert(!chat(restored).includes('&lt;live&gt;'));
 const old={...quote};delete old.source;old.text='<live>\nchar：旧引用内容\nuser：[语音] 你好|3秒';
 assert(replyPreview(old,session).includes('reply-voice'));assert(!replyPreview(old,session).includes('char：'));
 const literal=replyPreview({messageId:'literal',role:'user',text:'<live>char：**只是例子**</live>'},session);
 assert(literal.includes('&lt;live&gt;char：**只是例子**&lt;/live&gt;'));
 assert.equal(normalizeReply({...quote,source:'x'.repeat(13000)}).source.length,12000);
});

test('reply snapshots survive edits, branches, deletions and backup without copying image bytes',()=>{
 const s=createState(),source=addDraftMessage(s,'原来的内容',[{name:'图',data:'data:image/png;base64,AAAA'}]);
 const quote=makeReply(s,source),reply=addDraftMessage(s,'回复',[],quote);changeMessage(s,source.id,'edit','修改过的内容');
 assert.equal(reply.replyTo.text,'原来的内容');assert.equal('data' in reply.replyTo,false);
 const branch=changeMessage(s,reply.id,'branch');assert.equal(branch.messages[1].replyTo.messageId,source.id);
 changeMessage(s,source.id,'delete');const restored=normalizeState(JSON.parse(exportData(s)));
 assert.equal(restored.sessions[0].messages[0].replyTo.text,'原来的内容');assert(chat(restored).includes('原消息已不在当前对话中'));
});
test('voice metadata and provided transcripts survive backup and message branching; audio bytes stay out of JSON',()=>{
 const s=createState(),m=addDraftMessage(s,'',[{id:'a',name:'hello.wav',kind:'voice',type:'audio/wav',size:1000,voice:{fileId:'voice-file',duration:4.25,peaks:[.1,.5,1],transcript:'你好。'},data:'https://not-loaded.test/audio'}]);
 assert.equal(m.attachments[0].data,'');const branch=changeMessage(s,m.id,'branch');assert.deepEqual(branch.messages[0].attachments,m.attachments);
 const n=normalizeState(JSON.parse(exportData(s)));assert.equal(n.sessions[0].messages[0].attachments[0].voice.transcript,'你好。');assert.equal(n.sessions[0].messages[0].attachments[0].voice.fileId,'voice-file');assert.equal(n.sessions[0].messages[0].attachments[0].voice.duration,4.25);
});
test('new metadata handles malformed backups safely and preserves legacy chat and appearance data',()=>{
 const s=createState();s.home.note='旧便签';const m=addDraftMessage(s,'旧内容');m.replyTo={messageId:'',text:'bad'};m.attachments=[{name:'坏语音',kind:'voice',voice:{fileId:''},data:'javascript:alert(1)'}];
 const n=normalizeState(s);assert.equal(n.sessions[0].messages[0].replyTo,null);assert.equal(n.sessions[0].messages[0].attachments[0].kind,'file');assert.equal(n.sessions[0].messages[0].attachments[0].data,'');assert.equal(n.home.note,'旧便签');assert.deepEqual(n.appearance,s.appearance);
 assert.equal(normalizeReply({messageId:'x'.repeat(101)}),null);assert.equal(normalizeVoice({fileId:'x'.repeat(101)}),null);
 assert.deepEqual(normalizeVoice({fileId:'ok',duration:Infinity,peaks:[NaN,-3,3],transcript:'文本'}),{fileId:'ok',duration:0,peaks:[0,1],transcript:'文本'});
});
test('thinking controls only appear for assistant summaries or explicit thinking state; times use real metadata',()=>{
 const s=createState();s.sessions[0].messages=[{id:'no',role:'assistant',text:'正文',time:1,attachments:[]}];assert(!chat(s).includes('class="reasoning-trigger'));
 s.sessions[0].messages[0].reasoningSummary='<script>摘要</script>\n\n第二段';s.sessions[0].messages[0].reasoningDurationMs=1250;
 const n=normalizeState(s),html=chat(n,{tray:'reasoning',messageId:'no'});assert(html.includes('1.3s'));assert(html.includes('&lt;script&gt;摘要'));assert(!html.includes('<script>'));assert(html.includes('<p>第二段</p>'));
 s.sessions[0].messages[0].reasoningSummary='';s.sessions[0].messages[0].reasoningStatus='thinking';assert(chat(s).includes('正在思考'));assert(!chat(s).includes('<time>'));
});
test('voice waveforms derive from real channel samples, including silence and stereo peaks',()=>{
 const buffer={numberOfChannels:2,length:8,getChannelData:i=>i?new Float32Array([0,.5,0,0,0,0,1,0]):new Float32Array(8)};
 assert.deepEqual(audioPeaks(buffer,4),[.5,0,0,1]);assert.deepEqual(audioPeaks({numberOfChannels:1,length:8,getChannelData:()=>new Float32Array(8)},4),[0,0,0,0]);
 assert.equal(formatVoiceTime(65.9),'1:05');assert.equal(formatVoiceTime(NaN),'0:00');
});
test('voice and image quotations render safely without image captions or invented transcription',()=>{
 const s=createState(),image=addDraftMessage(s,'',[{name:'照片名称',data:'data:image/png;base64,AAAA'}]);const quote=makeReply(s,image);addDraftMessage(s,'引用图片',[],quote);
 assert.equal(quote.kind,'image');assert.equal(messageExcerpt(image),'[图片]');assert(chat(s).includes('alt="引用图片"'));assert(!chat(s).includes('<span>照片名称'));
 addDraftMessage(s,'',[{id:'voice',name:'voice.wav',kind:'voice',voice:{fileId:'v',duration:5,peaks:[0,.5,1],transcript:''}}]);const html=chat(s);assert(html.includes('data-voice-key='));assert(html.includes('aria-label="语音进度"'));assert(!html.includes('voice-transcript-toggle'));
});
test('live rows omit side avatars while the header keeps a saved portrait',()=>{
 const s=createState(),jpeg='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==',png='data:image/png;base64,iVBORw0KGgo=';
 s.appearance.aiAvatar=jpeg;s.appearance.userAvatar=png;
 s.sessions[0].messages=[{id:'live',role:'assistant',text:'<live>\nchar：那就慢一点吧。\nuser：好，陪我坐一会儿。\n</live>',time:1,attachments:[]}];
 const n=normalizeState(JSON.parse(exportData(s))),html=chat(n);
 assert.equal(n.appearance.aiAvatar,jpeg);assert.equal(n.appearance.userAvatar,png);
 assert(!html.includes('conversation-live-avatar'));
 assert(html.includes('那就慢一点吧'));assert(html.includes('好，陪我坐一会儿'));
 assert(html.includes(`class="avatar peer-avatar"><img src="${jpeg}" alt="AI头像">`));
 n.appearance.aiAvatar='';n.appearance.userAvatar='';
 const empty=chat(n);
 assert(empty.includes('class="avatar peer-avatar"><span>尘</span>'));
 assert(!empty.includes('conversation-live-avatar'));
});
