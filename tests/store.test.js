import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, loadState, saveState, newSession, addDraftMessage, exportData, orderedSessions, STORAGE_KEY } from '../src/store.js';
function storage() { const values = new Map(); return {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}; }
test('conversations remain independent and survive storage round trip', () => {
 const s = createState(), first = s.active, mem = storage();
 addDraftMessage(s,'  第一个对话  '); newSession(s); addDraftMessage(s,'第二个对话');
 saveState(mem,s); const loaded = loadState(mem);
 assert.equal(loaded.sessions.find(x=>x.id===first).messages[0].text,'第一个对话');
 assert.equal(loaded.sessions.find(x=>x.id===loaded.active).messages[0].text,'第二个对话');
 assert.equal(loaded.sessions[0].messages[0].status,'local');
});
test('bad state falls back and stale selection recovers', () => {
 const mem = storage(); mem.setItem(STORAGE_KEY,'bad json'); assert.equal(loadState(mem).sessions.length,1);
 const s = createState(); s.active = 'missing'; saveState(mem,s); assert.equal(loadState(mem).active,s.sessions[0].id);
});
test('empty messages ignored and exports contain no API credential field', () => {
 const s = createState(); assert.equal(addDraftMessage(s,'  '),null);
 const data = JSON.parse(exportData(s)); assert.equal(data.version,2); assert.ok(data.exportedAt); assert.equal('apiKey' in data.provider,false);
});
test('attachment-only messages, model choice and expression collections survive backup round trip',()=>{
 const s=createState(),mem=storage();s.sessions[0].model='chosen-model';
 s.expressions.kaomoji=[{id:'custom',value:'˃ ˄ ˂̥̥',favorite:true,used:123}];
 const image='data:image/png;base64,aGVsbG8=';s.expressions.stickers=[{id:'sticker',value:image,name:'喜欢的图',favorite:true,used:0}];
 const message=addDraftMessage(s,'',[{id:'image',name:'图片',data:image,type:'image/png',size:5},{id:'file',name:'笔记.txt',type:'text/plain',size:10}]);
 assert.equal(message.model,'chosen-model');assert.equal(message.text,'');assert.equal(message.attachments.length,2);
 saveState(mem,JSON.parse(exportData(s)));const loaded=loadState(mem);
 assert.equal(loaded.sessions[0].messages[0].attachments[0].data,image);assert.equal(loaded.sessions[0].model,'chosen-model');assert.equal(loaded.expressions.kaomoji[0].value,'˃ ˄ ˂̥̥');assert.equal(loaded.expressions.stickers[0].value,image);
});
test('unsafe imported attachment images and stickers cannot become executable sources',()=>{
 const s=createState(),mem=storage();s.expressions.stickers=[{id:'bad',value:'javascript:alert(1)',favorite:true}];
 addDraftMessage(s,'test',[{name:'unsafe',data:'data:image/svg+xml;base64,PHN2Zz4='}]);saveState(mem,s);const loaded=loadState(mem);
 assert.equal(loaded.expressions.stickers.length,0);assert.equal(loaded.sessions[0].messages[0].attachments[0].data,'');
});

test('pinned conversations sort before history, search message text and persist through reload',()=>{
 const s=createState(),mem=storage();s.sessions[0].created=100;s.sessions[0].pinned=true;s.sessions[0].title='常见的聊天';
 const newer=newSession(s);newer.created=200;addDraftMessage(s,'想去看海');newer.messages[0].time=200;
 assert.equal(orderedSessions(s)[0].title,'常见的聊天');assert.equal(orderedSessions(s,'看海')[0].id,newer.id);
 saveState(mem,s);assert.equal(loadState(mem).sessions.find(x=>x.title==='常见的聊天').pinned,true);
 s.sessions.find(x=>x.title==='常见的聊天').pinned=false;assert.equal(orderedSessions(s)[0].id,newer.id);assert.equal(orderedSessions(s,'',true)[0].created,100);
});
