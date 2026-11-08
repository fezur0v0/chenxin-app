import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatPreview} from '../src/chat-content/preview.js';
import {createState,normalizeState,exportData,saveState,loadState} from '../src/store.js';
import {avatar} from '../src/ui.js';
import {chat,home} from '../src/views.js';

test('chat preview backups preserve usable quotes and playable audio metadata',async()=>{
 const preview=createChatPreview(),state=createState();preview.seed(state);
 const restored=normalizeState(JSON.parse(exportData(state))),messages=restored.sessions[0].messages;
 const reply=messages.find(m=>m.replyTo),source=messages.find(m=>m.id===reply.replyTo.messageId);
 assert.equal(reply.replyTo.text,source.text);
 const attachment=messages.flatMap(m=>m.attachments).find(a=>a.kind==='voice');
 const file=await preview.files(attachment.voice.fileId),wav=new DataView(await file.arrayBuffer());
 assert.equal(file.type,'audio/wav');
 const seconds=wav.getUint32(40,true)/wav.getUint32(28,true);
 assert.equal(seconds,attachment.voice.duration);
 assert(attachment.voice.peaks.some(p=>p>0));
 assert(attachment.voice.peaks.every(p=>p>=0&&p<=1));
});

test('preview changes and file removals stay isolated across preview instances',async()=>{
 const first=createChatPreview(),second=createChatPreview(),state=createState();first.seed(state);
 saveState(first.storage,state);assert.equal(loadState(first.storage).sessions[0].messages.length,5);
 assert.equal(loadState(second.storage).sessions[0].messages.length,0);
 const fileId=state.sessions[0].messages.flatMap(m=>m.attachments).find(a=>a.voice).voice.fileId;
 assert(await first.files(fileId));assert.equal(await second.files(fileId),undefined);
 const replacement=new File(['preview'],'local.wav',{type:'audio/wav'});
 await second.files(fileId,replacement);await first.files(fileId,null);
 assert.equal(await second.files(fileId),replacement);assert.equal(await first.files(fileId),undefined);
});

test('style preview keeps portrait photos beside live bubbles, and letters only when an avatar is empty',()=>{
 const preview=createChatPreview(),state=createState();preview.seed(state);
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.match(restored.appearance.aiAvatar,/^data:image\/png;base64,[a-z\d+/=]+$/i);
 assert.match(restored.appearance.userAvatar,/^data:image\/png;base64,[a-z\d+/=]+$/i);
 assert.notEqual(restored.appearance.aiAvatar,restored.appearance.userAvatar);
 const html=chat(restored),portrait=(who,src)=>`class="avatar conversation-live-avatar"><img src="${src}" alt="${who==='ai'?'AI':'用户'}头像">`;
 assert(html.includes(portrait('ai',restored.appearance.aiAvatar)));
 assert(html.includes(portrait('user',restored.appearance.userAvatar)));
 assert(html.includes(`class="avatar peer-avatar"><img src="${restored.appearance.aiAvatar}" alt="AI头像">`));
 assert(home(restored).includes(`src="${restored.appearance.aiAvatar}"`));
 assert(home(restored).includes(`src="${restored.appearance.userAvatar}"`));
 assert(!html.includes('class="avatar conversation-live-avatar"><span>'));
 restored.appearance.aiAvatar='';restored.appearance.userAvatar='';
 assert.equal(avatar(restored,'ai','conversation-live-avatar'),'<span class="avatar conversation-live-avatar"><span>尘</span></span>');
 assert.equal(avatar(restored,'user','conversation-live-avatar'),'<span class="avatar conversation-live-avatar"><span>我</span></span>');
 const empty=chat(restored);
 assert(empty.includes('class="avatar conversation-live-avatar"><span>尘</span>'));
 assert(empty.includes('class="avatar conversation-live-avatar"><span>我</span>'));
 assert(!empty.includes('class="avatar conversation-live-avatar"><img'));
});
