import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatPreview} from '../src/chat-content/preview.js';
import {createState,normalizeState,exportData,saveState,loadState} from '../src/store.js';

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
 saveState(first.storage,state);assert.equal(loadState(first.storage).sessions[0].messages.length,4);
 assert.equal(loadState(second.storage).sessions[0].messages.length,0);
 const fileId=state.sessions[0].messages.flatMap(m=>m.attachments).find(a=>a.voice).voice.fileId;
 assert(await first.files(fileId));assert.equal(await second.files(fileId),undefined);
 const replacement=new File(['preview'],'local.wav',{type:'audio/wav'});
 await second.files(fileId,replacement);await first.files(fileId,null);
 assert.equal(await second.files(fileId),replacement);assert.equal(await first.files(fileId),undefined);
});
