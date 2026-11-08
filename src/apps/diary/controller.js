import { diary, diaryEditor, diaryMoodOptions, moodEditorSheet } from './view.js';
import { diaryDate, validDiaryDate, diaryCalendar, shiftDiaryMonth, saveDiaryEntry, saveDiaryMood, updateDiaryMood, deleteDiaryMood, MOOD_POINT_LIMIT, MOOD_STROKE_LIMIT } from './model.js';
import { bindDrawerDismiss, animateDrawerClose } from '../../drawer.js';
const motionOk=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE='cubic-bezier(.22,.8,.2,1)';
export function createDiaryApp({app,getState,setState,persist,notify}) {
 const today=diaryDate(),ui={month:today.slice(0,7),selected:today};
 const dialog=document.createElement('dialog');dialog.className='diary-editor glass app-sheet bottom-sheet';dialog.setAttribute('aria-label','日记编辑');document.body.append(dialog);
 const moodDialog=document.createElement('dialog');moodDialog.className='diary-mood-sheet glass bottom-sheet';moodDialog.setAttribute('aria-label','心情');document.body.append(moodDialog);
 let editingId='',returnFocus,closing=false,revision=0;
 let moodReturn=null,moodClosing=false,moodRevision=0,moodState=null;
 const moodMotion=bindMoodMotion(moodDialog,{closed:()=>moodClosing,close:()=>finishMoodClose()});
 async function close(){if(!dialog.open||closing)return;closing=true;const current=revision;await animateDrawerClose(dialog);if(current!==revision)return;dialog.close();closing=false;}
 bindDrawerDismiss(dialog,{panel:()=>dialog.open&&!closing?dialog:null,close,backdrop:true});
 dialog.addEventListener('cancel',event=>{event.preventDefault();void close();});
 moodDialog.addEventListener('cancel',event=>{event.preventDefault();void closeMood();});
 moodDialog.addEventListener('close',()=>{moodRevision++;moodClosing=false;moodState=null;moodDialog.style.transform='';moodDialog.classList.remove('is-full');const target=moodReturn?.isConnected?moodReturn:dialog.querySelector('[data-diary-mood-add]');target?.focus({preventScroll:true});});
 function refresh(focusSelector) {
  const body=app.querySelector('.diary-app .desktop-app-body');if(!body)return;
  const scroller=app.querySelector('.page-content'),top=scroller.scrollTop;
  body.innerHTML=diary(getState(),ui);scroller.scrollTop=top;
  if(focusSelector)body.querySelector(focusSelector)?.focus({preventScroll:true});
 }
 function select(date,scroll=false) {
  if(!validDiaryDate(date))return;
  ui.selected=date;ui.month=date.slice(0,7);refresh(`[data-diary-date="${date}"]`);
  if(scroll){
   const reducedMotion=!motionOk();
   if(!reducedMotion)app.querySelector(`[data-diary-date="${date}"] .diary-day-number`)?.animate([
    {transform:'scale(.93)'},{transform:'scale(1.055)',offset:.64},{transform:'scale(1)'},
   ],{duration:230,easing:'ease-out'});
   app.querySelector(`[data-entry-date="${date}"]`)?.scrollIntoView({block:'nearest',behavior:reducedMotion?'auto':'smooth'});
  }
 }
 function open(entry) {
  revision++;closing=false;dialog.style.transform='';dialog.getAnimations().forEach(animation=>animation.cancel());
  returnFocus=document.activeElement;editingId=entry?.id||'';
  dialog.innerHTML=diaryEditor(entry,ui.selected,getState());
  const date=dialog.querySelector('[name=date]');date.required=true;date.min='0001-01-01';date.max='9999-12-31';
  dialog.querySelector('[name=title]').maxLength=80;
  dialog.showModal();dialog.querySelector('[data-diary-close]').focus({preventScroll:true});
 }
 function commit(change,alert) {
  const previous=structuredClone(getState());
  try {
   const result=change(getState());
   if(!persist())throw new Error('日记尚未保存，本机存储不足或不可用。内容仍保留在这里，请备份后重试。');
   return result;
  } catch(error) {
   setState(previous);const target=alert?.isConnected?alert:dialog.querySelector('[role=alert]');if(target){target.hidden=false;target.textContent=error.message;}return null;
  }
 }
 function selectedMood(){return dialog.querySelector('.diary-mood-options input:checked')?.value||'';}
 function replaceMoodOptions(selected){
  const options=dialog.querySelector('.diary-mood-options');if(!options)return;
  const left=options.scrollLeft;options.innerHTML=diaryMoodOptions(getState(),selected);options.scrollLeft=left;
 }
 function closeMood(){
  if(!moodDialog.open||moodClosing)return;
  moodClosing=true;const current=moodRevision;
  moodMotion.snap('closed',()=>{if(current!==moodRevision)return;finishMoodClose();});
 }
 function finishMoodClose(){if(moodDialog.open)moodDialog.close();moodClosing=false;}
 function openMood(name){
  const state=getState();
  const existing=name?(state.diaryMoods||[]).find(mood=>mood.name===name):null;
  if(name&&!existing)return;
  if(!existing&&(state.diaryMoods||[]).length>=12){notify('最多添加 12 个自定义心情。');return;}
  moodRevision++;moodClosing=false;moodReturn=document.activeElement;
  const color=existing?.color||'#f6a5b8';
  const legacy=existing&&!existing.strokes?.length?existing.drawing:'';
  moodDialog.innerHTML=moodEditorSheet({title:existing?'修改心情':'新的心情',name:existing?.name||'',color,legacy,editing:!!existing});
  moodDialog.setAttribute('aria-label',existing?'修改心情':'新的心情');
  moodState=createMoodCanvas(moodDialog,{strokes:existing?.strokes||[],legacy:!!legacy,editing:!!existing,notify});
  moodDialog.showModal();
  moodMotion.open();
  moodState.resize();
  moodDialog.querySelector('[name=mood-name]')?.focus({preventScroll:true});
 }
 let press=null,suppressChip=false;
 function cancelPress(){if(press)clearTimeout(press.timer);press=null;}
 dialog.addEventListener('pointerdown',event=>{
  const chip=event.target.closest('[data-mood-custom]');if(!chip||event.button!==0)return;
  cancelPress();
  const checked=selectedMood();
  press={name:chip.dataset.moodCustom,x:event.clientX,y:event.clientY,checked,fired:false,timer:setTimeout(()=>{if(!press)return;press.fired=true;suppressChip=true;moodDialog.dataset.ignoreClick='1';openMood(press.name);setTimeout(()=>delete moodDialog.dataset.ignoreClick,600);},500)};
 });
 dialog.addEventListener('pointermove',event=>{if(press&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>8)cancelPress();});
 dialog.addEventListener('pointerup',()=>{if(press&&!press.fired)cancelPress();});
 dialog.addEventListener('pointercancel',cancelPress);
 dialog.addEventListener('contextmenu',event=>{
  const chip=event.target.closest('[data-mood-custom]');if(!chip)return;
  event.preventDefault();const checked=selectedMood();cancelPress();suppressChip=true;press={checked,fired:true};moodDialog.dataset.ignoreClick='1';openMood(chip.dataset.moodCustom);setTimeout(()=>delete moodDialog.dataset.ignoreClick,600);
 });
 app.addEventListener('click',event=>{
  const button=event.target.closest('.diary-app button');if(!button)return;
  if(button.dataset.diaryDate){select(button.dataset.diaryDate,true);return;}
  if(button.dataset.diaryEdit){const entry=getState().diaryEntries.find(item=>item.id===button.dataset.diaryEdit);if(entry)open(entry);return;}
  const action=button.dataset.diaryAction;
  if(action==='write')open();
  if(action==='today')select(diaryDate());
  if(action==='previous'||action==='next') {
   ui.month=shiftDiaryMonth(ui.month,action==='next'?1:-1);
   const last=diaryCalendar(ui.month).filter(Boolean).at(-1),day=Math.min(Number(ui.selected.slice(-2)),Number(last.slice(-2)));
   ui.selected=`${ui.month}-${String(day).padStart(2,'0')}`;
   refresh(`[data-diary-action="${action}"]`);
  }
 });
 app.addEventListener('keydown',event=>{
  const button=event.target.closest('[data-diary-date]');if(!button)return;
  const date=new Date(`${button.dataset.diaryDate}T12:00:00`),offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-date.getDay(),End:6-date.getDay()}[event.key];
  if(offset===undefined||event.altKey||event.ctrlKey||event.metaKey)return;
  event.preventDefault();date.setDate(date.getDate()+offset);select(diaryDate(date));
 });
 dialog.addEventListener('click',event=>{
  if(suppressChip&&event.target.closest('[data-mood-custom]')){
   event.preventDefault();event.stopPropagation();
   const previous=dialog.querySelector(`.diary-mood-options input[value="${CSS.escape(press?.checked||'')}"]`);
   if(previous)previous.checked=true;
   suppressChip=false;press=null;return;
  }
  if(event.target.closest('[data-diary-mood-add]')){openMood();return;}
  if(event.target.closest('[data-diary-close]')){void close();return;}
  if(event.target.closest('[data-diary-delete]')&&confirm('删除这篇日记？删除后无法恢复。')) {
   const saved=commit(state=>{state.diaryEntries=state.diaryEntries.filter(entry=>entry.id!==editingId);return true;});
   if(saved){dialog.close();refresh('[data-diary-action=write]');notify('日记已删除。');}
  }
 },true);
 dialog.addEventListener('submit',event=>{
  event.preventDefault();const entry=commit(state=>saveDiaryEntry(state,Object.fromEntries(new FormData(event.target))));
  if(!entry)return;
  ui.month=entry.date.slice(0,7);ui.selected=entry.date;dialog.close();refresh(`[data-diary-edit="${CSS.escape(entry.id)}"]`);notify('日记已保存。');
 });
 dialog.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();dialog.querySelector('form').requestSubmit();}});
 dialog.addEventListener('close',()=>{if(dialog.open)return;revision++;closing=false;dialog.style.transform='';dialog.getAnimations().forEach(animation=>animation.cancel());const target=returnFocus?.isConnected?returnFocus:app.querySelector(editingId?`[data-diary-edit="${CSS.escape(editingId)}"]`:'.diary-write');target?.focus({preventScroll:true});});
 moodDialog.addEventListener('click',event=>{
  if(moodDialog.dataset.ignoreClick){delete moodDialog.dataset.ignoreClick;event.preventDefault();event.stopPropagation();return;}
  if(event.target===moodDialog){const rect=moodDialog.getBoundingClientRect();if(event.clientY<rect.top||event.clientX<rect.left||event.clientX>rect.right)void closeMood();return;}
  if(event.target.closest('[data-mood-close]')){void closeMood();return;}
  const swatch=event.target.closest('[data-mood-color]');
  if(swatch&&!moodState?.draggingColor()){moodState?.setColor(swatch.dataset.moodColor);moodState?.resetDelete();return;}
  if(event.target.closest('[data-mood-tool="pen"]')){moodState?.setTool('pen');return;}
  if(event.target.closest('[data-mood-tool="eraser"]')){moodState?.setTool('eraser');return;}
  if(event.target.closest('[data-mood-size]')){moodState?.toggleSize();return;}
  if(event.target.closest('[data-mood-undo]')){moodState?.undo();return;}
  if(event.target.closest('[data-mood-clear]')){moodState?.clear();return;}
  if(event.target.closest('[data-mood-delete]')){moodState?.confirmDelete(removeMood);return;}
 });
 moodDialog.addEventListener('input',event=>{
  if(event.target.name==='mood-name')moodState?.syncSave();
  if(event.target.type==='range')moodState?.setBrush(event.target.value);
 });
 moodDialog.addEventListener('submit',event=>{
  event.preventDefault();
  const alert=moodDialog.querySelector('[role=alert]');alert.hidden=true;
  const draft=moodState?.draft();if(!draft){alert.hidden=false;alert.textContent=moodState?.editing?'先画一笔，或撤销到原来的表情。':'先画一张脸吧。';return;}
  const previousName=moodState.previousName;
  const saved=commit(state=>previousName?updateDiaryMood(state,previousName,draft):saveDiaryMood(state,draft),alert);
  if(!saved){alert.scrollIntoView({block:'nearest'});return;}
  const selected=selectedMood();
  const next=!previousName||selected===previousName?saved.name:selected;
  replaceMoodOptions(next);
  refresh();
  finishMoodClose();
  notify(previousName?'心情已修改。':'心情已保存。');
  dialog.querySelector('.diary-mood-options input:checked')?.focus();
 });
 function removeMood(){
  const alert=moodDialog.querySelector('[role=alert]');alert.hidden=true;
  const name=moodState?.previousName;if(!name)return;
  const saved=commit(state=>{deleteDiaryMood(state,name);return true;},alert);
  if(!saved)return;
  const selected=selectedMood()===name?'':selectedMood();
  replaceMoodOptions(selected);refresh();finishMoodClose();notify('心情已删除。相关日记改为不标记，主页心情回到平静。');
 }
 return {ui};
}

