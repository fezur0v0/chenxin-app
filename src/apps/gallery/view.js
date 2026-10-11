import { escape } from '../../ui.js';
import { appIcon } from '../icons.js';
export function gallery(state) {
 const images=[['壁纸',state.appearance.wallpaper],['我的头像',state.appearance.userAvatar],['AI 头像',state.appearance.aiAvatar]];
 const seen=new Set(images.map(([,data])=>data).filter(Boolean));
 for(const session of state.sessions)for(const message of session.messages)for(const file of message.attachments||[])if(file.data&&!seen.has(file.data)){seen.add(file.data);images.push([file.name,file.data]);}
 const list=images.filter(([,data])=>data);
 return `${list.length?`<div class="gallery-grid">${list.map(([name,data])=>`<figure class="gallery-photo app-panel glass"><img src="${escape(data)}" alt="${escape(name)}" loading="lazy"><figcaption>${escape(name)}</figcaption></figure>`).join('')}</div>`:`<section class="gallery-empty app-panel glass"><div aria-hidden="true">${appIcon('gallery')}</div><h2>收集喜欢的画面</h2><p>设置的壁纸、头像和聊天中的图片，<br>会在这里相遇。</p></section>`}<button class="app-link" data-action="open-app" data-app="app-appearance">更换壁纸与头像</button><p class="app-status">当前展示已保存在本机的图片；独立相册管理将在后续添加。</p>`;
}
