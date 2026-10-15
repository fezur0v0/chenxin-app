import { worldbook,worldEntryEditor } from '../worldbook/view.js';
import { presets,promptEditor,parameterEditor } from '../presets/view.js';
import { newWorldbook,importWorldbook,saveWorldEntry } from '../worldbook/model.js';
import { newPreset,importPreset,savePrompt,saveParameters,mutableOrder,promptOrder,CORE_PROMPTS } from '../presets/model.js';
import { parseLibraryFile } from './model.js';
import { toolButton } from './view.js';
import { field } from '../../ui.js';
import { drawerHeader,bindDrawerDismiss,animateDrawerClose } from '../../drawer.js';
export function createPromptLibraries({app,getState,setState,persist,notify}) {
 const ui={worldbook:{selected:'',search:''},presets:{selected:'',search:'',tab:'prompts'}},views={worldbook,presets};
 const sheet=document.createElement('dialog');sheet.className='app-sheet library-sheet glass bottom-sheet';document.body.append(sheet);
 const picker=document.createElement('input');picker.type='file';picker.accept='.json,application/json';picker.hidden=true;document.body.append(picker);
 let editor=null,origin=null,revision=0,closing=false,importKind='';
 const key=kind=>kind==='worldbook'?'worldbooks':'promptPresets';
 const selected=kind=>(getState()[key(kind)]||[]).find(item=>item.id===ui[kind].selected);
 function refresh(kind,focus='',top=false) {
  const scope=app.querySelector(`.${kind}-app`);if(!scope)return;
  const scroller=app.querySelector('.page-content'),scroll=scroller.scrollTop;
  scope.innerHTML=views[kind](getState(),ui[kind]);scroller.scrollTop=top?0:scroll;
  if(focus)scope.querySelector(focus)?.focus({preventScroll:true});
 }
 function error(message) {const alert=sheet.querySelector('[role=alert]');if(sheet.open&&alert){alert.hidden=false;alert.textContent=message;}else notify(message);}
 function commit(change) {
  const previous=structuredClone(getState());
  try{const result=change(getState());if(!persist())throw new Error('修改尚未保存，编辑内容仍保留。请释放本机存储空间后重试。');return {result};}
  catch(failure){setState(previous);error(failure.message);return null;}
 }
 async function close() {
  if(!sheet.open||closing)return;
  closing=true;const current=revision;await animateDrawerClose(sheet);
  if(current!==revision)return;
  sheet.close();closing=false;
 }
 bindDrawerDismiss(sheet,{panel:()=>sheet.open&&!closing?sheet:null,close,backdrop:true});
 sheet.addEventListener('cancel',event=>{event.preventDefault();void close();});
 sheet.addEventListener('close',()=>{if(sheet.open)return;revision++;closing=false;sheet.style.transform='';sheet.getAnimations().forEach(animation=>animation.cancel());if(origin?.isConnected)origin.focus({preventScroll:true});else if(editor)app.querySelector(`.${editor.kind}-app h1`)?.focus({preventScroll:true});});
 function open(kind,type,id='') {
  revision++;closing=false;sheet.style.transform='';sheet.getAnimations().forEach(animation=>animation.cancel());if(!sheet.open)origin=document.activeElement;
  editor={kind,type,id};const item=selected(kind),isWorld=kind==='worldbook';let title='',body='',deletable=false,save=true;
  if(type==='new'||type==='manage') {
   title=type==='new'?(isWorld?'新建世界书':'新建预设'):'管理'+(isWorld?'世界书':'预设');
   body=field(isWorld?'世界书名称':'预设名称','name',type==='manage'?item.name:'',isWorld?'给这个世界取个名字':'例如：日常陪伴');
   if(type==='manage'){body+=`<div class="library-management">${toolButton('export','导出 JSON','download')}${toolButton('delete-library','删除'+(isWorld?'世界书':'预设'),'trash','class="library-destructive"')}</div>`;}
  }else if(type==='entry') {
   title=id?'编辑条目':'添加条目';body=worldEntryEditor(item.raw.entries[id]);deletable=Boolean(id);
  }else if(type==='prompt') {
   const prompt=item.raw.prompts.find(value=>value.identifier===id);title=prompt?.marker?'上下文位置':id?'编辑提示词':'添加提示词';body=promptEditor(item,prompt);
   deletable=Boolean(id)&&!Object.hasOwn(CORE_PROMPTS,id)&&!prompt?.marker;save=!prompt?.marker;
   if(prompt?.marker&&!promptOrder(item).some(value=>value.identifier===id))body+=toolButton('insert-marker','加入编排','plus','class="library-secondary"');
  }else if(type==='parameters') {title='调整生成参数';body=parameterEditor(item);}
  sheet.setAttribute('aria-label',title);
  sheet.innerHTML=`${drawerHeader({title,action:'close',actionAttribute:'data-tool-action'})}<p class="library-form-error" role="alert" hidden></p><form id="library-editor-form">${body}${save?`<footer class="library-editor-footer">${deletable?toolButton('delete-item','删除','','class="library-destructive"'):'<span></span>'}<button type="submit" class="library-primary">保存</button></footer>`:''}</form>`;
  sheet.querySelectorAll('input[name=name]').forEach(input=>{input.required=true;input.maxLength=80;});
  const content=sheet.querySelector('[name=content]');if(content&&isWorld)content.required=true;
  sheet.showModal();sheet.querySelector('.drawer-handle').focus({preventScroll:true});
 }
 function download(item) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(item.raw,null,2)],{type:'application/json'})),anchor=document.createElement('a');anchor.href=url;anchor.download=item.name.replace(/[\\/:*?"<>|]/g,'_')+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function handle(event) {
  const button=event.target.closest('[data-tool-action]');if(!button)return;
  const kind=sheet.contains(button)?editor?.kind:button.closest('[data-app-page]')?.dataset.appPage.slice(4);if(!ui[kind])return;
  const action=button.dataset.toolAction,id=button.dataset.item,item=selected(kind),local=ui[kind];
  if(action==='close'){void close();return;}
  if(action==='library'){local.selected='';local.search='';refresh(kind,'h1',true);return;}
  if(action==='open'){local.selected=id;local.search='';local.tab='prompts';refresh(kind,'h1',true);return;}
  if(action==='new'||action==='manage'){open(kind,action);return;}
  if(action==='import'){importKind=kind;picker.value='';picker.click();return;}
  if(!item)return;
  if(action==='tab'){local.tab=button.dataset.tab;refresh(kind,`[data-tab="${local.tab}"]`);return;}
  if(action==='new-entry'||action==='edit-entry'){open(kind,'entry',id);return;}
  if(action==='new-prompt'||action==='edit-prompt'){open(kind,'prompt',id);return;}
  if(action==='parameters'){open(kind,'parameters');return;}
  if(action==='export'){download(item);return;}
  if(action==='delete-library'){
   if(!confirm('删除这份配置及其条目？此操作无法撤销。'))return;
   if(commit(state=>{state[key(kind)]=state[key(kind)].filter(value=>value.id!==item.id);if(state.activePromptPreset===item.id)state.activePromptPreset='';return true;})){sheet.close();local.selected='';local.search='';refresh(kind,'h1');}return;
  }
  if(action==='delete-item') {
   if(!confirm('删除这条内容？此操作无法撤销。'))return;
   if(commit(()=>{if(kind==='worldbook')delete item.raw.entries[editor.id];else{item.raw.prompts=item.raw.prompts.filter(value=>value.identifier!==editor.id);for(const group of item.raw.prompt_order||[])group.order=group.order.filter(value=>value.identifier!==editor.id);}return true;})){sheet.close();refresh(kind,'h1');}return;
  }
  if(action==='toggle-entry'){if(commit(()=>{item.raw.entries[id].disable=!item.raw.entries[id].disable;return true;}))refresh(kind,`[data-tool-action=toggle-entry][data-item="${CSS.escape(id)}"]`);return;}
  if(action==='toggle-prompt'){if(commit(()=>{const row=mutableOrder(item).find(value=>value.identifier===id);row.enabled=row.enabled===false;return true;}))refresh(kind,`[data-tool-action=toggle-prompt][data-item="${CSS.escape(id)}"]`);return;}
  if(action==='select-preset'){if(commit(state=>{state.activePromptPreset=item.id;return true;}))refresh(kind,'[data-tool-action=select-preset]');return;}
  if(action==='insert-marker'){if(commit(()=>{mutableOrder(item).push({identifier:editor.id,enabled:true});return true;})){sheet.close();refresh(kind,'h1');}}
 }
 app.addEventListener('click',event=>{if(event.target.closest('[data-tool-action]')){event.stopImmediatePropagation();handle(event);}});
 sheet.addEventListener('click',handle);
 app.addEventListener('input',event=>{
  if(!event.target.matches('[data-tool-search]')||event.isComposing)return;
  const kind=event.target.closest('[data-app-page]').dataset.appPage.slice(4);ui[kind].search=event.target.value;refresh(kind,'[data-tool-search]');
 });
 sheet.addEventListener('submit',event=>{
  event.preventDefault();const {kind,type,id}=editor,data=Object.fromEntries(new FormData(event.target)),item=selected(kind);
  const saved=commit(state=>{
   if(type==='new'){if(state[key(kind)].length>=60)throw new Error('最多保存 60 份配置。');const next=kind==='worldbook'?newWorldbook(data.name):newPreset(data.name);state[key(kind)].unshift(next);return next.id;}
   if(type==='manage'){item.name=data.name.trim().slice(0,80);return item.id;}
   if(type==='entry')return saveWorldEntry(item,id,data);
   if(type==='prompt')return savePrompt(item,id,data);
   if(type==='parameters'){saveParameters(item,data);return item.id;}
  });
  if(!saved)return;if(type==='new'){ui[kind].selected=saved.result;ui[kind].search='';ui[kind].tab='prompts';}
  if(type==='entry')ui[kind].search='';
  sheet.close();refresh(kind,'h1');notify('已保存到本机。');
 });
 picker.addEventListener('change',async()=>{
  const file=picker.files[0],kind=importKind,expected=getState();if(!file)return;
  try{if(file.size>1500000)throw new Error('文件最多支持 1.5 MB。');const payload=parseLibraryFile(await file.text());if(expected!==getState())throw new Error('数据已切换，请重新选择文件。');const item=kind==='worldbook'?importWorldbook(payload,file.name):importPreset(payload,file.name);
   if(!commit(state=>{if(state[key(kind)].length>=60)throw new Error('最多保存 60 份配置。');state[key(kind)].unshift(item);return true;}))return;
   ui[kind].selected=item.id;ui[kind].search='';ui[kind].tab='prompts';refresh(kind,'h1',true);notify(kind==='worldbook'?'世界书已导入。':'提示词和生成参数已导入；连接设置保持原样。');
  }catch(failure){notify(failure.message);}
 });
 return {ui};
}
