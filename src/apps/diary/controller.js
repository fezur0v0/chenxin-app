import { diary, diaryEditor, diaryMoodOptions } from './view.js';
import { diaryDate, validDiaryDate, diaryCalendar, shiftDiaryMonth, saveDiaryEntry, saveDiaryMood } from './model.js';
import { bindDrawerDismiss,animateDrawerClose } from '../../drawer.js';
export function createDiaryApp({app,getState,setState,persist,notify}) {
 const today=diaryDate(),ui={month:today.slice(0,7),selected:today};
 const dialog=document.createElement('dialog');dialog.className='diary-editor glass app-sheet bottom-sheet';dialog.setAttribute('aria-label','日记编辑');document.body.append(dialog);
 let editingId='',returnFocus,closing=false,revision=0;
 async function close(){if(!dialog.open||closing)return;closing=true;const current=revision;await animateDrawerClose(dialog);if(current!==revision)return;dialog.close();closing=false;}
 bindDrawerDismiss(dialog,{panel:()=>dialog.open&&!closing?dialog:null,close,backdrop:true});
 dialog.addEventListener('cancel',event=>{event.preventDefault();void close();});
 function refresh(focusSelector) {
  const body=app.querySelector('.diary-app .desktop-app-body');if(!body)return;
  const scroller=app.querySelector('.page-content'),top=scroller.scrollTop;
  body.innerHTML=diary(getState(),ui);scroller.scrollTop=top;
  if(focusSelector)body.querySelector(focusSelector)?.focus({preventScroll:true});
 }
 function select(date,scroll=false) {
  if(!validDiaryDate(date))return;
  ui.selected=date;ui.month=date.slice(0,7);refresh(`[data-diary-date="${date}"]`);
  if(scroll)app.querySelector(`[data-entry-date="${date}"]`)?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }
 function open(entry) {
  revision++;closing=false;dialog.style.transform='';dialog.getAnimations().forEach(animation=>animation.cancel());
  returnFocus=document.activeElement;editingId=entry?.id||'';
  dialog.innerHTML=diaryEditor(entry,ui.selected,getState());
  bindMoodDrawing(dialog.querySelector('canvas'));
  const date=dialog.querySelector('[name=date]');date.required=true;date.min='0001-01-01';date.max='9999-12-31';
  dialog.querySelector('[name=title]').maxLength=80;
  dialog.showModal();dialog.querySelector('[data-diary-close]').focus({preventScroll:true});
 }
 function commit(change) {
  const previous=structuredClone(getState());
  try {
   const result=change(getState());
   if(!persist())throw new Error('日记尚未保存，本机存储不足或不可用。内容仍保留在这里，请备份后重试。');
   return result;
  } catch(error) {
   setState(previous);const alert=dialog.querySelector('[role=alert]');alert.hidden=false;alert.textContent=error.message;return null;
  }
 }
 app.addEventListener('click',event=>{
  const button=event.target.closest('.diary-app button');if(!button)return;
  if(button.dataset.diaryDate){select(button.dataset.diaryDate,true);return;}
  if(button.dataset.diaryEdit){const entry=getState().diaryEntries.find(e=>e.id===button.dataset.diaryEdit);if(entry)open(entry);return;}
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
  const form=dialog.querySelector('form');
  const canvas=form.querySelector('canvas');
  if(event.target.closest('[data-diary-mood-clear]')){clearMoodDrawing(canvas);return;}
  if(event.target.closest('[data-diary-mood-save]')){
   const name=form.elements['mood-name'],color=form.elements['mood-color'];
   const alert=form.querySelector('[role=alert]');alert.hidden=true;
   const mood=commit(state=>saveDiaryMood(state,{name:name.value,color:color.value,drawing:canvas.dataset.drawn?canvas.toDataURL('image/png'):''}));
   if(mood){
    const options=form.querySelector('.diary-mood-options');options.innerHTML=diaryMoodOptions(getState(),mood.name);
    name.value='';clearMoodDrawing(canvas);form.querySelector('.diary-custom-mood').open=false;
    options.querySelector(':checked')?.focus();notify('心情标签已添加。');
   }else{
    alert.scrollIntoView({block:'nearest'});
   }
   return;
  }

  if(event.target.closest('[data-diary-close]')){void close();return;}
  if(event.target.closest('[data-diary-delete]')&&confirm('删除这篇日记？删除后无法恢复。')) {
   const saved=commit(state=>{state.diaryEntries=state.diaryEntries.filter(e=>e.id!==editingId);return true;});
   if(saved){dialog.close();refresh('[data-diary-action=write]');notify('日记已删除。');}
  }
 });
 dialog.addEventListener('submit',event=>{
  event.preventDefault();const entry=commit(state=>saveDiaryEntry(state,Object.fromEntries(new FormData(event.target))));
  if(!entry)return;
  ui.month=entry.date.slice(0,7);ui.selected=entry.date;dialog.close();refresh(`[data-diary-edit="${CSS.escape(entry.id)}"]`);notify('日记已保存。');
 });
 dialog.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();dialog.querySelector('form').requestSubmit();}});
 dialog.addEventListener('close',()=>{if(dialog.open)return;revision++;closing=false;dialog.style.transform='';dialog.getAnimations().forEach(animation=>animation.cancel());const target=returnFocus?.isConnected?returnFocus:app.querySelector(editingId?`[data-diary-edit="${CSS.escape(editingId)}"]`:'.diary-write');target?.focus({preventScroll:true});});
 return {ui};
}

function clearMoodDrawing(canvas){
 canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
 delete canvas.dataset.drawn;
}
function bindMoodDrawing(canvas){
 const ctx=canvas.getContext('2d');
 if(!ctx)return;
 ctx.strokeStyle='#354155';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
 let pointerId,last;
 function draw(event){
  const box=canvas.getBoundingClientRect();
  const point=[(event.clientX-box.left)*canvas.width/box.width,(event.clientY-box.top)*canvas.height/box.height];
  ctx.beginPath();ctx.moveTo(...(last||[point[0]-.1,point[1]]));ctx.lineTo(...point);ctx.stroke();
  last=point;canvas.dataset.drawn='true';
 }
 canvas.addEventListener('pointerdown',event=>{
  if(pointerId!==undefined||event.button!==0)return;
  pointerId=event.pointerId;canvas.setPointerCapture(pointerId);draw(event);
 });
 canvas.addEventListener('pointermove',event=>{if(event.pointerId===pointerId)draw(event);});
 canvas.addEventListener('lostpointercapture',()=>{pointerId=undefined;last=undefined;});
}
