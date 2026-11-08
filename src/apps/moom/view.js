import {invitationEnvelope} from '../../components/invitation/view.js';
import {sceneInvitation} from './invitation.js';
import {splitMoomContent,renderMoomBody} from './message.js';
import {escape,avatar,backButton} from '../../ui.js';
import {icon} from '../../icons.js';
import {drawerHeader} from '../../drawer.js';
import {normalizeSceneStatus,normalizeStatusText} from './model.js';

const sceneAttrs=scene=>`data-scene="${escape(scene.id)}"`;
export function storyCard(state,message){
 const link=message.storyLink;if(!link)return '';
 const scene=state.moom.scenes.find(item=>item.id===link.sceneId);
 if(!scene)return '<p class="moom-card-unavailable">这一幕已不在本机记录中。</p>';
 if(link.kind==='record')return `<section class="moom-invite moom-record tone-${scene.tone}"><span class="moom-eyebrow">${icon('file')} 剧情小记</span><h3>${escape(scene.title)}</h3><p>${escape(scene.summary||'这一幕的记录。')}</p><button type="button" class="moom-card-link" data-story-action="read" ${sceneAttrs(scene)}>重读这一幕 ${icon('chevron')}</button></section>`;
 return invitationEnvelope(sceneInvitation(state,scene,message));
}

export function legacyStory(state,id){
 const scene=state.moom.scenes.find(item=>item.id===id);
 const back=backButton('back','返回对话',{actionAttribute:'data-story-action'});
 const title=scene?.title||'剧情记录';
 const status=normalizeSceneStatus(scene?.statusPanel);
 const details=[scene?.timeLabel,scene?.place,status.weather,status.mood,status.condition].filter(Boolean).join(' · ');
 const entries=scene?.entries.map((entry,index)=>sceneMessage(state,scene,entry,index)).join('')||'';
 return `<section class="moom-app ${scene?'has-scene tone-'+scene.tone:''}" data-moom-part="screen" data-moom-skin="default"><header class="moom-header app-topbar" data-moom-part="header">${back}<h1 tabindex="-1">${escape(title)}</h1><span aria-hidden="true"></span></header><div class="moom-reading" data-moom-part="reading" tabindex="0" aria-label="剧情正文">${details?'<p class="moom-eyebrow">'+escape(details)+'</p>':''}${scene?.premise?'<p>'+escape(scene.premise)+'</p>':''}${entries||'<p class="moom-content-empty">'+(scene?'还没有剧情正文。':'这一幕已不在本机记录中。')+'</p>'}${scene?.summary?'<section class="moom-closing"><i>剧情小记</i><p>'+escape(scene.summary)+'</p></section>':''}</div></section>`;
}
export function legacyReasoning(scene,entryId){
 const entry=scene?.entries.find(item=>item.id===entryId&&!['say','act'].includes(item.kind));
 const content=entry?splitMoomContent(entry.text,entry.reasoningSummary):{reasoning:''};
 return `${drawerHeader({title:'思考详情',action:'close',actionAttribute:'data-story-action'})}<div class="drawer-scroll moom-reasoning-panel" data-moom-part="thinking-content"><div class="moom-reasoning-text">${escape(content.reasoning||'这条消息没有可显示的思考内容。')}</div></div>`;
}

function sceneMessage(state,scene,entry,index){
 const user=['say','act'].includes(entry.kind),who=user?'user':'ai',name=user?state.home.userName:state.persona.name;
 const content=user?{body:entry.text,reasoning:''}:splitMoomContent(entry.text,entry.reasoningSummary);
 const date=new Date(Number.isFinite(entry.time)&&Math.abs(entry.time)<8.64e15?entry.time:scene.created);
 const time=Number.isNaN(date.getTime())?'':date.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
 return `<article class="moom-paragraph moom-${escape(entry.kind)}" data-moom-part="message" data-moom-role="${user?'user':'assistant'}" data-entry="${escape(entry.id)}">${content.reasoning?`<button type="button" class="moom-thinking-trigger" data-moom-part="thinking-trigger" data-story-action="reasoning" ${sceneAttrs(scene)} data-entry="${escape(entry.id)}" aria-haspopup="dialog" aria-label="查看这一楼的思考详情"><span class="moom-thinking-mark" aria-hidden="true">✦</span><span>思考详情</span></button>`:''}<header class="moom-message-status" data-moom-part="status">${avatar(state,who,'moom-message-avatar')}<strong data-moom-part="name">${escape(name)}</strong><span class="moom-floor" data-moom-part="floor" aria-label="第 ${index+1} 楼">#${index+1}</span><span class="moom-status-text" data-moom-part="custom-text"><span>${escape(normalizeStatusText(scene.statusText)[user?'user':'assistant'])}</span></span>${time?`<time data-moom-part="time" datetime="${date.toISOString()}">发送于 ${escape(time)}</time>`:''}</header><div class="moom-message-body" data-moom-part="body">${renderMoomBody(content.body,{kind:entry.kind})||'<p class="moom-content-empty">暂无正文。</p>'}</div></article>`;
}
