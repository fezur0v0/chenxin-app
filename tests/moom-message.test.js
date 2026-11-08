import test from 'node:test';
import assert from 'node:assert/strict';
import {splitMoomContent,renderMoomBody} from '../src/apps/moom/message.js';
import {normalizeMoom} from '../src/apps/moom/model.js';
import {splitLiveReply,conversationTimeline} from '../src/chat-content/live.js';
import {chat,sessions} from '../src/views.js';
import {createState} from '../src/store.js';

function fixture(){
 const scene={id:'scene',title:'海边',created:1000,updated:1000,status:'active',tone:'sea',premise:'',timeLabel:'夜晚',place:'海边',statusPanel:{},entries:[
  {id:'first',kind:'narration',text:'<think>服务提供的摘要</think>“你好。” *挥手* **重点**',time:1000,bookmarked:false},
  {id:'second',kind:'say',text:'我来了。',time:2000,bookmarked:true},
  {id:'third',kind:'dialogue',text:'慢慢说。',time:3000,bookmarked:true,reasoningSummary:'第三条的摘要'}
 ]};
 return {persona:{name:'凛'},home:{userName:'欣欣'},appearance:{},moom:{active:'scene',scenes:[scene]}};
}
test('leading thinking is extracted without mutating raw text, including incomplete output',()=>{
 const raw='<think>摘要</think>\n\n正文',result=splitMoomContent(raw);
 assert.deepEqual(result,{body:'正文',reasoning:'摘要'});assert.equal(raw,'<think>摘要</think>\n\n正文');
 assert.deepEqual(splitMoomContent('<THINK>尚未结束'),{body:'',reasoning:'尚未结束'});
 assert.deepEqual(splitMoomContent('<think>摘要</think>正文','摘要'),{body:'正文',reasoning:'摘要'});
 assert.equal(splitMoomContent('<think>A</think><think>B</think>正文').reasoning,'A\n\nB');
});
test('literal examples and ordinary mentions of thinking tags remain body text',()=>{
 const examples=['正文提到 <think> 标签。','\`<think>例子</think>\`','\`\`\`xml\n<think>例子</think>\n\`\`\`'];
 for(const value of examples){assert.equal(splitMoomContent(value).body,value);assert.equal(splitMoomContent(value).reasoning,'');}
});
test('body styling separates quotes, actions, emphasis and paragraphs and escapes imported HTML',()=>{
 const result=renderMoomBody('“你好。” *挥手* **重点**\n\n<img src=x onerror=alert(1)>');
 for(const name of ['dialogue','action','emphasis'])assert(result.includes('data-moom-part="'+name+'"'));
 assert.equal((result.match(/class="moom-prose"/g)||[]).length,2);assert(result.includes('&lt;img'));assert(!result.includes('<img'));
 assert(renderMoomBody('「**好**」').includes('<strong'));assert(renderMoomBody('“未闭合 *星号').includes('“未闭合 *星号'));
});
test('escaped markers and inline code are not interpreted as formatting',()=>{
 const code=renderMoomBody('\\*原样\\* \`**示例**\`');
 assert(!code.includes('data-moom-part="action"'));assert(!code.includes('data-moom-part="emphasis"'));assert(code.includes('data-moom-part="inline-code"'));
});
test('legacy dialogue and action entries retain semantic styling',()=>{
 assert(renderMoomBody('你好。',{kind:'dialogue'}).includes('「你好。」'));
 assert(renderMoomBody('走近一步。',{kind:'act'}).includes('data-moom-part="action"'));
});
test('optional reasoning summaries survive normalization without changing legacy entry shapes',()=>{
 const state=fixture(),restored=normalizeMoom(state.moom);
 assert.equal(restored.scenes[0].entries[2].reasoningSummary,'第三条的摘要');
 assert.equal(Object.hasOwn(restored.scenes[0].entries[1],'reasoningSummary'),false);
});

test('online bubbles and offline prose retain their order and user input stays literal',()=>{
 const raw='窗外在下雨。<live>char：到家了吗？\n路上慢点。\nUSER:到了\n[已读]</live>他放下手机。';
 const parts=splitLiveReply(raw);
 assert.deepEqual(parts.map(part=>part.kind),['offline','bubble','bubble','offline']);
 assert.equal(parts[1].text,'到家了吗？\n路上慢点。');
 assert.equal(parts[2].role,'user');assert.equal(parts[2].read,true);
 const state=createState(),session=state.sessions[0];
 session.messages=[{id:'a',role:'assistant',time:1,text:raw,attachments:[]},{id:'b',role:'user',time:2,text:'<live>原样输入</live>',attachments:[]}];
 const rendered=chat(state);
 assert(rendered.includes('conversation-live-row is-user'));assert(rendered.includes('&lt;live&gt;原样输入&lt;/live&gt;'));
 assert(rendered.indexOf('窗外在下雨')<rendered.indexOf('到家了吗'));
 assert(rendered.indexOf('到家了吗')<rendered.indexOf('他放下手机'));
});
test('old stories appear inline, invitations are hidden, and the list still has only chat rows',()=>{
 const state=createState(),session=state.sessions[0];
 state.moom.scenes=[{id:'s',sessionId:session.id,title:'旧的一天',premise:'',summary:'',created:1,updated:4,entries:[{id:'e',kind:'act',time:3,text:'窗边的旧记录'}]}];
 session.messages=[{id:'a',role:'user',time:2,text:'实际聊天',attachments:[]},{id:'i',role:'user',time:2,text:'',attachments:[],storyLink:{kind:'invite',sceneId:'s'}}];
 const before=JSON.stringify(state),timeline=conversationTimeline(state,session),page=chat(state);
 assert.equal(timeline.length,3);
 assert(page.indexOf('实际聊天')<page.indexOf('窗边的旧记录'));
 assert(!page.includes('data-invitation-action')&&!page.includes('data-story-action'));
 assert.equal((sessions(state,'窗边的旧记录').match(/data-open=/g)||[]).length,1);
 assert.equal(JSON.stringify(state),before);
});
