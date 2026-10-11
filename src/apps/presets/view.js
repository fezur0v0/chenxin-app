import { avatar, escape } from '../../ui.js';
import { icon } from '../../icons.js';
export function presets(state) {
 return `<section class="preset-current app-panel glass"><div class="preset-person">${avatar(state,'ai')}<div><small>当前角色</small><h2>${escape(state.persona.name)}</h2></div><span class="app-badge">当前配置</span></div><p class="preset-prompt">${escape(state.persona.prompt||'还没有填写角色设定，慢慢写下你喜欢的性格和语气吧。')}</p><button class="app-link" data-action="persona">${icon('edit')}编辑当前角色设定</button></section><button class="preset-model app-panel glass" data-action="configure-model">${icon('key')}<span>模型配置<small>${escape(state.provider.model||'尚未选择模型')}</small></span>${icon('chevron')}</button><p class="app-status">这页先展示已有配置；多套预设的保存与切换将在后续添加。</p>`;
}
