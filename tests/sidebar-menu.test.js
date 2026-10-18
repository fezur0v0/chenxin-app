import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,exportData,newSession,orderedSessions} from '../src/store.js';
import {createScene,orderedScenes} from '../src/apps/moom/model.js';
import {manageSidebarItem} from '../src/sidebar-menu/model.js';
import {sidebarItemMenu} from '../src/sidebar-menu/view.js';
import {sidebar} from '../src/views.js';
import {scenesSidebar,storyCard} from '../src/apps/moom/view.js';

test('scene pin and rename preserve activity date and persist through normalization and JSON',()=>{
 const state=createState(),first=createScene(state,{title:'海边'}),second=createScene(state,{title:'窗边'});first.updated=1000;second.updated=2000;
 manageSidebarItem(state,'scene',first.id,'pin');manageSidebarItem(state,'scene',first.id,'rename','  风里的海岸  ');
 assert.equal(first.title,'风里的海岸');assert.equal(first.updated,1000);assert.equal(orderedScenes(state.moom)[0].id,first.id);
 const restored=normalizeState(JSON.parse(exportData(state)));assert.equal(restored.moom.scenes.find(s=>s.id===first.id).pinned,true);
 assert.deepEqual(restored.moom,state.moom);manageSidebarItem(restored,'scene',first.id,'pin');assert.equal(orderedScenes(restored.moom)[0].id,second.id);
});
test('deleting a scene preserves chat and links, chooses an existing scene and handles the final scene',()=>{
 const state=createState(),first=createScene(state,{title:'邀请'},{invite:true}),second=createScene(state,{title:'正在进行'});state.moom.active=first.id;
 const messages=structuredClone(state.sessions[0].messages);manageSidebarItem(state,'scene',first.id,'delete');assert.equal(state.moom.active,second.id);assert.deepEqual(state.sessions[0].messages,messages);assert(storyCard(state,messages[0]).includes('已不在'));
 manageSidebarItem(state,'scene',second.id,'delete');assert.deepEqual(state.moom,{active:'',scenes:[]});
});
test('session pin rename and delete keep scenes and memories, repair active session and retain a last empty chat',()=>{
 const state=createState(),original=state.sessions[0],scene=createScene(state,{title:'留下的剧情'});state.memories=[{id:'memory',title:'记得',content:'内容'}];const second=newSession(state);second.created=original.created+1000;
 manageSidebarItem(state,'session',original.id,'pin');assert.equal(orderedSessions(state)[0].id,original.id);manageSidebarItem(state,'session',original.id,'rename','新名字');assert.equal(original.title,'新名字');
 manageSidebarItem(state,'session',second.id,'delete');assert.equal(state.active,original.id);manageSidebarItem(state,'session',original.id,'delete');assert.equal(state.sessions.length,1);assert.notEqual(state.sessions[0].id,original.id);assert.equal(state.active,state.sessions[0].id);assert.equal(state.moom.scenes[0].id,scene.id);assert.equal(state.memories.length,1);
});
test('shared sidebar menu escapes names, rejects empty renames and exposes long-press rows without inline controls',()=>{
 const state=createState(),scene=createScene(state,{title:'<script>test</script>'});state.home.userName='欣欣';
 const before=structuredClone(state);assert.throws(()=>manageSidebarItem(state,'scene',scene.id,'rename','  '),/不能为空/);assert.deepEqual(state,before);assert.throws(()=>manageSidebarItem(state,'scene','missing','pin'),/不存在/);
 const sheet=sidebarItemMenu('scene',scene);assert(sheet.includes('&lt;script&gt;'));assert(!sheet.includes('<script>'));assert(sheet.includes('data-item-menu-action="pin"'));assert(sheet.includes('data-item-menu-action="rename"'));assert(sheet.includes('data-item-menu-action="delete"'));
 const moom=scenesSidebar(state),chat=sidebar(state,'chat');assert(moom.includes('<strong>欣欣</strong>'));assert(!moom.includes('moom-tone-dot'));assert(!moom.includes('进行中'));assert(moom.includes('data-sidebar-kind="scene"'));assert(chat.includes('data-sidebar-kind="session"'));assert(!chat.includes('conversation-actions'));assert(!chat.includes('data-action="pin-session"'));assert(!chat.includes('data-action="delete-session"'));
});
