import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,addDraftMessage,changeMessage,exportData} from '../src/store.js';
import {makeReply,normalizeReply,normalizeVoice,messageExcerpt,audioPeaks,formatVoiceTime} from '../src/chat-content/model.js';
import {chat} from '../src/views.js';

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
