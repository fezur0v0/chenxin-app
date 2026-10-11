export const DIARY_MOODS = [
 {name:'开心',color:'#f4d66e'}, {name:'平静',color:'#8ed6c0'},
 {name:'疲惫',color:'#b7a2e2'}, {name:'想念',color:'#f2a7be'},
];
export function diaryDate(date=new Date()) {
 return `${String(date.getFullYear()).padStart(4,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function validDiaryDate(value) {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'0001-01-01')return false;
 const date=new Date(`${value}T12:00:00`);
 return Number.isFinite(date.getTime())&&diaryDate(date)===value;
}
export function diaryCalendar(month) {
 if(!validDiaryDate(`${month}-01`))throw new Error('无效的月份');
 const first=new Date(`${month}-01T12:00:00`),last=new Date(first);
 last.setMonth(last.getMonth()+1,0);
 const cells=Array(first.getDay()).fill(null);
 for(let day=1;day<=last.getDate();day++)cells.push(`${month}-${String(day).padStart(2,'0')}`);
 while(cells.length%7)cells.push(null);
 return cells;
}
export function shiftDiaryMonth(month,offset) {
 const date=new Date(`${month}-01T12:00:00`);date.setMonth(date.getMonth()+offset);
 const next=diaryDate(date).slice(0,7);
 return validDiaryDate(`${next}-01`)?next:month;
}
export function diaryMonthEntries(entries,month) {
 return entries.filter(entry=>entry.date.startsWith(`${month}-`)).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created);
}
const validTime=value=>Number.isFinite(value)&&Number.isFinite(new Date(value).getTime());
export function normalizeDiaryEntries(value) {
 if(value===undefined)return [];
 if(!Array.isArray(value))throw new Error('日记数据损坏');
 const ids=new Set();
 return value.map(entry=>{
  if(typeof entry?.id!=='string'||!entry.id||ids.has(entry.id)||!validDiaryDate(entry.date)||typeof entry.content!=='string')throw new Error('日记数据损坏');
  ids.add(entry.id);
  const created=validTime(entry.created)?entry.created:Date.now();
  return {id:entry.id,date:entry.date,title:typeof entry.title==='string'?entry.title.slice(0,80):'',content:entry.content.slice(0,12000),mood:DIARY_MOODS.some(m=>m.name===entry.mood)?entry.mood:'',created,updated:validTime(entry.updated)?entry.updated:created};
 });
}
export function saveDiaryEntry(state,data,now=Date.now()) {
 if(!validDiaryDate(data.date))throw new Error('请选择有效的日记日期');
 const content=String(data.content||'').trim();
 if(!content)throw new Error('写点什么，再保存吧。');
 const existing=data.id?state.diaryEntries.find(entry=>entry.id===data.id):null;
 if(data.id&&!existing)throw new Error('这篇日记已不存在');
 const entry={id:existing?.id||crypto.randomUUID(),date:data.date,title:String(data.title||'').trim().slice(0,80),content:content.slice(0,12000),mood:DIARY_MOODS.some(m=>m.name===data.mood)?data.mood:'',created:existing?.created??now,updated:now};
 if(existing)state.diaryEntries[state.diaryEntries.indexOf(existing)]=entry;
 else state.diaryEntries.push(entry);
 return entry;
}
