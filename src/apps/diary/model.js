export const DIARY_MOODS = [
 {name:'开心',color:'#f4d66e'}, {name:'平静',color:'#8ed6c0'},
 {name:'疲惫',color:'#b7a2e2'}, {name:'悲伤',color:'#8eb0d6'},
];
export const MOOD_FACES = {
 开心:'<circle cx="22" cy="28" r="2.5" fill="currentColor"/><circle cx="42" cy="28" r="2.5" fill="currentColor"/><path d="M20 38Q32 51 44 38"/>',
 平静:'<path d="M17 29Q22 33 27 29M37 29Q42 33 47 29M26 43Q32 46 38 43"/>',
 疲惫:'<path d="M17 29H27M37 29H47M26 44H38"/>',
 悲伤:'<path d="M17 28Q22 24 27 28M37 28Q42 24 47 28M25 44Q32 36 39 44"/><path d="M43 31Q38 38 43 38Q48 38 43 31Z" fill="currentColor" stroke="none"/>',
};
export const SAD_FACE=MOOD_FACES.悲伤;
export const HOME_MOOD_FALLBACK='平静';
export const MOOD_STROKE_LIMIT=48;
export const MOOD_POINT_LIMIT=96;
export const currentMood=name=>name==='想念'?'悲伤':name;
export const diaryMoods=state=>[...DIARY_MOODS,...(state?.diaryMoods||[])];
const drawingPattern=/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/;
const inRange=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
export function normalizeStrokes(value) {
 if(!Array.isArray(value))return [];
 const strokes=[];
 for(const item of value){
  if(strokes.length>=MOOD_STROKE_LIMIT)break;
  if(!item||typeof item!=='object'||!inRange(item.width,.8,12)||!Array.isArray(item.points))continue;
  const points=[];
  for(const point of item.points){
   if(points.length>=MOOD_POINT_LIMIT)break;
   if(!Array.isArray(point)||!inRange(point[0],0,64)||!inRange(point[1],0,64))continue;
   points.push([Math.round(point[0]*10)/10,Math.round(point[1]*10)/10]);
  }
  if(!points.length)continue;
  strokes.push({points,width:Math.round(item.width*10)/10,erase:item.erase===true});
 }
 return strokes;
}
let moodMaskSerial=0;
const svgNumber=value=>{
 const text=(Math.round(Number(value)*10)/10).toFixed(1);
 return /^(?:\d|[1-5]\d|6[0-4])\.\d$/.test(text)&&Number(text)>=0&&Number(text)<=64?text:null;
};
export function moodVectorSvg(strokes,prefix='mf') {
 const safe=/^[A-Za-z][\w-]*$/.test(prefix)?prefix:'mf';
 let body='';
 for(const stroke of Array.isArray(strokes)?strokes:[]){
  const width=svgNumber(stroke?.width);
  if(!width||!Array.isArray(stroke.points)||!stroke.points.length)return '';
  const coords=[];
  for(const point of stroke.points){
   const x=svgNumber(point?.[0]),y=svgNumber(point?.[1]);
   if(!x||!y)return '';
   coords.push(`${x} ${y}`);
  }
  const d=coords.length===1?`M${coords[0]}h.01`:`M${coords.join('L')}`;
  if(stroke.erase===true){
   const id=`${safe}m${moodMaskSerial++}`;
   body=`<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff"/><path d="${d}" stroke="#000" stroke-width="${width}" fill="none"/></mask><g mask="url(#${id})">${body}</g>`;
  }else body+=`<path d="${d}" stroke-width="${width}" fill="none"/>`;
 }
 return body;
}
export function normalizeDiaryMoods(value) {
 const names=new Set(DIARY_MOODS.map(mood=>mood.name));
 const moods=[];
 for(const item of Array.isArray(value)?value:[]){
  if(moods.length===12)break;
  const name=typeof item?.name==='string'?item.name.trim().slice(0,12):'';
  if(!name||currentMood(name)!==name||names.has(name)||!/^#[a-f0-9]{6}$/i.test(item.color))continue;
  const drawing=typeof item.drawing==='string'&&item.drawing.length<=24000&&drawingPattern.test(item.drawing)?item.drawing:'';
  const strokes=normalizeStrokes(item.strokes);
  const mood={name,color:item.color,drawing};
  if(strokes.length)mood.strokes=strokes;
  names.add(name);moods.push(mood);
 }
 return moods;
}
function moodNameError(state,name,ignore='') {
 if(!name||name.length>12)return '请输入 1–12 个字的心情名称。';
 if(currentMood(name)!==name||diaryMoods(state).some(mood=>mood.name===name&&mood.name!==ignore))return '这个心情名称已经有了。';
 return '';
}
export function saveDiaryMood(state,data) {
 const name=String(data.name||'').trim();
 const invalid=moodNameError(state,name);
 if(invalid)throw new Error(invalid);
 if((state.diaryMoods||[]).length>=12)throw new Error('最多添加 12 个自定义心情。');
 const [mood]=normalizeDiaryMoods([data]);
 if(!mood)throw new Error('请选择有效的颜色。');
 if(data.drawing&&!mood.drawing)throw new Error('表情太复杂，简化几笔后再试。');
 if(Array.isArray(data.strokes)&&data.strokes.length&&!mood.strokes?.length)throw new Error('表情太复杂，简化几笔后再试。');
 state.diaryMoods=[...(state.diaryMoods||[]),mood];
 return mood;
}
export function updateDiaryMood(state,previousName,data) {
 const list=state.diaryMoods||[];
 const index=list.findIndex(mood=>mood.name===previousName);
 if(index<0)throw new Error('这个心情已不存在。');
 const name=String(data.name||'').trim();
 const invalid=moodNameError(state,name,previousName);
 if(invalid)throw new Error(invalid);
 const previous=list[index];
 const replace=Array.isArray(data.strokes);
 const [mood]=normalizeDiaryMoods([{name,color:data.color,drawing:replace?'':previous.drawing,strokes:replace?data.strokes:previous.strokes}]);
 if(!mood||mood.name!==name)throw new Error('请选择有效的颜色。');
 if(replace&&!mood.strokes?.length)throw new Error('表情太复杂，简化几笔后再试。');
 if(!replace&&previous.drawing&&mood.drawing!==previous.drawing)throw new Error('原来的表情没能保留。');
 list[index]=mood;
 if(name!==previousName){
  for(const entry of state.diaryEntries||[])if(entry.mood===previousName)entry.mood=name;
  if(state.home?.mood===previousName)state.home.mood=name;
 }
 return mood;
}
export function deleteDiaryMood(state,name) {
 if(!state.diaryMoods?.some(mood=>mood.name===name))throw new Error('这个心情已不存在。');
 state.diaryMoods=state.diaryMoods.filter(mood=>mood.name!==name);
 for(const entry of state.diaryEntries||[])if(entry.mood===name)entry.mood='';
 if(state.home?.mood===name)state.home.mood=HOME_MOOD_FALLBACK;
}
export function acceptedHomeMood(mood,moods) {
 const name=currentMood(typeof mood==='string'?mood:'');
 return moods.some(item=>item.name===name)?name:'';
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
