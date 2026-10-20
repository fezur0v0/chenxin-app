import {escape} from '../ui.js';
import {icon} from '../icons.js';
import {drawerHeader} from '../drawer.js';

export function sidebarItemMenu(kind,item,screen='menu'){
 const name=kind==='scene'?'这一幕':'这段对话',header=title=>drawerHeader({title,action:'close',actionAttribute:'data-item-menu-action'}),error='<p class="sidebar-item-error" role="alert" hidden></p>';
 if(screen==='rename')return `<form id="sidebar-item-rename">${header('重命名')}<label class="field"><span>新的名字</span><input name="title" required maxlength="80" value="${escape(item.title)}" autocomplete="off"></label>${error}<div class="sidebar-item-buttons"><button type="button" data-item-menu-action="back">返回</button><button type="submit" class="primary">保存</button></div></form>`;
 if(screen==='delete')return `${header(`删除${name}`)}<div class="sidebar-item-confirm"><strong>${escape(item.title)}</strong><p>${kind==='scene'?'正文会一起删除，关联聊天会保留。':'这段对话和消息会删除，已收藏的记忆与关联剧情会保留。'}</p><p>删除后无法撤销。</p></div>${error}<div class="sidebar-item-buttons"><button type="button" data-item-menu-action="back">返回</button><button type="button" class="danger" data-item-menu-action="confirm-delete">删除</button></div>`;
 return `${header(item.title)}${error}<div class="sidebar-item-actions"><button type="button" data-item-menu-action="pin">${icon('pin')}${item.pinned?'取消置顶':'置顶'}</button><button type="button" data-item-menu-action="rename">${icon('edit')}重命名</button><button type="button" data-item-menu-action="delete">${icon('trash')}删除</button></div>`;
}
