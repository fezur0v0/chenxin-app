import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,daysTogether,saveMemory,isExpired,loadState,saveState,STORAGE_KEY} from '../src/store.js';
import {home,chat,settings,memory,memoryEditor} from '../src/views.js';
test('v1 migration keeps existing messages and introduces appearance, widgets, memories',()=>{
 const state=createState();state.version=1;delete state.appearance;delete state.home;delete state.memories;
 state.sessions[0].messages.push({id:'message',role:'user',text:'原来的聊天',time:123});
 const migrated=normalizeState(state);
 assert.equal(migrated.sessions[0].messages[0].text,'原来的聊天');assert.equal(migrated.version,2);assert.equal(migrated.home.widgets.length,4);assert.deepEqual(migrated.memories,[]);
});
test('anniversary day counts use calendar dates, include start date, and reject invalid dates',()=>{
 assert.equal(daysTogether('2026-10-07',new Date(2026,9,7,23)),1);
 assert.equal(daysTogether('2026-10-06',new Date(2026,9,7)),2);
 assert.equal(daysTogether('2024-02-29',new Date(2024,2,1)),2);
 assert.equal(daysTogether('2026-02-30'),null);
});
test('short memories expire without deletion, permanent memories have no expiry',()=>{
 const state=createState(),short=saveMemory(state,{title:'短期',content:'内容',kind:'short',days:1}),permanent=saveMemory(state,{title:'永久',content:'内容',kind:'permanent'});
 assert.equal(isExpired(short,short.expires-1),false);assert.equal(isExpired(short,short.expires),true);
 assert.equal(isExpired(permanent,short.expires+1e10),false);assert.equal(permanent.expires,null);assert.equal(state.memories.length,2);
 saveMemory(state,{id:short.id,title:'编辑',content:'新的内容',kind:'permanent'});assert.equal(state.memories.length,2);assert.equal(state.memories.find(m=>m.id===short.id).kind,'permanent');
});
test('customizations, widget order and memories survive reload; unsafe appearance is ignored',()=>{
 const state=createState();state.appearance.accent='#9e83a4';state.home.widgets.reverse();state.home.widgets[0].enabled=false;state.home.note='我的便签';saveMemory(state,{title:'收藏',content:'记忆内容',kind:'permanent'});
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};saveState(storage,state);const loaded=loadState(storage);
 assert.equal(loaded.home.note,'我的便签');assert.equal(loaded.home.widgets[0].type,'memory');assert.equal(loaded.home.widgets[0].enabled,false);assert.equal(loaded.memories[0].content,'记忆内容');
 state.appearance.wallpaper='javascript:alert(1)';state.appearance.accent='red; position:fixed';saveState(storage,state);const safe=loadState(storage);assert.equal(safe.appearance.wallpaper,'');assert.equal(safe.appearance.accent,'#7a879a');
});
test('all view templates render custom state; text remains escaped and hidden widgets stay hidden',()=>{
 const state=createState();state.persona.name='<script>alert(1)</script>';state.home.note='<img src=x>';state.home.widgets.find(w=>w.type==='date').enabled=false;
 const markup=home(state);assert.ok(!markup.includes('date-widget'));assert.ok(markup.includes('&lt;img src=x&gt;'));assert.ok(!markup.includes('<script>'));
 assert.ok(chat(state).includes('聊天记录'));assert.ok(settings(state).includes('MCP 与插件'));
 saveMemory(state,{title:'记忆',content:'<script>bad</script>',kind:'permanent'});assert.ok(memory(state,'permanent').includes('&lt;script&gt;'));assert.ok(memoryEditor(state.memories[0]).includes('memory-form'));
});
test('invalid import is rejected instead of replacing data silently',()=>{
 assert.throws(()=>normalizeState({version:2,sessions:[]}),/备份/);
 const state=createState();state.sessions.push({...state.sessions[0]});assert.throws(()=>normalizeState(state),/会话/);
});
