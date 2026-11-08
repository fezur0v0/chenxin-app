import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatPreview} from '../src/chat-content/preview.js';
import {createState,normalizeState,exportData,saveState,loadState} from '../src/store.js';
import {chat} from '../src/views.js';

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

test('style preview live rows have no side avatars, while the header still shows the peer portrait',()=>{
 const preview=createChatPreview(),state=createState();preview.seed(state);
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.equal(restored.appearance.aiAvatar,'');assert.equal(restored.appearance.userAvatar,'');
 const html=chat(restored);
 assert(html.includes('那就慢一点吧'));assert(html.includes('好，陪我坐一会儿'));
 assert(!html.includes('conversation-live-avatar'));
 assert(html.includes('class="avatar peer-avatar"><span>尘</span>'));
 const jpeg='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==';
 restored.appearance.aiAvatar=jpeg;
 const withPhoto=chat(restored);
 assert(withPhoto.includes(`class="avatar peer-avatar"><img src="${jpeg}" alt="AI头像">`));
 assert(!withPhoto.includes('conversation-live-avatar'));
});
