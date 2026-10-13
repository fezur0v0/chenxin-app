// Audio stays in IndexedDB, outside the small localStorage JSON backup.
let database;
function openDatabase() {
 if(!database)database=new Promise((resolve,reject)=>{
  const request=indexedDB.open('chenxin.music.files.v1',1);
  request.onupgradeneeded=()=>{request.result.createObjectStore('files');};
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=undefined;};resolve(db);};
  request.onerror=()=>{database=undefined;reject(new Error('本机音乐存储不可用。'));};
  request.onblocked=()=>{reject(new Error('请关闭其他页面后重试音乐导入。'));};
 });
 return database;
}
export async function musicFile(id,file) {
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const transaction=db.transaction('files',file===undefined?'readonly':'readwrite'),store=transaction.objectStore('files');
  const request=file===undefined?store.get(id):file===null?store.delete(id):store.put(file,id);
  transaction.oncomplete=()=>resolve(request.result);
  transaction.onerror=transaction.onabort=()=>reject(new Error('音乐文件未能保存，请检查本机储存空间。'));
 });
}
