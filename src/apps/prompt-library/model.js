// Local configuration only. Runtime prompt assembly is intentionally separate.
export const object=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
export const text=(value,fallback='',max=32000)=>typeof value==='string'?value.slice(0,max):fallback;
export function jsonData(value) {
 const source=JSON.stringify(value);
 if(!source||source.length>1500000)throw new Error('配置内容过大，请将文件拆分后再导入。');
 return JSON.parse(source,(key,item)=>['__proto__','constructor','prototype'].includes(key)?undefined:item);
}
export function libraryItems(items,validate) {
 const seen=new Set();
 return (Array.isArray(items)?items:[]).slice(0,60).flatMap(item=>{
  if(!object(item)||typeof item.id!=='string'||seen.has(item.id))return [];
  try{const raw=validate(item.raw);seen.add(item.id);return [{id:item.id,name:text(item.name,'未命名',80)||'未命名',raw}];}catch{return [];}
 });
}
export function parseLibraryFile(source) {
 if(source.length>1500000)throw new Error('文件最多支持 1.5 MB。');
 let value;try{value=JSON.parse(source);}catch{throw new Error('无法读取这个 JSON 文件，请检查文件格式。');}
 return jsonData(value);
}
export const fileTitle=name=>text(name.replace(/\.json$/i,''),'未命名',80)||'未命名';
