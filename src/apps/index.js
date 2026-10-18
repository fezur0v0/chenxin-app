import { APPS, findApp } from './catalog.js';
import { appPageHeader, escape } from '../ui.js';
import { diary } from './diary/view.js';
import { music } from './music/view.js';
import { gallery } from './gallery/view.js';
import { presets } from './presets/view.js';
import { worldbook } from './worldbook/view.js';
import { archives } from './archives/view.js';
import { appearance } from './appearance/view.js';
import { moom } from './moom/view.js';
import { memory } from '../views.js';
export { APPS, findApp };
const views={diary,music,gallery,presets,worldbook,archives,appearance};
export function appView(id,state,ui) {
 const app=findApp(id);
 if(!app)return '';
 if(app.icon==='moom')return moom(state,ui);
 if(app.icon==='memory')return memory(state);
 if(['music','worldbook','presets','gallery'].includes(app.icon))return `<section class="desktop-app ${app.icon}-app" data-app-page="${app.id}">${views[app.icon](state,ui)}</section>`;
 return `<section class="desktop-app ${app.icon}-app" data-app-page="${app.id}">${appPageHeader(app.name)}${app.icon==='diary'?'':`<p class="desktop-app-intro">${escape(app.subtitle)}</p>`}<div class="desktop-app-body">${views[app.icon](state,ui)}</div></section>`;
}
