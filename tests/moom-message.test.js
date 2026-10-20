import test from 'node:test';
import assert from 'node:assert/strict';
import {splitMoomContent,renderMoomBody} from '../src/apps/moom/message.js';
import {normalizeMoom} from '../src/apps/moom/model.js';
import {moom,moomSheet} from '../src/apps/moom/view.js';

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
test('message metadata remains local and legacy bookmark flags no longer filter messages',()=>{
 const state=fixture(),raw=JSON.stringify(state),output=moom(state,{bookmarks:true});
 assert(output.includes('aria-label="第 2 楼"'));assert(output.includes('aria-label="第 3 楼"'));assert(output.includes('aria-label="第 1 楼"'));assert(!output.includes('data-moom-action="bookmark"'));assert(!output.includes('filter-bookmarks'));assert(!output.includes('moom-message-footer'));
 for(const part of ['status','name','floor','time','body'])assert(output.includes('data-moom-part="'+part+'"'));
 assert(output.includes('欣欣'));assert(output.includes('凛'));assert.equal(JSON.stringify(state),raw);
});
test('thinking drawers show only the requested assistant entry and escape its text',()=>{
 const state=fixture(),scene=state.moom.scenes[0],output=moom(state);
 assert(!output.includes('服务提供的摘要'));assert(output.includes('data-moom-part="thinking-trigger"'));
 assert(moomSheet('reasoning',state,scene,{entryId:'first'}).includes('服务提供的摘要'));
 const third=moomSheet('reasoning',state,scene,{entryId:'third'});assert(third.includes('第三条的摘要'));assert(!third.includes('服务提供的摘要'));
 assert(moomSheet('reasoning',state,scene,{entryId:'second'}).includes('没有可显示'));
 scene.entries[0].reasoningSummary='<script>bad</script>';assert(!moomSheet('reasoning',state,scene,{entryId:'first'}).includes('<script>'));
});
test('user-entered thinking tags remain visible user content rather than a reasoning control',()=>{
 const state=fixture();state.moom.scenes[0].entries=[{id:'user',kind:'say',text:'<think>我的原文</think>',time:1000}];
 const output=moom(state);assert(output.includes('&lt;think&gt;'));assert(!output.includes('data-moom-part="thinking-trigger"'));
});
test('optional reasoning summaries survive normalization without changing legacy entry shapes',()=>{
 const state=fixture(),restored=normalizeMoom(state.moom);
 assert.equal(restored.scenes[0].entries[2].reasoningSummary,'第三条的摘要');
 assert.equal(Object.hasOwn(restored.scenes[0].entries[1],'reasoningSummary'),false);
});
