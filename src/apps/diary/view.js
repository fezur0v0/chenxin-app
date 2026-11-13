import { escape, field } from '../../ui.js';
import { icon } from '../../icons.js';
import { drawerHeader } from '../../drawer.js';
import { DIARY_MOODS, MOOD_FACES, diaryMoods, diaryDate, diaryCalendar, diaryMonthEntries, moodVectorSvg } from './model.js';
const weekday=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const localDate=value=>new Date(`${value}T12:00:00`);
export const MOOD_SWATCHES=['#f6a5b8','#f4d66e','#9fd8b5','#8ec5e8','#b7a2e2','#f5b98a','#e88f8f','#f2c6a0','#c9e38a','#7fd1d1','#a8b8f0','#d9a6e0','#c7b8a3','#9aa5b5'];
const toolSvg={
 palette:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 100 18h1a2.5 2.5 0 002-4c-.7-.9-.1-2 1-2h1a4 4 0 004-4c0-4.4-4-8-9-8Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="11" cy="7" r=".8"/><circle cx="15.5" cy="8" r=".8"/></svg>',
 pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l4-1L19 8a2.1 2.1 0 00-3-3L5 16z"/></svg>',
 eraser:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 20h12M5 16l9-9 5 5-6 6H9z"/><path d="M10 11l5 5"/></svg>',
 undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></svg>',
 clear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
};
let faceSerial=0;
export function renderMoodGraphic(mood,prefix) {
 const id=`${prefix||'mf'}${faceSerial++}`;
 if(mood?.strokes?.length){
  const body=moodVectorSvg(mood.strokes,id);
  return body?`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`:'';
 }
 if(mood?.drawing)return `<img src="${escape(mood.drawing)}" alt="" draggable="false">`;
 const builtin=MOOD_FACES[mood?.name]||'';
 return builtin?`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${builtin}</svg>`:'';
}
function moodPill(state,entry) {
 const mood=diaryMoods(state).find(item=>item.name===entry.mood);
 const color=mood?.color||'var(--muted)';
 const face=mood?`<span class="diary-mood-face">${renderMoodGraphic(mood,'tl')}</span>`:'';
 return `<span class="diary-mood" style="--mood:${color}">${face}${escape(entry.mood||'未标记')}</span>`;
}
export function diary(state,ui={}) {
 const today=diaryDate(),month=ui.month||today.slice(0,7),selected=ui.selected||today;
 const entries=diaryMonthEntries(state.diaryEntries,month),monthDate=localDate(`${month}-01`);
 const moodColor=name=>diaryMoods(state).find(item=>item.name===name)?.color||'var(--muted)';
 const focusDate=selected.startsWith(month)?selected:`${month}-01`;
 return `<section class="diary-calendar app-panel glass" aria-label="${Number(month.slice(0,4))}年${monthDate.getMonth()+1}月日历">
  <header class="diary-calendar-header"><div class="diary-month"><h2 lang="en">${monthDate.toLocaleDateString('en-US',{month:'long'})}</h2><span>${month.slice(0,4)}</span></div><div class="diary-month-controls"><button data-diary-action="previous" aria-label="上个月" ${month==='0001-01'?'disabled':''}>${icon('back')}</button><button data-diary-action="next" aria-label="下个月" ${month==='9999-12'?'disabled':''}>${icon('chevron')}</button></div></header>
  <div class="diary-weekdays" aria-hidden="true">${['S','M','T','W','T','F','S'].map(day=>`<span>${day}</span>`).join('')}</div>
  <div class="diary-days" role="group" aria-label="选择日期，方向键切换日期">${diaryCalendar(month).map(date=>{
   if(!date)return '<span aria-hidden="true"></span>';
   const records=entries.filter(entry=>entry.date===date),moods=[...new Set(records.map(entry=>entry.mood))];
   return `<button class="diary-day ${date===today?'is-today':''} ${date===selected?'is-selected':''}" data-diary-date="${date}" tabindex="${date===focusDate?'0':'-1'}" aria-pressed="${date===selected}" ${date===today?'aria-current="date"':''} aria-label="${date}，${records.length} 篇日记${moods.filter(Boolean).length?'，'+escape(moods.filter(Boolean).join('、')):''}"><span class="diary-day-number">${Number(date.slice(-2))}</span><span class="diary-day-moods" aria-hidden="true">${moods.map(mood=>`<i style="--mood:${moodColor(mood)}"></i>`).join('')}</span></button>`;
  }).join('')}</div>
 </section>
 <header class="diary-timeline-heading"><h2 lang="en">Timeline<span class="sr-only"> · 日记时间线</span></h2>${month!==today.slice(0,7)?'<button class="diary-now" data-diary-action="today" lang="en" aria-label="返回当前月份和今天">Now</button>':''}</header>
 <div class="diary-timeline">${entries.map(entry=>`<article class="diary-row" data-entry-date="${entry.date}"><time class="diary-date" datetime="${entry.date}"><strong>${Number(entry.date.slice(-2))}</strong><span>${weekday[localDate(entry.date).getDay()]}</span></time><div class="diary-track" aria-hidden="true"><i style="--mood:${moodColor(entry.mood)}"></i></div><button class="diary-entry app-panel glass ${entry.date===selected?'is-selected':''}" data-diary-edit="${escape(entry.id)}" aria-label="阅读和编辑：${escape(entry.title||entry.content.slice(0,40))}"><span class="diary-entry-meta"><time datetime="${new Date(entry.created).toISOString()}">${new Date(entry.created).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})}</time>${moodPill(state,entry)}</span><strong class="diary-entry-title">${escape(entry.title||entry.content.split('\n')[0].slice(0,40))}</strong><span class="diary-entry-excerpt">${escape(entry.content)}</span></button></article>`).join('')}</div>
 <button class="diary-write glass" data-diary-action="write" aria-label="写 ${selected} 的日记">${icon('edit')}<span class="sr-only">写日记</span></button>`;
}
export function diaryMoodOptions(state,selected='') {
 const chips=diaryMoods(state).map(mood=>{
  const custom=!DIARY_MOODS.some(item=>item.name===mood.name);
  return `<label class="diary-mood-chip" style="--mood:${mood.color}" ${custom?`data-mood-custom="${escape(mood.name)}"`:''}><input type="radio" name="mood" value="${escape(mood.name)}" ${selected===mood.name?'checked':''}><span class="diary-mood-face">${renderMoodGraphic(mood,'chip')}</span><span class="diary-mood-name">${escape(mood.name)}</span></label>`;
 }).join('');
 const blank=`<label class="diary-mood-chip" style="--mood:var(--muted)"><input type="radio" name="mood" value="" ${selected===''?'checked':''}><span class="diary-mood-face is-empty"></span><span class="diary-mood-name">不标记</span></label>`;
 const add=`<button type="button" class="diary-mood-chip diary-mood-add" data-diary-mood-add aria-label="新的心情"><span class="diary-mood-face">${icon('plus')}</span><span class="diary-mood-name">&nbsp;</span></button>`;
 return chips+blank+add;
}
export function diaryEditor(entry,date,state) {
 return `<div class="drawer-layout">${drawerHeader({title:entry?'这一天的日记':'写一篇日记',action:'close',actionAttribute:'data-diary-close'})}<div class="drawer-scroll"><form id="diary-entry-form"><p class="diary-editor-error" role="alert" hidden></p><input type="hidden" name="id" value="${escape(entry?.id||'')}">
 ${field('日期','date',entry?.date||date,'','date')}
 <fieldset class="diary-mood-picker"><legend>心情</legend><div class="diary-mood-options">${diaryMoodOptions(state,entry?.mood||'')}</div><p class="hint diary-mood-hint">长按自己画的心情可以修改</p></fieldset>
 <div class="diary-writing">
 ${field('标题（可选）','title',entry?.title||'','给这一天起个名字')}
 <label class="field"><span>日记</span><textarea name="content" rows="8" maxlength="12000" required placeholder="今天，有什么想留下的？">${escape(entry?.content||'')}</textarea></label>
 <footer class="diary-editor-footer">${entry?`<button type="button" class="diary-delete" data-diary-delete>${icon('trash')}<span>删除</span></button>`:'<span class="diary-local-hint">保存在本机</span>'}<button type="button" class="secondary touch-ripple-button" data-diary-close>取消</button><button type="submit" class="primary touch-ripple-button">保存</button></footer></div></form><div class="diary-mood-editor" role="region" aria-label="自定义心情" tabindex="-1" hidden></div></div></div>`;
}
export function moodEditor({name,color,legacy,editing}) {
 const swatches=(MOOD_SWATCHES.includes(color)?MOOD_SWATCHES:[color,...MOOD_SWATCHES]).map(swatch=>`<button type="button" class="diary-mood-swatch" style="--swatch:${swatch}" data-mood-color="${swatch}" aria-label="颜色 ${swatch}" aria-pressed="${swatch===color}"></button>`).join('');
 return `<form class="diary-mood-form" id="diary-mood-form">
  <p class="diary-mood-error" role="alert" hidden></p>
  <label class="field"><span>名字</span><input name="mood-name" maxlength="12" autocomplete="off" placeholder="1–12 个字" value="${escape(name)}"></label>
  <div class="field"><span>画一张脸</span>
   <div class="diary-mood-pad" style="--mood:${color}"><div class="diary-mood-guide"></div>${legacy?`<img class="diary-mood-legacy" alt="" draggable="false" src="${escape(legacy)}">`:''}<canvas aria-label="画一张脸"></canvas></div>
  </div>
  <div class="diary-mood-tools"><div class="diary-mood-colors" id="diary-mood-palette" role="group" aria-label="表情背景颜色" hidden>${swatches}</div><div class="diary-mood-size" hidden><span class="diary-brush-dot" style="width:3px;height:3px"></span><input type="range" min="0.8" max="5" step="0.1" value="2" aria-label="笔刷大小"><span class="diary-brush-dot" style="width:11px;height:11px"></span></div>
   <div class="diary-mood-toolbar" role="toolbar" aria-label="画板工具"><button type="button" data-mood-tool="pen" aria-label="画笔" aria-pressed="true">${toolSvg.pen}</button><button type="button" data-mood-tool="eraser" aria-label="橡皮擦" aria-pressed="false">${toolSvg.eraser}</button><button type="button" data-mood-size aria-label="笔刷大小" aria-expanded="false"><span class="diary-brush-dot" data-brush-dot></span></button><button type="button" data-mood-palette aria-label="表情背景颜色" aria-controls="diary-mood-palette" aria-expanded="false" style="--swatch:${color}">${toolSvg.palette}<span class="diary-color-dot" aria-hidden="true"></span></button><span class="sep" aria-hidden="true"></span><button type="button" data-mood-undo aria-label="撤销" disabled>${toolSvg.undo}</button><button type="button" data-mood-clear aria-label="清空" disabled>${toolSvg.clear}</button></div>
  </div>
  ${editing?`<button type="button" class="diary-mood-delete" data-mood-delete>删除这个心情</button><p class="diary-mood-delete-note" data-mood-delete-note hidden>日记会保留正文，心情改为不标记。主页上的今日心情会回到平静。</p>`:''}
  <footer class="diary-mood-footer"><button type="button" class="secondary touch-ripple-button" data-mood-close>取消</button><button class="primary diary-mood-save touch-ripple-button" type="submit">保存</button></footer>
 </form>`;
}
