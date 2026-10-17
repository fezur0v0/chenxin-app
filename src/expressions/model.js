export const STICKER_LIMIT=200,CATEGORY_LIMIT=50;
const text=(value,max=200)=>typeof value==='string'?value.trim().slice(0,max):'';
export function stickerSource(value){
 if(typeof value!=='string')return '';
 if(value.length<1200000&&/^data:image\/(jpeg|png|webp|gif);base64,[a-z\d+/=]+$/i.test(value))return value;
 if(value.length>4000)return '';
 try{const url=new URL(value.trim());return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
export function normalizeExpressions(value,defaults){
 if(!value)return {...defaults,categories:[]};
 const categoryIds=new Set(),names=new Set();
 const categories=(Array.isArray(value.categories)?value.categories:[]).filter(x=>typeof x?.id==='string'&&x.id&&x.id!=='all'&&!categoryIds.has(x.id)&&text(x.name,30)&&!names.has(text(x.name,30))&&categoryIds.add(x.id)&&names.add(text(x.name,30))).slice(0,CATEGORY_LIMIT).map(x=>({id:text(x.id,100),name:text(x.name,30)}));
 const clean=(items,sticker)=>{const ids=new Set();return (Array.isArray(items)?items:[]).slice(0,STICKER_LIMIT).filter(x=>typeof x?.id==='string'&&!ids.has(x.id)&&ids.add(x.id)).map(x=>({id:x.id,value:sticker?stickerSource(x.value):typeof x.value==='string'?x.value.slice(0,200):'',name:text(x.name,80)||'表情包',favorite:x.favorite===true,used:Number.isFinite(x.used)?Math.max(0,x.used):0,...sticker?{note:text(x.note)||text(x.name)||'表情包',category:categories.some(c=>c.id===x.category)?x.category:''}:{}})).filter(x=>x.value.trim());};
 return {kaomoji:clean(value.kaomoji,false),stickers:clean(value.stickers,true),categories};
}
export function visibleStickers(expressions,ui={}){
 const query=(ui.search||'').trim().toLocaleLowerCase();
 const category=ui.category&&expressions.categories.some(c=>c.id===ui.category)?ui.category:ui.category===''?'':'all';
 return expressions.stickers.filter(x=>(!query||[x.note,x.name].some(value=>value?.toLocaleLowerCase().includes(query)))&&(category==='all'||(x.category||'')===category)&&(ui.filter==='favorites'?x.favorite:ui.filter==='recent'?x.used>0:true)).slice().sort((a,b)=>ui.filter==='recent'?b.used-a.used:0);
}
export function saveCategory(expressions,name,id=''){
 name=typeof name==='string'?name.trim():'';
 if(!name||name.length>30)throw new Error('分类名称请填写 1–30 个字。');
 if(expressions.categories.some(c=>c.name===name&&c.id!==id))throw new Error('已经有同名分类了，换一个名字吧。');
 const item=expressions.categories.find(c=>c.id===id);
 if(id&&!item)throw new Error('这个分类已不存在。');
 if(item){item.name=name;return item;}
 if(expressions.categories.length>=CATEGORY_LIMIT)throw new Error('最多添加 50 个分类。');
 const category={id:crypto.randomUUID(),name};expressions.categories.push(category);return category;
}
export function deleteCategory(expressions,id){
 if(!expressions.categories.some(c=>c.id===id))throw new Error('这个分类已不存在。');
 expressions.categories=expressions.categories.filter(c=>c.id!==id);
 expressions.stickers.forEach(s=>{if(s.category===id)s.category='';});
}
export function moveStickers(expressions,ids,category){
 if(category&&!expressions.categories.some(c=>c.id===category))throw new Error('请选择有效分类。');
 const selected=new Set(ids);expressions.stickers.forEach(s=>{if(selected.has(s.id))s.category=category;});
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
