import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,exportData} from '../src/store.js';
import {createScene,acceptScene,deferScene,addSceneEntry,endScene,normalizeMoom,saveSceneStatus,saveStatusText} from '../src/apps/moom/model.js';
import {createInvitationPreview} from '../src/apps/moom/preview.js';
import {legacyStory,storyCard} from '../src/apps/moom/view.js';
import {sceneInvitation} from '../src/apps/moom/invitation.js';
import {invitationEnvelope,invitationLetter} from '../src/components/invitation/view.js';
import {createArchive,inspectArchive,restoreArchive,summarize} from '../src/backup/model.js';
import {homeItemVisible} from '../src/home-layout.js';

test('invitation, defer, acceptance, pause and ending keep one shared scene reference in chat',()=>{
 const state=createState(),scene=createScene(state,{title:'海边',place:'海岸',premise:'一起走走'},{invite:true});
 const invite=state.sessions[0].messages[0];assert.equal(invite.role,'user');assert.equal(invite.storyLink.sceneId,scene.id);
 const props=sceneInvitation(state,scene,invite);assert.equal(props.sender.name,state.home.userName);assert.equal(props.recipient.name,state.persona.name);
 const card=storyCard(state,invite);assert(card.includes('data-invitation-action="open"'));assert(!card.includes('轻触拆信'));assert(!card.includes('data-moom-action="accept"'));
 const letter=invitationLetter(props);assert(letter.includes('>wait</button>'));assert(letter.includes('>Readily</button>'));
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
test('old desktop layouts preserve memory data and hide its former desktop shortcut',()=>{
 const state=createState(),original=state.home.pages[1].slice();
 state.home.pages[1].splice(2,0,'app-moom','app-memory');
 const restored=normalizeState(state);
 assert.deepEqual(restored.home.pages[1],[...original.slice(0,2),'app-memory',...original.slice(2)]);
 assert.equal(homeItemVisible(restored.home,'app-moom'),false);
 assert.equal(homeItemVisible(restored.home,'app-memory'),false);
});
test('scene normalization rejects unsupported entries, deduplicates IDs and rendering escapes imported markup',()=>{
 const normalized=normalizeMoom({active:'bad',scenes:[null,{id:'one',title:'<script>x</script>',tone:'unsafe',status:'wat',entries:[{id:'x',kind:'act',text:'<img onerror="x">'},{id:'x',kind:'say',text:'duplicate'},{id:'y',kind:'tool',text:'no'}]},{id:'one',title:'duplicate'}]});
 assert.equal(normalized.scenes.length,1);assert.equal(normalized.scenes[0].entries.length,1);assert.equal(normalized.scenes[0].tone,'sea');assert.equal(normalized.active,'');assert.deepEqual(normalized.scenes[0].statusPanel,{weather:'',mood:'',condition:''});
 const state=createState();state.moom=normalized;state.moom.active='one';const output=legacyStory(state,state.moom.active);assert(!output.includes('<script>'));assert(output.includes('&lt;img'));assert(output.includes('&lt;script&gt;'));
 assert(storyCard(state,{storyLink:{kind:'invite',sceneId:'deleted'}}).includes('已不在'));assert.equal(storyCard(state,{}),'');
});
test('complete ZIP and legacy JSON keep scene entries, bookmarks, summary and invitation links',async()=>{
 const state=createState(),scene=createScene(state,{title:'晚间散步'},{invite:true});scene.pinned=true;saveStatusText(state,scene.id,'assistant','<script>一起走走</script>');saveStatusText(state,scene.id,'user','慢慢来。');acceptScene(state,scene.id);saveSceneStatus(state,scene.id,{place:'海边',timeLabel:'夜晚',weather:'微风',mood:'平静',condition:'把外套搭在臂弯里。'});const entry=addSceneEntry(state,scene.id,'去看看那边吧。','say');entry.bookmarked=true;endScene(state,scene.id,'一起走了很远。');
 const files={music:async()=>{},voice:async()=>{}},bundle=await createArchive(state,files),preview=await inspectArchive(new File([bundle.blob],'moom.zip'));
 let json='';const restored=await restoreArchive(preview,{stores:files,storage:{setItem:(_,value)=>{json=value;}}});assert.deepEqual(restored.moom,state.moom);assert.deepEqual(JSON.parse(json).moom,state.moom);assert.equal(summarize(restored).sceneEntries,1);assert.equal(restored.sessions[0].messages[1].storyLink.kind,'record');
 const old=await inspectArchive(new File([exportData(state)],'moom.json'));assert.deepEqual(old.state.moom,state.moom);
});
test('the invitation preview uses isolated storage and opens an old story',()=>{
 const a=createInvitationPreview(),b=createInvitationPreview(),state=createState();
 a.seed(state);a.storage.setItem('key','sample');assert.equal(b.storage.getItem('key'),null);
 const scene=state.moom.scenes[0];
 assert(legacyStory(state,scene.id).includes('今晚，去看海吧。'));
 assert(!legacyStory(state,scene.id).includes('moom-compose'));
 assert.equal(state.backupSettings.dailyEnabled,false);
});
test('editable status text is role-specific, bounded, escaped, and never rewrites message timestamps',()=>{
 const state=createState(),scene=createScene(state,{title:'状态文字'}),entry=addSceneEntry(state,scene.id,'你好。','say'),time=entry.time;
 saveStatusText(state,scene.id,'assistant','<img src=x onerror=alert(1)>');saveStatusText(state,scene.id,'user','我'.repeat(700));
 assert.equal(scene.statusText.user.length,500);assert.equal(entry.time,time);assert.throws(()=>saveStatusText(state,scene.id,'tool','错误角色'),/有效/);
 const output=legacyStory(state,state.moom.active);assert(!output.includes('<img src=x'));assert(output.includes('data-moom-part="custom-text"'));
 scene.entries.push({...entry,id:'assistant',kind:'narration'});assert(legacyStory(state,state.moom.active).includes('&lt;img src=x'));
 const restored=normalizeState(JSON.parse(exportData(state)));assert.deepEqual(restored.moom.scenes[0].statusText,scene.statusText);
 delete scene.statusText;assert.deepEqual(normalizeMoom(state.moom).scenes[0].statusText,{assistant:'',user:''});
});

test('invitation presentation escapes imported content, rejects nonlocal avatar markup, and preserves actual source roles',()=>{
 const state=createState(),scene=createScene(state,{title:'<script>标题</script>',premise:'<img onerror=x>',timeLabel:'<b>20:30</b>'},{invite:true,assistant:true});
 state.persona.name='凛<svg>';state.appearance.aiAvatar='javascript:alert(1)';
 const data=sceneInvitation(state,scene);assert.equal(data.sender.name,state.persona.name);assert.equal(data.recipient.name,state.home.userName);
 for(const output of [invitationEnvelope(data),invitationLetter(data)]){assert(!output.includes('<script>'));assert(!output.includes('<svg>'));assert(!output.includes('javascript:'));}
 assert(invitationLetter(data).includes('&lt;img onerror=x&gt;'));assert.equal(scene.premise,'<img onerror=x>');
 scene.status='ended';assert(invitationLetter(sceneInvitation(state,scene)).includes('重读这一幕'));
 const preview=createInvitationPreview(),sample=createState();preview.seed(sample);assert.equal(sample.moom.scenes.find(s=>s.id===sample.moom.active).status,'invited');assert.equal(sample.sessions[0].messages.length,3);
});
