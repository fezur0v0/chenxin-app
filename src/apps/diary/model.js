export const DIARY_MOODS = [
 {name:'开心',color:'#f4d66e'}, {name:'平静',color:'#8ed6c0'},
 {name:'疲惫',color:'#b7a2e2'}, {name:'悲伤',color:'#8eb0d6'},
];
export const SAD_FACE='<path d="M17 28Q22 24 27 28M37 28Q42 24 47 28M25 44Q32 36 39 44"/><path d="M43 31Q38 38 43 38Q48 38 43 31Z" fill="currentColor" stroke="none"/>';
export const currentMood=name=>name==='想念'?'悲伤':name;
export const diaryMoods=state=>[...DIARY_MOODS,...(state?.diaryMoods||[])];

export function normalizeDiaryMoods(value) {
 const names=new Set(DIARY_MOODS.map(mood=>mood.name));
 const moods=[];
 for(const item of Array.isArray(value)?value:[]){
  if(moods.length===12)break;
  const name=typeof item?.name==='string'?item.name.trim().slice(0,12):'';
  if(!name||currentMood(name)!==name||names.has(name)||!/^#[a-f0-9]{6}$/i.test(item.color))continue;
  const drawing=typeof item.drawing==='string'&&item.drawing.length<=24000&&/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(item.drawing)?item.drawing:'';
  names.add(name);moods.push({name,color:item.color,drawing});
 }
 return moods;
}

export function saveDiaryMood(state,data) {
 const names=diaryMoods(state).map(mood=>mood.name);
 const name=String(data.name||'').trim();
 if(!name||name.length>12)throw new Error('请输入 1–12 个字的心情名称。');
 if(names.includes(currentMood(name)))throw new Error('这个心情名称已经有了。');
 if((state.diaryMoods||[]).length>=12)throw new Error('最多添加 12 个自定义心情。');
 const [mood]=normalizeDiaryMoods([data]);
 if(!mood)throw new Error('请选择有效的颜色。');
 if(data.drawing&&!mood.drawing)throw new Error('表情太复杂，简化几笔后再试。');
 state.diaryMoods=[...(state.diaryMoods||[]),mood];
 return mood;
}
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
export function normalizeDiaryEntries(value,moods=DIARY_MOODS) {
 if(value===undefined)return [];
 if(!Array.isArray(value))throw new Error('日记数据损坏');
 const ids=new Set();
 return value.map(entry=>{
  if(typeof entry?.id!=='string'||!entry.id||ids.has(entry.id)||!validDiaryDate(entry.date)||typeof entry.content!=='string')throw new Error('日记数据损坏');
  ids.add(entry.id);
  const created=validTime(entry.created)?entry.created:Date.now();
  return {id:entry.id,date:entry.date,title:typeof entry.title==='string'?entry.title.slice(0,80):'',content:entry.content.slice(0,12000),mood:moods.some(m=>m.name===currentMood(entry.mood))?currentMood(entry.mood):'',created,updated:validTime(entry.updated)?entry.updated:created};
 });
}
export function saveDiaryEntry(state,data,now=Date.now()) {
 if(!validDiaryDate(data.date))throw new Error('请选择有效的日记日期');
 const content=String(data.content||'').trim();
 if(!content)throw new Error('写点什么，再保存吧。');
 const existing=data.id?state.diaryEntries.find(entry=>entry.id===data.id):null;
 if(data.id&&!existing)throw new Error('这篇日记已不存在');
 const entry={id:existing?.id||crypto.randomUUID(),date:data.date,title:String(data.title||'').trim().slice(0,80),content:content.slice(0,12000),mood:diaryMoods(state).some(m=>m.name===currentMood(data.mood))?currentMood(data.mood):'',created:existing?.created??now,updated:now};
 if(existing)state.diaryEntries[state.diaryEntries.indexOf(existing)]=entry;
 else state.diaryEntries.push(entry);
 return entry;
}