function createMoodCanvas(dialog,{strokes,legacy,editing,notify}) {
 const canvas=dialog.querySelector('canvas'),pad=dialog.querySelector('.diary-mood-pad'),ctx=canvas.getContext('2d');
 const name=dialog.querySelector('[name=mood-name]'),save=dialog.querySelector('.diary-mood-save');
 const undo=dialog.querySelector('[data-mood-undo]'),clearButton=dialog.querySelector('[data-mood-clear]');
 const sizePop=dialog.querySelector('.diary-mood-size'),sizeInput=sizePop.querySelector('input'),dot=dialog.querySelector('[data-brush-dot]');
 const legacyImage=dialog.querySelector('.diary-mood-legacy');
 const original=strokes.map(stroke=>({points:stroke.points.map(point=>[point[0],point[1]]),width:stroke.width,erase:stroke.erase===true}));
 const drawing=original.map(stroke=>({points:stroke.points.map(point=>[...point]),width:stroke.width,erase:stroke.erase}));
 let tool='pen',brush=4,active=null,color=dialog.querySelector('[data-mood-color][aria-pressed=true]')?.dataset.moodColor||'#f6a5b8';
 const same=()=>JSON.stringify(drawing)===JSON.stringify(original);
 const penStroke=()=>drawing.some(stroke=>!stroke.erase);
 function paintDot(){const size=Math.max(4,brush*2.2);dot.style.width=`${size}px`;dot.style.height=`${size}px`;}
 function syncButtons(){
  const dirty=!same();
  const ready=name.value.trim().length>0&&name.value.trim().length<=12&&(penStroke()||(editing&&!dirty));
  save.setAttribute('aria-disabled',String(!ready));undo.disabled=!drawing.length;clearButton.disabled=!drawing.length;
  if(legacyImage)legacyImage.hidden=penStroke();
 }
 function draw(){
  const width=canvas.width,scale=width/64;ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.lineCap='round';ctx.lineJoin='round';const ink=getComputedStyle(canvas).color;
  for(const stroke of drawing){
   ctx.globalCompositeOperation=stroke.erase?'destination-out':'source-over';
   ctx.strokeStyle=ink;ctx.lineWidth=stroke.width*scale;const points=stroke.points;
   ctx.beginPath();ctx.moveTo(points[0][0]*scale,points[0][1]*scale);
   if(points.length===1)ctx.lineTo(points[0][0]*scale+.01,points[0][1]*scale);
   for(const point of points)ctx.lineTo(point[0]*scale,point[1]*scale);
   ctx.stroke();
  }
  ctx.globalCompositeOperation='source-over';syncButtons();
 }
 function resize(){
  const rect=canvas.getBoundingClientRect();if(rect.width<2||rect.height<2)return;
  const dpr=Math.max(1,Math.min(window.devicePixelRatio||1,3));
  const width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  draw();
 }
 const observer=new ResizeObserver(()=>resize());observer.observe(pad);
 const theme=new MutationObserver(()=>{if(dialog.open)draw();});
 theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','style']});
 dialog.addEventListener('close',()=>{observer.disconnect();theme.disconnect();},{once:true});
 function point(event){
  const rect=canvas.getBoundingClientRect();
  const x=Math.max(0,Math.min(64,(event.clientX-rect.left)/rect.width*64));
  const y=Math.max(0,Math.min(64,(event.clientY-rect.top)/rect.height*64));
  return [Math.round(x*10)/10,Math.round(y*10)/10];
 }
 canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||active)return;
  if(drawing.length>=MOOD_STROKE_LIMIT){notify('笔画太多了，先撤销几笔。');return;}
  sizePop.hidden=true;dialog.querySelector('[data-mood-size]')?.setAttribute('aria-expanded','false');
  resetDelete();
  canvas.setPointerCapture(event.pointerId);
  active={id:event.pointerId,points:[point(event)]};
  drawing.push({points:active.points,width:brush,erase:tool==='eraser'});
  draw();
 });
 canvas.addEventListener('pointermove',event=>{
  if(!active||active.id!==event.pointerId)return;
  const next=point(event),last=active.points[active.points.length-1];
  if(Math.hypot(next[0]-last[0],next[1]-last[1])<.6)return;
  if(active.points.length>=MOOD_POINT_LIMIT)active.points[active.points.length-1]=next;
  else active.points.push(next);
  draw();
 });
 const endStroke=event=>{if(active&&(!event||active.id===event.pointerId))active=null;};
 canvas.addEventListener('pointerup',endStroke);canvas.addEventListener('pointercancel',endStroke);
 let colorDrag=null,colorMoved=false;
 const colors=dialog.querySelector('.diary-mood-colors');
 colors.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||event.button!==0)return;colorDrag={x:event.clientX,left:colors.scrollLeft};colorMoved=false;});
 dialog.addEventListener('pointermove',event=>{if(!colorDrag)return;const delta=event.clientX-colorDrag.x;if(Math.abs(delta)>4){colorMoved=true;colors.style.scrollSnapType='none';}colors.scrollLeft=colorDrag.left-delta;});
 dialog.addEventListener('pointerup',()=>{if(!colorDrag)return;colorDrag=null;colors.style.scrollSnapType='';setTimeout(()=>{colorMoved=false;},0);});
 function resetDelete(){const button=dialog.querySelector('[data-mood-delete]'),note=dialog.querySelector('[data-mood-delete-note]');if(!button)return;button.classList.remove('is-confirm');button.textContent='删除这个心情';if(note)note.hidden=true;button.dataset.confirm='';}
  paintDot();syncButtons();
 return {
  editing,previousName:editing?name.defaultValue:'',
  resize,resetDelete,syncSave:syncButtons,
  draggingColor:()=>colorMoved,
  setColor(next){
   color=next;pad.style.setProperty('--mood',next);
   for(const button of colors.querySelectorAll('[data-mood-color]'))button.setAttribute('aria-pressed',String(button.dataset.moodColor===next));
   colors.querySelector('[aria-pressed=true]')?.scrollIntoView({inline:'nearest',block:'nearest'});
  },
  setTool(next){tool=next;dialog.querySelector('[data-mood-tool=pen]').setAttribute('aria-pressed',String(next==='pen'));dialog.querySelector('[data-mood-tool=eraser]').setAttribute('aria-pressed',String(next==='eraser'));sizePop.hidden=true;},
  toggleSize(){sizePop.hidden=!sizePop.hidden;dialog.querySelector('[data-mood-size]').setAttribute('aria-expanded',String(!sizePop.hidden));},
  setBrush(value){brush=Number(value);sizeInput.value=String(brush);paintDot();},
  undo(){drawing.pop();draw();resetDelete();},
  clear(){drawing.splice(0,drawing.length);draw();resetDelete();},
  draft(){
   const label=name.value.trim();
   if(!label||label.length>12)return null;
   const dirty=!same();
   if(!penStroke()&&(!editing||dirty))return null;
   const data={name:label,color};
   if(dirty&&penStroke())data.strokes=drawing.map(stroke=>({points:stroke.points.map(point=>[point[0],point[1]]),width:stroke.width,erase:stroke.erase}));
   return data;
  },
  confirmDelete(remove){
   const button=dialog.querySelector('[data-mood-delete]'),note=dialog.querySelector('[data-mood-delete-note]');
   if(button.dataset.confirm!=='yes'){button.dataset.confirm='yes';button.classList.add('is-confirm');button.textContent='再点一次确认删除';if(note)note.hidden=false;return;}
   remove();
  },
 };
}

