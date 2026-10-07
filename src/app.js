import { icon } from './icons.js';
import { loadState, saveState, newSession, addDraftMessage, exportData } from './store.js';
const state = loadState(localStorage);
const app = document.querySelector('#app');
let page = 'chat', drawer = false, toastTimer;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button = (action, symbol, label, extra = '') => `<button type="button" data-action="${action}" aria-label="${label}" ${extra}>${icon(symbol)}</button>`;
const nav = [['chat','chat','聊天'],['sessions','menu','会话'],['plugins','puzzle','插件'],['settings','settings','设置']];
function notify(text) { const node = document.querySelector('#notice'); node.textContent = text; node.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 3500); }
function persist() { try { saveState(localStorage, state); } catch { notify('本机存储不可用，当前修改仅在这次打开时保留。'); } }
function syncDrawer() {
 const sidebar = document.querySelector('.sidebar');
 if (!sidebar) return;
 sidebar.inert = window.innerWidth <= 700 && !drawer;
 if (sidebar.inert) sidebar.setAttribute('aria-hidden', 'true'); else sidebar.removeAttribute('aria-hidden');
}
function field(label, name, value, placeholder = '', type = 'text') { return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escape(value)}" placeholder="${escape(placeholder)}"></label>`; }
function chat() {
 const s = state.sessions.find(x => x.id === state.active);
 return `<section class="chat-view"><header class="chat-header">${button('drawer','menu','打开菜单')}<div class="peer"><span class="eyebrow">CHENXIN / PRIVATE SPACE</span><h1>${escape(state.persona.name)}</h1><span class="status"><i></i>前端预览 · 未连接模型</span></div>${button('persona','person','角色设定')}</header><div class="messages" id="messages" aria-label="聊天记录"><div class="date-line">${new Date(s.created).toLocaleDateString('zh-CN', {month:'long',day:'numeric'})} · ${escape(s.title)}</div>${s.messages.length ? s.messages.map(m => `<article class="message ${m.role === 'user' ? 'user' : 'assistant'}"><div class="bubble">${escape(m.text)}</div><div class="message-meta">${new Date(m.time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} · 仅保存本机</div></article>`).join('') : `<div class="welcome"><div class="sea-mark"><span></span><span></span><span></span></div><p class="welcome-en">Somewhere, softly.</p><h2>把今天，慢慢说给我听。</h2><p>一个安静的角落，留给你和${escape(state.persona.name)}。</p><div class="preview-note">这里是前端预览。写下的消息会留在本机，<br>连接模型后，才会收到真实回复。</div></div>`}</div><footer class="composer-wrap"><div class="composer-caption"><span>${escape(state.provider.model || '尚未选择模型')}</span><button data-action="settings">配置模型 ${icon('arrow')}</button></div><form id="compose" class="composer"><textarea name="message" rows="1" maxlength="12000" aria-label="消息" placeholder="跟${escape(state.persona.name)}说点什么…"></textarea><button class="send" type="submit" aria-label="保存消息">${icon('arrow')}</button></form><p class="composer-note">你的文字，仅保存在当前设备。</p></footer></section>`;
}
function sessions() {
 return `<div class="page-heading"><span class="eyebrow">CONVERSATIONS</span><h1>留在这里的话</h1><p>每一段对话，都有自己的位置。</p></div><button class="primary" data-action="new">${icon('plus')} 新的对话</button><div class="session-list">${state.sessions.map(s => `<article class="session-card ${s.id === state.active ? 'selected' : ''}"><button class="session-open" data-open="${escape(s.id)}"><span class="session-symbol">${icon('chat')}</span><span><strong>${escape(s.title)}</strong><small>${escape(s.messages.at(-1)?.text || '还没有写下消息')}</small><em>${s.messages.length} 条消息 · ${new Date(s.created).toLocaleDateString('zh-CN')}</em></span></button>${button('delete-session','trash','删除会话',`data-id="${escape(s.id)}"`)}</article>`).join('')}</div>`;
}
function plugins() {
 return `<div class="page-heading"><span class="eyebrow">EXTENSIONS</span><h1>让陪伴，多一点可能</h1><p>为未来的工具和能力，预留一个入口。</p></div><div class="info-banner">当前仅管理配置；MCP 与插件运行尚未接入。</div><div class="plugin-list">${state.plugins.length ? state.plugins.map(p => `<article class="plugin-card"><div class="plugin-top"><div class="plugin-symbol">${icon('puzzle')}</div><div><h2>${escape(p.name)}</h2><p>${escape(p.type === 'mcp' ? '远程 MCP' : '插件配置')}</p></div>${button('delete-plugin','trash','删除插件配置',`data-id="${escape(p.id)}"`)}</div><p class="endpoint">${escape(p.url)}</p><div class="plugin-bottom"><span>未连接 · 仅配置</span><button data-action="edit-plugin" data-id="${escape(p.id)}">编辑</button></div></article>`).join('') : `<div class="empty-card">${icon('puzzle')}<h2>还没有添加插件</h2><p>先收藏你想接入的服务，<br>等运行层准备好，再让它们开始工作。</p></div>`}</div><form id="plugin-form" class="panel"><div class="section-title"><h2 id="plugin-form-title">添加配置</h2><span>MCP / PLUGIN</span></div><input type="hidden" name="id">${field('名称','name','','例如：搜索工具') }<label class="field"><span>类型</span><select name="type"><option value="mcp">远程 MCP</option><option value="plugin">插件</option></select></label>${field('服务地址','url','','https://example.com/mcp','url')}<p class="hint">此版本不连接地址，也不执行插件代码。请勿在地址中填写密钥。</p><button class="primary" type="submit">保存配置</button></form>`;
}
function settings() {
 return `<div class="page-heading"><span class="eyebrow">PREFERENCES</span><h1>属于你的节奏</h1><p>从名字，到说话的方式。</p></div><form id="persona-form" class="panel"><div class="section-title"><h2>陪伴者</h2><span>PERSONA</span></div>${field('名字','name',state.persona.name,'尘')}<label class="field"><span>角色设定</span><textarea name="prompt" rows="4" maxlength="12000" placeholder="写下你希望的语气、性格与相处方式…">${escape(state.persona.prompt)}</textarea></label><button class="primary" type="submit">保存角色</button></form><form id="provider-form" class="panel"><div class="section-title"><h2>模型与 API</h2><span>未连接</span></div><label class="field"><span>接口类型</span><select name="protocol"><option value="openai" ${state.provider.protocol === 'openai' ? 'selected' : ''}>OpenAI 兼容</option><option value="anthropic" ${state.provider.protocol === 'anthropic' ? 'selected' : ''}>Anthropic</option><option value="gemini" ${state.provider.protocol === 'gemini' ? 'selected' : ''}>Google Gemini</option></select></label>${field('API 基础地址','baseUrl',state.provider.baseUrl,'https://api.example.com/v1','url')}${field('模型 ID','model',state.provider.model,'填写服务商提供的模型 ID')}<label class="field"><span>API 密钥</span><input type="password" placeholder="接入模型时再配置" disabled></label><p class="hint">当前只保存地址与模型名称。密钥输入和连接测试将在接入模型时开放。</p><button class="primary" type="submit">保存模型配置</button></form><section class="panel"><div class="section-title"><h2>外观与数据</h2><span>LOCAL</span></div><div class="setting-row"><span>深色模式</span><button class="toggle ${state.theme === 'dark' ? 'on' : ''}" data-action="theme" role="switch" aria-checked="${state.theme === 'dark'}" aria-label="深色模式"><span></span></button></div><button class="secondary" data-action="export">${icon('download')} 导出会话与配置</button><p class="hint">导出内容包含聊天和角色设定。当前没有云端同步，换设备不会自动迁移。</p></section>`;
}
function render() {
 document.documentElement.dataset.theme = state.theme;
 app.innerHTML = `<div class="shell"><aside class="sidebar ${drawer ? 'open' : ''}"><div class="brand"><span>尘</span><div>CHENXIN<small>A space for us.</small></div>${button('close-drawer','close','关闭菜单')}</div><div class="sidebar-caption">YOUR LITTLE WORLD</div><nav aria-label="主导航">${nav.map(([p,i,l]) => `<button data-action="${p}" class="nav-item ${page === p ? 'active' : ''}" ${page === p ? 'aria-current="page"' : ''}>${icon(i)}${l}${p === 'plugins' ? '<span class="soon">预览</span>' : ''}</button>`).join('')}</nav><div class="sidebar-footer"><span class="little-wave">〜</span><p>Let the ordinary<br>be a little softer.</p><small>前端预览 / v0.1</small></div></aside>${drawer ? '<button class="scrim" aria-label="关闭菜单" data-action="close-drawer"></button>' : ''}<main>${page === 'chat' ? chat() : `<header class="page-top">${button('drawer','menu','打开菜单')}<span>尘 / ${nav.find(n => n[0] === page)?.[2]}</span>${button('chat','back','返回聊天')}</header><div class="page-content">${page === 'sessions' ? sessions() : page === 'plugins' ? plugins() : settings()}</div>`}</main><nav class="bottom-nav" aria-label="手机导航">${nav.map(([p,i,l]) => `<button data-action="${p}" class="${page === p ? 'active' : ''}" ${page === p ? 'aria-current="page"' : ''}>${icon(i)}<span>${l}</span></button>`).join('')}</nav></div>`;
 const messages = document.querySelector('#messages'); if (messages) messages.scrollTop = messages.scrollHeight;
 syncDrawer();
}
app.addEventListener('click', e => {
 const target = e.target.closest('button'); if (!target) return;
 if (target.dataset.open) { state.active = target.dataset.open; page = 'chat'; persist(); render(); return; }
 const action = target.dataset.action;
 if (nav.some(n => n[0] === action)) { page = action; drawer = false; render(); }
 else if (action === 'persona') { page = 'settings'; drawer = false; render(); document.querySelector('[name=name]').focus(); }
 else if (action === 'drawer' || action === 'close-drawer') { drawer = action === 'drawer'; render(); }
 else if (action === 'theme') { state.theme = state.theme === 'dark' ? 'light' : 'dark'; persist(); render(); }
 else if (action === 'new') { newSession(state); page = 'chat'; persist(); render(); document.querySelector('[name=message]').focus(); }
 else if (action === 'delete-session') {
   if (!confirm('删除这段本机会话？删除后无法恢复。')) return;
   state.sessions = state.sessions.filter(s => s.id !== target.dataset.id);
   if (!state.sessions.length) newSession(state);
   if (!state.sessions.some(s => s.id === state.active)) state.active = state.sessions[0].id;
   persist(); render();
 }
 else if (action === 'delete-plugin') { if (!confirm('删除这项插件配置？')) return; state.plugins = state.plugins.filter(p => p.id !== target.dataset.id); persist(); render(); }
 else if (action === 'edit-plugin') {
   const p = state.plugins.find(x => x.id === target.dataset.id), form = document.querySelector('#plugin-form');
   for (const key of ['id','name','url','type']) form.elements[key].value = p[key];
   document.querySelector('#plugin-form-title').textContent = '编辑配置'; form.scrollIntoView({behavior:'smooth'}); form.elements.name.focus();
 }
 else if (action === 'export') { const url = URL.createObjectURL(new Blob([exportData(state)], {type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = `chenxin-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
});
app.addEventListener('submit', e => {
 e.preventDefault(); const form = e.target, data = Object.fromEntries(new FormData(form));
 if (form.id === 'compose') { if (!addDraftMessage(state, data.message)) return; persist(); render(); document.querySelector('[name=message]').focus(); notify('已保存本机。模型尚未连接，这条消息没有发送。'); }
 else if (form.id === 'persona-form') { if (!data.name.trim()) return notify('请先给陪伴者一个名字。'); state.persona = {name:data.name.trim().slice(0,40),prompt:data.prompt}; persist(); render(); notify('角色设定已保存。'); }
 else if (form.id === 'provider-form') {
   const baseUrl = data.baseUrl.trim();
   if (baseUrl) {
     let url; try { url = new URL(baseUrl); } catch { return notify('请输入完整的 HTTPS 地址。'); }
     if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return notify('API 地址请使用不含密钥或账号信息的 HTTPS 地址。');
   }
   state.provider = {protocol:data.protocol,baseUrl,model:data.model.trim()}; persist(); notify('模型配置已保存，尚未连接服务。');
 }
 else if (form.id === 'plugin-form') {
   if (!data.name.trim() || !data.url.trim()) return notify('请填写名称和服务地址。');
   let url; try { url = new URL(data.url); } catch { return notify('请输入完整的 HTTPS 地址。'); }
   if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return notify('请使用不含密钥、查询参数或账号信息的 HTTPS 地址。');
   const plugin = {id:data.id || crypto.randomUUID(),name:data.name.trim().slice(0,80),type:data.type,url:url.href};
   const index = state.plugins.findIndex(p => p.id === plugin.id);
   if (index < 0) state.plugins.push(plugin); else state.plugins[index] = plugin;
   persist(); render(); notify('配置已保存。插件运行将在后续版本接入。');
 }
});
app.addEventListener('keydown', e => { if (e.target.name === 'message' && e.key === 'Enter' && !e.shiftKey && !e.isComposing && !e.repeat) { e.preventDefault(); e.target.form.requestSubmit(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer) { drawer = false; render(); } });
window.addEventListener('resize', syncDrawer);
render();
