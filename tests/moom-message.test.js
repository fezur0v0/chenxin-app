import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {splitMoomContent,renderMoomBody} from '../src/apps/moom/message.js';
import {normalizeMoom} from '../src/apps/moom/model.js';
import {splitLiveReply,conversationTimeline,estimateVoiceSeconds} from '../src/chat-content/live.js';
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

test('special live messages keep field splits, and block chrome only appears on the user side',()=>{
 const raw=`<live>
char：[语音] 外面好冷|8秒
user：[语音] 一二三四五六
char：[图片] 路灯 &lt; 原样
user：[图片] <img src=x>
char：[转账] 52|奶茶|和蛋糕钱
user：[转账] 52|奶茶钱|已收款
char：[引用] 到家了吗|快到了|你呢
user：[引用] 不想去|少糊弄我
user：[拉黑] 你到底怎么了
char：[拉黑] 你怎么不回消息
user：[拒收] 旧写法也算拉黑
[已读]
</live>`;
 const parts=splitLiveReply(raw);
 const voice=parts.find(part=>part.kind==='voice'&&part.role==='assistant');
 assert.equal(voice.text,'外面好冷');assert.equal(voice.seconds,8);
 assert.equal(parts.find(part=>part.kind==='voice'&&part.role==='user').seconds,estimateVoiceSeconds('一二三四五六'));
 const pending=parts.find(part=>part.kind==='transfer'&&part.role==='assistant');
 assert.equal(pending.amount,'52');assert.equal(pending.note,'奶茶|和蛋糕钱');assert.equal(pending.status,'pending');
 const done=parts.find(part=>part.kind==='transfer'&&part.role==='user');
 assert.equal(done.note,'奶茶钱');assert.equal(done.status,'done');assert.equal(done.read,undefined);
 assert.equal(parts.filter(part=>part.kind==='blocked').at(-1).read,true);
 const quote=parts.find(part=>part.kind==='quote');
 assert.equal(quote.quote,'到家了吗');assert.equal(quote.text,'快到了|你呢');
 assert.equal(parts.filter(part=>part.kind==='blocked').length,2);
 assert.equal(parts.find(part=>part.text==='你怎么不回消息').kind,'bubble');
 const state=createState();state.persona.name='尘';state.home.userName='欣欣';
 state.sessions[0].messages=[{id:'a',role:'assistant',time:1,text:raw,attachments:[]}];
 const html=chat(state);
 assert(html.includes('data-live-part="voice"'));
 assert(html.includes('data-live-part="image"'));
 assert(html.includes('data-live-part="transfer"'));
 assert(html.includes('data-live-part="quote"'));
 assert(html.includes('data-live-part="blocked"'));
 assert(html.includes('¥52.00'));
 assert(html.includes('奶茶|和蛋糕钱'));
 assert(html.includes('已收款'));
 assert(!html.includes('查看语音内容'));
 assert(html.includes('长按转文字'));
 assert(html.includes('消息已发出，但被对方拉黑了'));
 assert(html.includes('data-live-part="bubble">你怎么不回消息'));
 assert(!html.includes('data-live-part="blocked">你怎么不回消息'));
 assert.equal((html.match(/class="block-mark"/g)||[]).length,2);
 assert(html.includes('&lt;img'));assert(!html.includes('<img src=x>'));
 assert(html.includes('class="quote-name">欣欣</span>'));assert(html.includes('class="quote-name">尘</span>'));
 assert(!html.includes('[拉黑]')&&!html.includes('[拒收]')&&!html.includes('[红包]'));
});

test('chat chrome css stays split by component and does not hard-code a candy color',()=>{
 const css=readFileSync(new URL('../src/chat-content/style.css',import.meta.url),'utf8');
 for(const title of ['文字气泡','语音条','引用框','图片描述','转账卡片','拉黑'])assert(css.includes(title),title);
 for(const token of ['--bubble-other-fill','--bubble-user-fill','--accent','--tint','--warning','--live-voice-progress'])assert(css.includes(token),token);
 assert(!/#[0-9a-f]{3,8}\b/i.test(css));
 assert(css.includes('--voice-hit:44px'));
 assert(css.includes('prefers-reduced-motion'));
 assert(!css.includes('border-left:2px solid'));
});
