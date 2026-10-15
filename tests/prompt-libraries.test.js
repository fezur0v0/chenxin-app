import test from 'node:test';
import assert from 'node:assert/strict';
import { createState,normalizeState,exportData } from '../src/store.js';
import { importWorldbook,saveWorldEntry,newWorldbook,worldPayload } from '../src/apps/worldbook/model.js';
import { importPreset,promptOrder,savePrompt,saveParameters,newPreset } from '../src/apps/presets/model.js';
import { parseLibraryFile } from '../src/apps/prompt-library/model.js';
import { worldbook } from '../src/apps/worldbook/view.js';
import { presets } from '../src/apps/presets/view.js';
const lore={entries:{'0':{uid:0,key:['小屋','/海边,小屋/i'],keysecondary:['雨天'],comment:'海边的小屋',content:'窗边种着薄荷。',constant:false,disable:false,position:4,order:100,depth:3,selectiveLogic:3,sticky:2,extensions:{custom:'保留'}}},extensions:{version:'test'}};
const imported={prompts:[{identifier:'main',name:'主提示词',content:'用 {{char}} 的口吻回应 {{user}}。',role:'system',system_prompt:true},{identifier:'chatHistory',name:'聊天记录',marker:true},{identifier:'custom',name:'未编排',content:'原有正文',role:'user',extensions:{custom:42}}],prompt_order:[{character_id:100000,order:[{identifier:'custom',enabled:true}]},{character_id:100001,order:[{identifier:'main',enabled:true},{identifier:'chatHistory',enabled:false}]}],temperature:.8,top_p:.95,openai_max_tokens:2048,openai_max_context:16384,wi_format:'{0}',proxy_password:'do-not-import',custom_include_headers:'do-not-import',reverse_proxy:'https://private.invalid'};
test('legacy backups get empty libraries; local configurations and unrelated data survive backup',()=>{
 const state=createState();delete state.worldbooks;delete state.promptPresets;delete state.activePromptPreset;const legacy=normalizeState(state);assert.deepEqual(legacy.worldbooks,[]);assert.deepEqual(legacy.promptPresets,[]);
 legacy.home.note='原有便签';legacy.persona.prompt='原角色资料';legacy.sessions[0].messages.push({id:'old',role:'user',text:'原聊天',time:1});
 legacy.worldbooks.push(importWorldbook(lore,'世界.json'));legacy.promptPresets.push(importPreset(imported,'陪伴.json'));legacy.activePromptPreset=legacy.promptPresets[0].id;
 const restored=normalizeState(JSON.parse(exportData(legacy)));assert.deepEqual(restored.worldbooks,legacy.worldbooks);assert.deepEqual(restored.promptPresets,legacy.promptPresets);assert.equal(restored.activePromptPreset,legacy.activePromptPreset);assert.deepEqual(restored.home,legacy.home);assert.deepEqual(restored.persona,legacy.persona);assert.equal(restored.sessions[0].messages[0].text,'原聊天');assert.equal(restored.promptPresets[0].raw.proxy_password,undefined);assert.equal(restored.promptPresets[0].raw.custom_include_headers,undefined);assert.equal(restored.promptPresets[0].raw.reverse_proxy,undefined);
});
test('worldbook edits preserve secondary logic, unknown fields, comma-containing regex and zero UID',()=>{
 const book=importWorldbook(lore,'世界.json');saveWorldEntry(book,'0',{name:'新名称',content:'新的正文',keys:'小屋\n/海边,小屋/i',strategy:'constant',enabled:'on',position:'4',order:'210',depth:'2',role:'0'});
 assert.deepEqual(book.raw.entries['0'].key,['小屋','/海边,小屋/i']);assert.equal(book.raw.entries['0'].uid,0);assert.equal(book.raw.entries['0'].sticky,2);assert.equal(book.raw.entries['0'].selectiveLogic,3);assert.deepEqual(book.raw.entries['0'].extensions,{custom:'保留'});assert.equal(lore.entries['0'].comment,'海边的小屋');
 const id=saveWorldEntry(book,'',{name:'另一条',content:'正文',keys:'',strategy:'constant',enabled:'on'});assert.equal(id,'1');assert.equal(Object.keys(book.raw.entries).length,2);
});
test('preset editing uses selected prompt order, retains unused prompts and other character orders',()=>{
 const preset=importPreset(imported,'陪伴.json');assert.deepEqual(promptOrder(preset).map(row=>row.identifier),['main','chatHistory']);assert.equal(preset.raw.prompts.length,3);
 savePrompt(preset,'custom',{name:'新的名字',content:'继续保留 {{user}}',role:'assistant',position:'1',enabled:'on',injection_position:'1',depth:'2',order:'90'});
 assert.deepEqual(promptOrder(preset).map(row=>row.identifier),['custom','main','chatHistory']);assert.deepEqual(preset.raw.prompt_order[0],imported.prompt_order[0]);assert.equal(preset.raw.prompts[2].extensions.custom,42);assert.equal(preset.raw.prompts[2].content,'继续保留 {{user}}');assert.equal(preset.raw.prompts[2].injection_depth,2);assert.equal(preset.raw.wi_format,'{0}');assert.throws(()=>savePrompt(preset,'chatHistory',{name:'覆盖',content:'覆盖'}));
});
test('parameter validation is atomic and preserves other imported sampling settings',()=>{
 const preset=newPreset('日常'),before=structuredClone(preset);assert.throws(()=>saveParameters(preset,{temperature:'1.5',top_p:'broken',openai_max_tokens:'100',openai_max_context:'1000'}));assert.deepEqual(preset,before);
 preset.raw.min_p=.02;saveParameters(preset,{temperature:'0.75',top_p:'0.95',openai_max_tokens:'4000',openai_max_context:'32000',stream_openai:'on'});assert.equal(preset.raw.min_p,.02);assert.equal(preset.raw.temperature,.75);assert.equal(preset.raw.stream_openai,true);
});
test('invalid library files fail without changing state or accepting text-completion files as chat presets',()=>{
 assert.throws(()=>worldPayload({entries:[]}));assert.throws(()=>worldPayload({entries:{0:{key:'wrong',content:'正文'}}}));assert.throws(()=>importPreset({temperature:1,instruct:{}}));assert.throws(()=>importPreset({prompts:[{identifier:'a',content:''},{identifier:'a',content:''}]}));assert.throws(()=>parseLibraryFile('{bad'));
 const safe=parseLibraryFile('{"__proto__":{"polluted":true},"entries":{}}');assert.equal(Object.hasOwn(safe,'__proto__'),false);assert.equal({}.polluted,undefined);
});
test('library views escape imported text, show honest empty states and retain correct prompt semantics',()=>{
 const state=createState();assert.match(worldbook(state),/世界从这里展开/);assert.match(presets(state),/从喜欢的回应开始/);assert.doesNotMatch(presets(state),/编辑当前角色设定/);
 const book=newWorldbook('<img src=x>');book.raw.entries['0']={key:['<script>'],comment:'<script>',content:'<img src=x>'};state.worldbooks=[book];assert.doesNotMatch(worldbook(state,{selected:book.id}),/<img src=x>|<script>/);assert.match(worldbook(state,{selected:book.id}),/&lt;script&gt;/);
 const preset=importPreset(imported,'<img src=x>.json');state.promptPresets=[preset];assert.doesNotMatch(presets(state,{selected:preset.id}),/<img src=x>/);assert.match(presets(state,{selected:preset.id}),/尚未加入编排/);assert.match(presets(state,{selected:preset.id}),/尚未应用到模型请求/);
});
