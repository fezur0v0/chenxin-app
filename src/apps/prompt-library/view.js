import { icon } from '../../icons.js';
import { appIcon } from '../icons.js';
import { backButton,escape } from '../../ui.js';
export const libraryIcon=name=>name==='sliders'?appIcon('presets'):icon(name);
export const toolButton=(action,label,symbol='',extra='')=>`<button type="button" data-tool-action="${action}" ${extra}>${symbol?libraryIcon(symbol):''}<span>${escape(label)}</span></button>`;
export function libraryHeader(title,detail=false) {
 return `<header class="desktop-app-header library-header app-topbar">${detail?backButton('library','返回列表',{actionAttribute:'data-tool-action'}):backButton('home','返回主页')}<h1 tabindex="-1">${escape(title)}</h1>${toolButton(detail?'manage':'new',detail?'管理':'新建',detail?'edit':'plus',`class="library-icon" aria-label="${detail?'管理当前配置':'新建'}"`)}</header>`;
}
export function libraryHero(english,title,description,count,label) {
 return `<div class="library-hero"><div><p lang="en">${english}</p><h2>${title}</h2><span>${description}</span></div><div class="library-count"><strong>${count}</strong><small>${label}</small></div></div>`;
}
export const libraryToolbar=(placeholder,value,extra='')=>`<div class="library-toolbar"><label class="library-search">${icon('search')}<input type="search" data-tool-search value="${escape(value||'')}" placeholder="${placeholder}" aria-label="${placeholder}"></label>${extra}</div>`;
export function libraryEmpty(symbol,title,description,action='new',label='新建') {
 return `<section class="library-empty app-panel glass"><div>${libraryIcon(symbol)}</div><h3>${title}</h3><p>${description}</p>${toolButton(action,label,'plus','class="library-primary"')}</section>`;
}
export function librarySwitch(action,checked,label,id='') {
 return `<button type="button" class="library-switch" role="switch" aria-checked="${checked}" aria-label="${escape(label)}" data-tool-action="${action}" data-item="${escape(id)}"><span></span></button>`;
}
export const libraryHint=kind=>`<p class="library-runtime-note">${kind==='worldbook'?'条目保存在本机，尚未接入对话上下文。':'预设保存在本机，尚未应用到模型请求。'}</p>`;
export function selectField(label,name,value,options) {
 return `<label class="field"><span>${label}</span><select name="${name}">${options.map(([key,title])=>`<option value="${escape(key)}" ${String(value)===String(key)?'selected':''}>${escape(title)}</option>`).join('')}</select></label>`;
}
export const contentField=(label,name,value,placeholder='')=>`<label class="field"><span>${label}</span><textarea name="${name}" rows="6" maxlength="32000" placeholder="${escape(placeholder)}">${escape(value||'')}</textarea></label>`;
export const numericField=(label,name,value,min,max,step=1)=>`<label class="field"><span>${label}</span><input type="number" inputmode="${step==='any'||step<1?'decimal':'numeric'}" name="${name}" min="${min}" max="${max}" step="${step}" value="${escape(value)}" required></label>`;
export const checkedField=(label,name,checked)=>`<label class="library-check"><input type="checkbox" name="${name}" ${checked?'checked':''}><span>${label}</span></label>`;
