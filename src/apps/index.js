import { APPS, findApp } from './catalog.js';
import { button, escape } from '../ui.js';
import { diary } from './diary/view.js';
import { music } from './music/view.js';
import { gallery } from './gallery/view.js';
import { presets } from './presets/view.js';
import { worldbook } from './worldbook/view.js';
import { archives } from './archives/view.js';
import { appearance } from './appearance/view.js';
export { APPS, findApp };
const views={diary,music,gallery,presets,worldbook,archives,appearance};
export function appView(id,state,ui) {
 const app=findApp(id);
 if(!app)return '';
 if(app.icon==='music')return `<section class="desktop-app music-app" data-app-page="${app.id}">${music(state,ui)}</section>`;
 return `<section class="desktop-app ${app.icon}-app" data-app-page="${app.id}"><header class="desktop-app-header">${button('home','back','返回主页')}<h1 tabindex="-1">${app.name}</h1><span aria-hidden="true"></span></header>${app.icon==='diary'?'':`<p class="desktop-app-intro">${escape(app.subtitle)}</p>`}<div class="desktop-app-body">${views[app.icon](state,ui)}</div></section>`;
}
