import { avatar, escape } from '../../ui.js';
import { isExpired } from '../../store.js';
export function archives(state) {
 return `<div class="archive-pair">${[['user',state.home.userName,'我的档案'],['ai',state.persona.name,'陪伴者档案']].map(([who,name,label])=>`<section class="archive-person app-panel glass">${avatar(state,who)}<small>${label}</small><h2>${escape(name)}</h2></section>`).join('')}</div><section class="archive-details app-panel glass"><div><span>相伴起点</span><strong>${escape(state.home.since.replaceAll('-','.'))}</strong></div><div><span>一起留下的对话</span><strong>${state.sessions.length} 段</strong></div><div><span>珍藏的记忆</span><strong>${state.memories.filter(m=>!isExpired(m)).length} 条</strong></div></section><button class="app-link" data-action="persona">编辑陪伴者资料</button><p class="app-status">沿用现有名字、头像与本机记录；更多档案字段将在后续添加。</p>`;
}
