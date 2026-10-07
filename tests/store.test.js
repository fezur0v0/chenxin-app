import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, loadState, saveState, newSession, addDraftMessage, exportData, STORAGE_KEY } from '../src/store.js';
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
 const data = JSON.parse(exportData(s)); assert.equal(data.version,1); assert.ok(data.exportedAt); assert.equal('apiKey' in data.provider,false);
});
