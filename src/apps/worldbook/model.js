import { object,text,jsonData,libraryItems,fileTitle } from '../prompt-library/model.js';
export const WORLD_POSITIONS=[[0,'角色设定之前'],[1,'角色设定之后'],[4,'聊天记录中'],[2,'作者注释之前'],[3,'作者注释之后'],[5,'示例对话之前'],[6,'示例对话之后'],[7,'命名插槽（Outlet）']];
export function worldPayload(value) {
 if(!object(value)||!object(value.entries)||Object.keys(value.entries).length>1000)throw new Error('请选择酒馆世界书 JSON（包含 entries 条目集合）。');
 const raw=jsonData(value);
 for(const entry of Object.values(raw.entries))if(!object(entry)||typeof entry.content!=='string'||!Array.isArray(entry.key)||entry.key.some(key=>typeof key!=='string'))throw new Error('世界书条目格式不完整：需要正文和关键词列表。');
 return raw;
}
export const normalizeWorldbooks=items=>libraryItems(items,worldPayload);
export const importWorldbook=(value,name)=>({id:crypto.randomUUID(),name:fileTitle(name),raw:worldPayload(value)});
export const newWorldbook=name=>({id:crypto.randomUUID(),name:text(name,'',80).trim()||'新的世界书',raw:{entries:{}}});
export function worldEntries(book) {return Object.entries(book.raw.entries).map(([id,value])=>({id,value}));}
export function saveWorldEntry(book,id,data) {
 if(!data.content.trim())throw new Error('请填写条目正文。');
 if(!id){if(worldEntries(book).length>=1000)throw new Error('每本世界书最多保存 1000 条。');id=String(Math.max(-1,...Object.keys(book.raw.entries).filter(key=>/^\d+$/.test(key)).map(Number))+1);}
 const old=book.raw.entries[id]||{},strategy=data.strategy;
 const entry={...old,uid:old.uid??Number(id),comment:text(data.name,'',80).trim(),content:text(data.content),key:text(data.keys).split('\n').map(key=>key.trim()).filter(Boolean),constant:strategy==='constant',vectorized:strategy==='vector',disable:data.enabled!=='on',position:Number(data.position),order:Math.min(9999,Math.max(0,Number(data.order)||0)),depth:Math.min(100,Math.max(0,Number(data.depth)||0)),role:Number(data.role)||0};
 if(!WORLD_POSITIONS.some(([value])=>value===entry.position))entry.position=0;
 book.raw.entries[id]=entry;return id;
}
