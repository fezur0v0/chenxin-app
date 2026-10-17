export const STICKER_LIMIT=200,CATEGORY_LIMIT=50;
const text=(value,max=200)=>typeof value==='string'?value.trim().slice(0,max):'';
export function stickerSource(value){
 if(typeof value!=='string')return '';
 if(value.length<1200000&&/^data:image\/(jpeg|png|webp|gif);base64,[a-z\d+/=]+$/i.test(value))return value;
 if(value.length>4000)return '';
 try{const url=new URL(value.trim());return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
export function expressionCategories(expressions,kind='stickers'){
 return expressions[kind==='kaomoji'?'kaomojiCategories':'categories']||[];
}
export function normalizeExpressions(value,defaults){
 if(!value)return {...defaults,categories:[],kaomojiCategories:[]};
 const cleanCategories=items=>{
  const ids=new Set(),names=new Set(),result=[];
  for(const item of Array.isArray(items)?items:[]){
   const id=text(item?.id,100),name=text(item?.name,30);
   if(!id||id==='all'||!name||ids.has(id)||names.has(name))continue;
   ids.add(id);names.add(name);result.push({id,name});if(result.length===CATEGORY_LIMIT)break;
  }
  return result;
 };
 const categories=cleanCategories(value.categories),kaomojiCategories=cleanCategories(value.kaomojiCategories);
 const clean=(items,sticker)=>{
  const ids=new Set(),group=sticker?categories:kaomojiCategories;
  return (Array.isArray(items)?items:[]).slice(0,STICKER_LIMIT).filter(x=>typeof x?.id==='string'&&!ids.has(x.id)&&ids.add(x.id)).map(x=>({
   id:x.id,value:sticker?stickerSource(x.value):typeof x.value==='string'?x.value.slice(0,200):'',name:text(x.name,80)||'表情包',favorite:x.favorite===true,used:Number.isFinite(x.used)?Math.max(0,x.used):0,
   category:group.some(c=>c.id===x.category)?x.category:'',...(sticker?{note:text(x.note)||text(x.name)||'表情包'}:{})
  })).filter(x=>x.value.trim());
 };
 return {kaomoji:clean(value.kaomoji,false),stickers:clean(value.stickers,true),categories,kaomojiCategories};
}
function filteredExpressions(expressions,ui,kind){
 const query=(ui.search||'').trim().toLocaleLowerCase(),categories=expressionCategories(expressions,kind);
 const category=ui.category&&categories.some(c=>c.id===ui.category)?ui.category:ui.category===''?'':'all';
 return expressions[kind].filter(x=>(!query||(kind==='stickers'?[x.note,x.name]:[x.value]).some(value=>value?.toLocaleLowerCase().includes(query)))&&(category==='all'||(x.category||'')===category)&&(ui.filter==='favorites'?x.favorite:ui.filter==='recent'?x.used>0:true)).slice().sort((a,b)=>ui.filter==='recent'?b.used-a.used:0);
}
export function visibleStickers(expressions,ui={}){return filteredExpressions(expressions,ui,'stickers');}
export function visibleExpressions(expressions,ui={}){return filteredExpressions(expressions,ui,ui.tab==='kaomoji'?'kaomoji':'stickers');}
export function saveCategory(expressions,name,id='',kind='stickers'){
 name=typeof name==='string'?name.trim():'';const categories=expressionCategories(expressions,kind);
 if(!name||name.length>30)throw new Error('分类名称请填写 1–30 个字。');
 if(categories.some(c=>c.name===name&&c.id!==id))throw new Error('已经有同名分类了，换一个名字吧。');
 const item=categories.find(c=>c.id===id);
 if(id&&!item)throw new Error('这个分类已不存在。');
 if(item){item.name=name;return item;}
 if(categories.length>=CATEGORY_LIMIT)throw new Error('最多添加 50 个分类。');
 const category={id:crypto.randomUUID(),name};
 expressions[kind==='kaomoji'?'kaomojiCategories':'categories']=[...categories,category];return category;
}
export function deleteCategory(expressions,id,kind='stickers'){
 const categories=expressionCategories(expressions,kind);
 if(!categories.some(c=>c.id===id))throw new Error('这个分类已不存在。');
 expressions[kind==='kaomoji'?'kaomojiCategories':'categories']=categories.filter(c=>c.id!==id);
 expressions[kind].forEach(s=>{if(s.category===id)s.category='';});
}
export function moveExpressions(expressions,ids,category,kind='stickers'){
 if(category&&!expressionCategories(expressions,kind).some(c=>c.id===category))throw new Error('请选择有效分类。');
 const selected=new Set(ids);expressions[kind].forEach(s=>{if(selected.has(s.id))s.category=category;});
}
export function moveStickers(expressions,ids,category){moveExpressions(expressions,ids,category);}
export function saveKaomoji(expressions,{id='',value,category=''}){
 value=typeof value==='string'?value.trim():'';
 if(!value||value.length>200)throw new Error('颜文字请填写 1–200 个字符。');
 if(category&&!expressionCategories(expressions,'kaomoji').some(c=>c.id===category))throw new Error('请选择有效的颜文字分类。');
 const item=expressions.kaomoji.find(x=>x.id===id);
 if(id&&!item)throw new Error('这条颜文字已不存在。');
 if(item){item.value=value;item.category=category;return item;}
 if(expressions.kaomoji.length>=STICKER_LIMIT)throw new Error('颜文字最多保存 200 项。');
 const added={id:crypto.randomUUID(),value,category,favorite:true,used:0};expressions.kaomoji.unshift(added);return added;
}
function record(note,url,index){
 if(typeof note!=='string'||!note.trim()||note.trim().length>200)throw new Error(`第 ${index} 项需要 1–200 字的表情含义。`);
 const value=stickerSource(url);
 if(!value||!value.startsWith('https:'))throw new Error(`第 ${index} 项请填写有效的 HTTPS 图片网址。`);
 return {note:note.trim(),value};
}
export function parseStickerText(input){
 if(typeof input!=='string'||input.length>2*1024*1024)throw new Error('导入文字过大。');
 const source=input.replace(/^\uFEFF/,'').trim();if(!source)throw new Error('请先填写表情含义和图片网址。');
 let rows=[];
 if(/^[\[{]/.test(source)){
  let data;try{data=JSON.parse(source);}catch{throw new Error('JSON 格式不正确，请检查括号和引号。');}
  if(Array.isArray(data))rows=data;
  else if(data&&Array.isArray(data.stickers))rows=data.stickers;
  else if(data&&typeof data==='object')rows=Object.entries(data).map(([note,url])=>({note,url}));
  else throw new Error('JSON 需要是表情列表或「含义：网址」对象。');
  rows=rows.map((x,i)=>record(x?.note??x?.meaning??x?.name??x?.description,x?.url??x?.value,i+1));
 }else{
  const lines=source.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  for(let i=0;i<lines.length;i++){
   const match=lines[i].match(/^(.+?)[：:]\s*(https:\/\/\S+)\s*$/i);
   if(match)rows.push(record(match[1],match[2],rows.length+1));
   else if(/[：:]$/.test(lines[i])&&/^https:\/\/\S+$/i.test(lines[i+1]||'')){rows.push(record(lines[i].slice(0,-1),lines[++i],rows.length+1));}
   else throw new Error(`第 ${i+1} 行格式不正确，请使用「含义：HTTPS 图片网址」。`);
  }
 }
 if(!rows.length)throw new Error('文件里没有找到表情包。');
 if(rows.length>STICKER_LIMIT)throw new Error('每次最多导入 200 项表情包。');
 return rows;
}
export function importStickers(expressions,rows,category=''){
 if(category&&!expressions.categories.some(c=>c.id===category))throw new Error('请选择有效分类。');
 const known=new Set(expressions.stickers.map(s=>JSON.stringify([s.note||s.name,s.value]))),fresh=[];
 for(const row of rows){const r=record(row.note,row.value,fresh.length+1),key=JSON.stringify([r.note,r.value]);if(!known.has(key)){known.add(key);fresh.push({...r,id:crypto.randomUUID(),name:r.note.slice(0,80),category,favorite:true,used:0});}}
 if(expressions.stickers.length+fresh.length>STICKER_LIMIT)throw new Error(`表情包最多保存 200 项，当前还有 ${STICKER_LIMIT-expressions.stickers.length} 个空位。`);
 expressions.stickers.push(...fresh);return {added:fresh.length,skipped:rows.length-fresh.length};
}
