import { icon } from './icons.js';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const button = (action, symbol, label, extra = '') => `<button type="button" data-action="${action}" aria-label="${label}" ${extra}>${icon(symbol)}</button>`;
// Navigation only: keep action ownership while sharing the chevron and its states.
export function backButton(action,label='返回',{music=false,collapsed=false,actionAttribute='data-action'}={}) {
 const attribute=music?'data-music-action':actionAttribute;
 return `<button type="button" class="nav-back${collapsed?' is-collapsed':''}" ${attribute}="${escape(action)}" aria-label="${escape(label)}">${icon('back')}</button>`;
}
export function appPageHeader(title,{backLabel='返回主页'}={}) {
 return `<header class="desktop-app-header">${backButton('home',backLabel)}<h1 tabindex="-1">${escape(title)}</h1><span aria-hidden="true"></span></header>`;
}
export const field = (label,name,value,placeholder='',type='text') => `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escape(value)}" placeholder="${escape(placeholder)}"></label>`;
export function avatar(state,who,cls='') { const src=state.appearance[who==='ai'?'aiAvatar':'userAvatar'];return `<span class="avatar ${cls}">${src?`<img src="${escape(src)}" alt="${who==='ai'?'AI':'用户'}头像">`:`<span>${escape((who==='ai'?state.persona.name:state.home.userName).slice(0,1))}</span>`}</span>`; }
