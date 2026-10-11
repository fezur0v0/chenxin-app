import { appIcon } from '../icons.js';
export function music() {
 return `<section class="music-cover app-panel glass"><div class="music-disc" aria-hidden="true">${appIcon('music')}</div><h2>给日常一点旋律</h2><p>这里会是你们的小小唱片架。</p><div class="music-wave" aria-hidden="true">${[8,16,25,38,28,46,32,18,34,22,12,7].map(height=>`<span style="height:${height}px"></span>`).join('')}</div></section><p class="app-status">尚未添加音乐。播放器与曲库将在后续逐步实现。</p>`;
}
