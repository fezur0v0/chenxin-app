const storageKey='chenxin-display-numeral-font';
const dataPrefix='data:application/octet-stream;base64,';
let activeFace, revision=0;

function loadFace(data){
 return new FontFace('Imported Display Numerals',`url("${data}")`,{
  style:'italic',weight:'700',unicodeRange:'U+0030-0039',
 }).load();
}

function activate(face){
 if(activeFace)document.fonts.delete(activeFace);
 activeFace=face;
 if(face)document.fonts.add(face);
}

export async function restoreNumeralFont(storage){
 const request=++revision;
 try{
  const data=storage.getItem(storageKey);
  if(!data||!/^data:application\/octet-stream;base64,[A-Za-z0-9+/]+={0,2}$/.test(data))return;
  const face=await loadFace(data);
  if(request===revision)activate(face);
 }catch{ /* Keep the existing font fallback if storage or decoding is unavailable. */ }
}

export async function importNumeralFont(storage,file){
 if(file.size>512*1024)throw new Error('字体文件不能超过 512 KB。');
 const request=++revision;
 const data=await new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(dataPrefix+String(reader.result).split(',')[1]);
  reader.onerror=()=>reject(new Error('无法读取字体文件。'));
  reader.readAsDataURL(file);
 });
 let face;
 try{face=await loadFace(data);}catch{throw new Error('字体无法加载，请选择 OTF、TTF、WOFF 或 WOFF2 文件。');}
 if(request!==revision)return;
 try{storage.setItem(storageKey,data);}catch{throw new Error('当前浏览器无法保存字体。');}
 activate(face);
}

export function clearNumeralFont(storage){
 try{storage.removeItem(storageKey);}catch{throw new Error('当前浏览器无法清除字体。');}
 ++revision;
 activate(undefined);
}
