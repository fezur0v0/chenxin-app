import { object,text,jsonData,libraryItems,fileTitle } from '../prompt-library/model.js';
export const CORE_PROMPTS={main:'主提示词',worldInfoBefore:'世界书 · 前置',personaDescription:'我的资料',charDescription:'角色描述',charPersonality:'角色性格',scenario:'场景',worldInfoAfter:'世界书 · 后置',dialogueExamples:'示例对话',chatHistory:'聊天记录',jailbreak:'历史后指令',nsfw:'辅助提示词',enhanceDefinitions:'设定补充'};
const parameters=['temperature','top_p','top_k','top_a','min_p','frequency_penalty','presence_penalty','repetition_penalty','openai_max_context','openai_max_tokens','stream_openai','seed','n','wi_format','scenario_format','personality_format','new_chat_prompt','new_group_chat_prompt','new_example_chat_prompt','continue_nudge_prompt','send_if_empty','assistant_prefill','continue_postfix'];
export function presetPayload(value) {
 if(!object(value)||!Array.isArray(value.prompts)||value.prompts.length>500)throw new Error('请选择聊天补全预设 JSON（包含 prompts 提示词列表）。');
 const raw=jsonData(value),ids=new Set();
 for(const prompt of raw.prompts){if(!object(prompt)||typeof prompt.identifier!=='string'||ids.has(prompt.identifier))throw new Error('提示词标识缺失或重复。');ids.add(prompt.identifier);if(!prompt.marker&&typeof prompt.content!=='string')throw new Error('提示词正文格式不正确。');}
 if(raw.prompt_order!==undefined&&(!Array.isArray(raw.prompt_order)||raw.prompt_order.some(group=>!object(group)||!Array.isArray(group.order)||group.order.some(item=>!object(item)||typeof item.identifier!=='string'))))throw new Error('提示词编排格式不正确。');
 // Import prompt configuration, never provider endpoints, credentials or headers.
 return Object.fromEntries(['prompts','prompt_order',...parameters].filter(key=>Object.hasOwn(raw,key)).map(key=>[key,raw[key]]));
}
export const normalizePresets=items=>libraryItems(items,presetPayload);
export const importPreset=(value,name)=>({id:crypto.randomUUID(),name:fileTitle(name),raw:presetPayload(value)});
export function newPreset(name) {
 const identifiers=['main','worldInfoBefore','personaDescription','charDescription','worldInfoAfter','chatHistory','jailbreak'];
 return {id:crypto.randomUUID(),name:text(name,'',80).trim()||'新的预设',raw:{temperature:1,top_p:1,openai_max_tokens:1024,openai_max_context:8192,prompts:identifiers.map(identifier=>({identifier,name:CORE_PROMPTS[identifier],system_prompt:true,marker:!['main','jailbreak'].includes(identifier),role:'system',content:''})),prompt_order:[{character_id:100001,order:identifiers.map(identifier=>({identifier,enabled:true}))}]}};
}
export function promptOrder(preset) {
 const groups=preset.raw.prompt_order;
 if(!groups?.length)return preset.raw.prompts.map(prompt=>({identifier:prompt.identifier,enabled:true}));
 return (groups.find(group=>group.character_id===100001)||groups[0]).order;
}
export function mutableOrder(preset) {
 if(!preset.raw.prompt_order?.length)preset.raw.prompt_order=[{character_id:100001,order:promptOrder(preset)}];
 return (preset.raw.prompt_order.find(group=>group.character_id===100001)||preset.raw.prompt_order[0]).order;
}
export function savePrompt(preset,id,data) {
 const old=preset.raw.prompts.find(prompt=>prompt.identifier===id);
 if(old?.marker)throw new Error('这个位置由上下文自动填充。');
 if(!data.name.trim())throw new Error('请填写提示词名称。');
 if(!old&&preset.raw.prompts.length>=500)throw new Error('每份预设最多保存 500 条提示词。');
 id=old?.identifier||crypto.randomUUID();
 const prompt={...old,identifier:id,name:text(data.name,'',80).trim(),role:['system','user','assistant'].includes(data.role)?data.role:'system',content:text(data.content),injection_position:Number(data.injection_position)===1?1:0,injection_depth:Math.min(100,Math.max(0,Number(data.depth)||0)),injection_order:Math.min(9999,Math.max(0,Number(data.order)||0))};
 if(old)preset.raw.prompts[preset.raw.prompts.indexOf(old)]=prompt;else preset.raw.prompts.push(prompt);
 const order=mutableOrder(preset),prior=order.find(item=>item.identifier===id),next=order.filter(item=>item.identifier!==id);
 const position=Math.min(next.length,Math.max(0,(Number(data.position)||1)-1));next.splice(position,0,{...prior,identifier:id,enabled:data.enabled==='on'});order.splice(0,order.length,...next);return id;
}
export function saveParameters(preset,data) {
 const next={};
 for(const [key,min,max] of [['temperature',0,2],['top_p',0,1],['openai_max_tokens',1,200000],['openai_max_context',1,2000000]]){
  const value=Number(data[key]);if(!Number.isFinite(value)||value<min||value>max)throw new Error('请检查参数范围。');next[key]=value;
 }
 Object.assign(preset.raw,next,{stream_openai:data.stream_openai==='on'});
}