function bindMoodMotion(dialog,{closed,close}) {
 let mode='default',offset=0,defaultOffset=0,drag=null,suppressClick=false,settling=false;
 const apply=(y,animate)=>{
  offset=Math.max(0,y);
  dialog.classList.toggle('is-full',mode==='full'&&offset<=.5);
  dialog.style.transition=animate&&motionOk()?`transform 300ms ${EASE},border-radius 300ms ${EASE}`:'none';
  dialog.style.transform=`translate3d(0,${offset}px,0)`;
 };
 const place=()=>{
  const previous={height:dialog.style.height,transform:dialog.style.transform,padding:dialog.style.paddingBottom,transition:dialog.style.transition};
  dialog.style.transition='none';dialog.style.height='auto';dialog.style.paddingBottom='0px';
  const natural=dialog.offsetHeight;
  const visible=Math.min(natural,Math.round(window.innerHeight*.86));
  defaultOffset=Math.max(0,window.innerHeight-visible);
  dialog.style.height='100dvh';
  dialog.style.paddingBottom=mode==='full'?'0px':`${defaultOffset}px`;
  dialog.style.transform=previous.transform||`translate3d(0,${window.innerHeight}px,0)`;
  dialog.style.transition=previous.transition;
  if(!previous.height)dialog.style.transform=`translate3d(0,${window.innerHeight}px,0)`;
 };
 function snap(next,done){
  if(next==='closed')settling=true;
  mode=next==='closed'?mode:next;
  dialog.style.paddingBottom=next==='full'?'0px':`${defaultOffset}px`;
  dialog.style.transition='none';
  dialog.style.transform=`translate3d(0,${offset}px,0)`;
  dialog.offsetHeight;
  const target=next==='closed'?window.innerHeight:next==='full'?0:defaultOffset;
  dialog.classList.toggle('is-full',next==='full');
  if(motionOk())dialog.style.transition=`transform 300ms ${EASE},border-radius 300ms ${EASE}`;
  offset=target;dialog.style.transform=`translate3d(0,${target}px,0)`;
  if(next!=='closed')return;
  if(!motionOk()){done?.();return;}
  const timer=setTimeout(()=>done?.(),340);
  dialog.addEventListener('transitionend',event=>{if(event.propertyName!=='transform')return;clearTimeout(timer);done?.();},{once:true});
 }
 function track(event){
  if(!drag||drag.id!==event.pointerId)return;
  const dy=event.clientY-drag.y;
  if(Math.abs(dy)>5)drag.moved=true;
  const dt=event.timeStamp-drag.lastT;
  if(dt>0)drag.vy=(event.clientY-drag.lastY)/dt;
  drag.lastY=event.clientY;drag.lastT=event.timeStamp;
  apply(Math.min(window.innerHeight,Math.max(0,drag.start+dy)),false);
 }
 function release(event){
  if(!drag||(event&&drag.id!==event.pointerId))return;
  document.removeEventListener('pointermove',track);
  document.removeEventListener('pointerup',release);
  document.removeEventListener('pointercancel',release);
  const active=drag;drag=null;suppressClick=active.moved;
  const dy=(event?.clientY??active.lastY)-active.y;
  if(!active.moved){if(active.handle)snap(mode==='full'?'default':'full');return;}
  if(!active.wasFull&&dy>0&&offset>=defaultOffset-1){snap(dy>90||active.vy>.5?'closed':'default',close);return;}
  const visible=window.innerHeight-offset,full=window.innerHeight,rest=window.innerHeight-defaultOffset,mid=(rest+full)/2;
  const goFull=active.vy<-.4?true:active.vy>.4?false:visible>mid;
  snap(goFull?'full':'default');
 }
 dialog.addEventListener('pointerdown',event=>{
  if(event.button!==0||closed()||settling||drag)return;
  if(event.target.closest('[data-mood-close]'))return;
  const handle=event.target.closest('[data-mood-handle]'),heading=event.target.closest('[data-mood-drag]');
  if(!handle&&!heading)return;
  if(event.target.closest('canvas,.diary-mood-colors,.diary-mood-pad'))return;
  try{dialog.setPointerCapture(event.pointerId);}catch{}
  dialog.style.transition='none';
  drag={id:event.pointerId,y:event.clientY,start:offset,moved:false,handle:!!handle,wasFull:mode==='full',lastY:event.clientY,lastT:event.timeStamp,vy:0};
  suppressClick=false;
  document.addEventListener('pointermove',track);
  document.addEventListener('pointerup',release);
  document.addEventListener('pointercancel',release);
 });
 dialog.addEventListener('click',event=>{
  if(event.target.closest('[data-mood-handle]')&&suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}
 },true);
 window.addEventListener('resize',()=>{if(!dialog.open||closed())return;const next=mode;place();snap(next);});
 return {open(){settling=false;mode='default';place();offset=window.innerHeight;dialog.style.transition='none';dialog.style.transform=`translate3d(0,${offset}px,0)`;requestAnimationFrame(()=>requestAnimationFrame(()=>snap('default')));},snap,consumed:()=>suppressClick};
}
