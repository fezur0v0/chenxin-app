import { escape, field } from '../../ui.js';
import { icon } from '../../icons.js';
import { appIcon } from '../icons.js';
import { drawerHeader } from '../../drawer.js';
import { DIARY_MOODS, diaryDate, diaryCalendar, diaryMonthEntries } from './model.js';
const weekday=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const moodColor=name=>DIARY_MOODS.find(m=>m.name===name)?.color||'var(--muted)';
const localDate=value=>new Date(`${value}T12:00:00`);
export function diary(state,ui={}) {
 const today=diaryDate(),month=ui.month||today.slice(0,7),selected=ui.selected||today;
 const entries=diaryMonthEntries(state.diaryEntries,month),monthDate=localDate(`${month}-01`);
 const focusDate=selected.startsWith(month)?selected:`${month}-01`;
 return `<section class="diary-calendar app-panel glass" aria-label="${Number(month.slice(0,4))}年${monthDate.getMonth()+1}月日历">
  <header class="diary-calendar-header"><div class="diary-month"><h2 lang="en">${monthDate.toLocaleDateString('en-US',{month:'long'})}</h2><span>${month.slice(0,4)}</span></div><span class="diary-month-count">本月 ${entries.length} 篇</span><div class="diary-month-controls"><button data-diary-action="previous" aria-label="上个月" ${month==='0001-01'?'disabled':''}>${icon('back')}</button><button data-diary-action="next" aria-label="下个月" ${month==='9999-12'?'disabled':''}>${icon('chevron')}</button></div></header>
  <div class="diary-weekdays" aria-hidden="true">${['S','M','T','W','T','F','S'].map(day=>`<span>${day}</span>`).join('')}</div>
  <div class="diary-days" role="group" aria-label="选择日期，方向键切换日期">${diaryCalendar(month).map(date=>{
   if(!date)return '<span aria-hidden="true"></span>';
   const records=entries.filter(e=>e.date===date),moods=[...new Set(records.map(e=>e.mood))];
   return `<button class="diary-day ${date===today?'is-today':''} ${date===selected?'is-selected':''}" data-diary-date="${date}" tabindex="${date===focusDate?'0':'-1'}" aria-pressed="${date===selected}" ${date===today?'aria-current="date"':''} aria-label="${date}，${records.length} 篇日记${moods.filter(Boolean).length?'，'+moods.filter(Boolean).join('、'):''}"><span class="diary-day-number">${Number(date.slice(-2))}</span><span class="diary-day-moods" aria-hidden="true">${moods.map(mood=>`<i style="--mood:${moodColor(mood)}"></i>`).join('')}</span></button>`;
  }).join('')}</div>
  <div class="diary-legend">${DIARY_MOODS.map(mood=>`<span><i style="--mood:${mood.color}" aria-hidden="true"></i>${mood.name}</span>`).join('')}</div>
 </section>
 <header class="diary-timeline-heading"><h2 lang="en">Timeline<span class="sr-only"> · 日记时间线</span></h2><button data-diary-action="today">回到今天</button><span>从新到旧</span></header>
 ${entries.length&&!entries.some(e=>e.date===selected)?`<div class="diary-selected-empty"><span>${Number(selected.slice(5,7))}月${Number(selected.slice(-2))}日还没有记录</span><button data-diary-action="write">写一篇</button></div>`:''}
 <div class="diary-timeline">${entries.length?entries.map(entry=>`<article class="diary-row" data-entry-date="${entry.date}"><time class="diary-date" datetime="${entry.date}"><strong>${Number(entry.date.slice(-2))}</strong><span>${weekday[localDate(entry.date).getDay()]}</span></time><div class="diary-track" aria-hidden="true"><i style="--mood:${moodColor(entry.mood)}"></i></div><button class="diary-entry app-panel glass ${entry.date===selected?'is-selected':''}" data-diary-edit="${escape(entry.id)}" aria-label="阅读和编辑：${escape(entry.title||entry.content.slice(0,40))}"><span class="diary-entry-meta"><time datetime="${new Date(entry.created).toISOString()}">${new Date(entry.created).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})}</time><span class="diary-mood" style="--mood:${moodColor(entry.mood)}">${escape(entry.mood||'未标记')}</span></span><strong class="diary-entry-title">${escape(entry.title||entry.content.split('\n')[0].slice(0,40))}</strong><span class="diary-entry-excerpt">${escape(entry.content)}</span></button></article>`).join(''):`<section class="diary-empty app-panel glass">${appIcon('diary')}<h2>把日子，慢慢记下来。</h2><p>这个月还没有日记。<br>一件小事，一点心情，都值得被记住。</p></section>`}</div>
 <button class="diary-write glass" data-diary-action="write" aria-label="写 ${selected} 的日记">${icon('edit')}<span class="sr-only">写日记</span></button>`;
}
export function diaryEditor(entry,date) {
 return `<form id="diary-entry-form">${drawerHeader({title:entry?'这一天的日记':'写一篇日记',action:'close',actionAttribute:'data-diary-close'})}<p class="diary-editor-error" role="alert" hidden></p><input type="hidden" name="id" value="${escape(entry?.id||'')}">
 ${field('日期','date',entry?.date||date,'','date')}
 <fieldset class="diary-mood-picker"><legend>这一天的心情</legend>${[...DIARY_MOODS,{name:'',color:'var(--muted)'}].map(mood=>`<label style="--mood:${mood.color}"><input type="radio" name="mood" value="${mood.name}" ${(entry?.mood||'')===mood.name?'checked':''}><span><i aria-hidden="true"></i>${mood.name||'不标记'}</span></label>`).join('')}</fieldset>
 ${field('标题（可选）','title',entry?.title||'','给这一天起个名字')}
 <label class="field"><span>日记</span><textarea name="content" rows="8" maxlength="12000" required placeholder="今天，有什么想留下的？">${escape(entry?.content||'')}</textarea></label>
 <footer class="diary-editor-footer">${entry?`<button type="button" class="diary-delete" data-diary-delete>${icon('trash')}<span>删除</span></button>`:'<span class="diary-local-hint">保存在本机</span>'}<button type="button" class="secondary" data-diary-close>取消</button><button type="submit" class="primary">保存</button></footer></form>`;
}
