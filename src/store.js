export const STORAGE_KEY = 'chenxin.frontend.v1';
export function createState() {
  const id = crypto.randomUUID();
  return { version: 1, active: id, theme: 'light', persona: { name: '尘', prompt: '' }, provider: { protocol: 'openai', baseUrl: '', model: '' }, plugins: [], sessions: [{ id, title: '我们的日常', created: Date.now(), messages: [] }] };
}
export function loadState(storage) {
  try {
    const s = JSON.parse(storage.getItem(STORAGE_KEY));
    if (s?.version === 1 && Array.isArray(s.sessions) && s.sessions.length && s.sessions.every(x => typeof x.id === 'string' && typeof x.title === 'string' && Array.isArray(x.messages) && x.messages.every(m => typeof m.text === 'string')) && s.persona && typeof s.persona.name === 'string' && s.provider && Array.isArray(s.plugins) && s.plugins.every(p => typeof p.id === 'string' && typeof p.name === 'string' && typeof p.url === 'string')) {
      if (!s.sessions.some(x => x.id === s.active)) s.active = s.sessions[0].id;
      return s;
    }
  } catch { /* Ignore unavailable storage or malformed state. */ }
  return createState();
}
export function saveState(storage, state) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function newSession(state) {
  const session = { id: crypto.randomUUID(), title: '新的对话', created: Date.now(), messages: [] };
  state.sessions.unshift(session); state.active = session.id; return session;
}
export function addDraftMessage(state, text) {
  const session = state.sessions.find(s => s.id === state.active);
  const message = { id: crypto.randomUUID(), role: 'user', text: text.trim(), time: Date.now(), status: 'local' };
  if (!message.text) return null;
  if (!session.messages.length) session.title = message.text.slice(0, 18);
  session.messages.push(message); return message;
}
export function exportData(state) {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}
