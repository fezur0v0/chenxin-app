import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,exportData} from '../src/store.js';
import {createScene,acceptScene,deferScene,addSceneEntry,endScene,normalizeMoom} from '../src/apps/moom/model.js';
import {createMoomPreview} from '../src/apps/moom/preview.js';
import {moom,storyCard} from '../src/apps/moom/view.js';
import {createArchive,inspectArchive,restoreArchive,summarize} from '../src/backup/model.js';
import {homeItemVisible} from '../src/home-layout.js';

test('invitation, defer, acceptance, pause and ending keep one shared scene reference in chat',()=>{
 const state=createState(),scene=createScene(state,{title:'海边',place:'海岸',premise:'一起走走'},{invite:true});
 const invite=state.sessions[0].messages[0];assert.equal(invite.role,'user');assert.equal(invite.storyLink.sceneId,scene.id);
 deferScene(state,scene.id);assert.equal(scene.status,'deferred');acceptScene(state,scene.id);
 const entry=addSceneEntry(state,scene.id,'我看向海面。','act');assert.equal(entry.kind,'act');
 scene.status='paused';assert.throws(()=>addSceneEntry(state,scene.id,'你好','say'),/继续/);acceptScene(state,scene.id);
 endScene(state,scene.id,'一起在海边看了灯塔。');endScene(state,scene.id,'重复结束');
 assert.equal(state.sessions[0].messages.length,2);assert.equal(scene.entries.length,1);assert.equal(scene.summary,'一起在海边看了灯塔。');
 assert.throws(()=>acceptScene(state,scene.id),/已经结束/);
 const roundtrip=normalizeState(JSON.parse(exportData(state)));assert.deepEqual(roundtrip.moom,state.moom);assert.deepEqual(roundtrip.sessions[0].messages.map(m=>m.storyLink),state.sessions[0].messages.map(m=>m.storyLink));
});
test('accepting another invitation pauses the previous active scene and preserves entries',()=>{
 const state=createState(),first=createScene(state,{title:'第一幕'});addSceneEntry(state,first.id,'你好','say');
 const second=createScene(state,{title:'第二幕'},{invite:true});acceptScene(state,second.id);assert.equal(first.status,'paused');assert.equal(first.entries[0].text,'你好');assert.equal(second.status,'active');
 assert.throws(()=>createScene(state,{title:'',sessionId:state.active}),/名字/);assert.throws(()=>createScene(state,{title:'失效',sessionId:'deleted'}),/找不到/);
});
test('legacy layouts put memory on the existing desktop app page; moom stays dock-only',()=>{
 const state=createState();delete state.moom;state.home.pages[1]=state.home.pages[1].filter(id=>id!=='app-memory');
 const restored=normalizeState(state);assert.deepEqual(restored.moom,{active:'',scenes:[]});assert.equal(restored.home.pages.length,2);assert(restored.home.pages[1].includes('app-memory'));assert.equal(homeItemVisible(restored.home,'app-moom'),false);assert.equal(homeItemVisible(restored.home,'app-memory'),true);
});
test('scene normalization rejects unsupported entries, deduplicates IDs and rendering escapes imported markup',()=>{
 const normalized=normalizeMoom({active:'bad',scenes:[null,{id:'one',title:'<script>x</script>',tone:'unsafe',status:'wat',entries:[{id:'x',kind:'act',text:'<img onerror="x">'},{id:'x',kind:'say',text:'duplicate'},{id:'y',kind:'tool',text:'no'}]},{id:'one',title:'duplicate'}]});
 assert.equal(normalized.scenes.length,1);assert.equal(normalized.scenes[0].entries.length,1);assert.equal(normalized.scenes[0].tone,'sea');assert.equal(normalized.active,'');
 const state=createState();state.moom=normalized;state.moom.active='one';const output=moom(state);assert(!output.includes('<script>'));assert(output.includes('&lt;img'));assert(output.includes('&lt;script&gt;'));
 assert(storyCard(state,{storyLink:{kind:'invite',sceneId:'deleted'}}).includes('已不在'));assert.equal(storyCard(state,{}),'');
});
test('complete ZIP and legacy JSON keep scene entries, bookmarks, summary and invitation links',async()=>{
 const state=createState(),scene=createScene(state,{title:'晚间散步'},{invite:true});acceptScene(state,scene.id);const entry=addSceneEntry(state,scene.id,'去看看那边吧。','say');entry.bookmarked=true;endScene(state,scene.id,'一起走了很远。');
 const files={music:async()=>{},voice:async()=>{}},bundle=await createArchive(state,files),preview=await inspectArchive(new File([bundle.blob],'moom.zip'));
 let json='';const restored=await restoreArchive(preview,{stores:files,storage:{setItem:(_,value)=>{json=value;}}});assert.deepEqual(restored.moom,state.moom);assert.deepEqual(JSON.parse(json).moom,state.moom);assert.equal(summarize(restored).sceneEntries,1);assert.equal(restored.sessions[0].messages[1].storyLink.kind,'record');
 const old=await inspectArchive(new File([exportData(state)],'moom.json'));assert.deepEqual(old.state.moom,state.moom);
});
test('explicit moom preview uses separate memory storage and starts with readable labelled samples',()=>{
 const a=createMoomPreview(),b=createMoomPreview(),state=createState();a.seed(state);a.storage.setItem('key','sample');assert.equal(b.storage.getItem('key'),null);
 assert.equal(state.moom.scenes.length,3);assert.equal(state.moom.scenes.find(s=>s.id===state.moom.active).entries.length,5);assert(moom(state,{preview:true}).includes('修改不会影响正式记录'));assert.equal(state.backupSettings.dailyEnabled,false);
});
