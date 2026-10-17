let database;
function open(){
 if(!database)database=new Promise((resolve,reject)=>{
  const request=indexedDB.open('chenxin.backups.v1',2);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots',{keyPath:'id'});if(!db.objectStoreNames.contains('metadata'))db.createObjectStore('metadata');};
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=undefined;};resolve(db);};
  request.onerror=request.onblocked=()=>{database=undefined;reject(new Error('本机快照存储不可用。'));};
 });return database;
}
function metadata(record){const {archive,...rest}=record;return rest;}
export const snapshotStore={
 async autoDay(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('metadata'),request=tx.objectStore('metadata').get('lastAutoDay');tx.oncomplete=()=>resolve(request.result||'');tx.onerror=tx.onabort=()=>reject(new Error('无法读取每日快照状态。'));});},
 async list(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots'),request=tx.objectStore('snapshots').getAll();tx.oncomplete=()=>resolve(request.result.map(metadata).sort((a,b)=>b.createdAt-a.createdAt));tx.onerror=tx.onabort=()=>reject(new Error('无法读取本机快照。'));});},
 async get(id){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots'),request=tx.objectStore('snapshots').get(id);tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(new Error('无法读取这份快照。'));});},
 async put(record,keep=5){
  const db=await open();return new Promise((resolve,reject)=>{
   const tx=db.transaction(['snapshots','metadata'],'readwrite'),store=tx.objectStore('snapshots'),meta=tx.objectStore('metadata');let created=false;
   const save=()=>{created=true;store.put(record);if(record.reason==='auto')meta.put(record.day,'lastAutoDay');const request=store.getAll();request.onsuccess=()=>{for(const item of request.result.sort((a,b)=>b.createdAt-a.createdAt).slice(keep))store.delete(item.id);};};
   if(record.reason==='auto'){const request=meta.get('lastAutoDay');request.onsuccess=()=>{if(request.result!==record.day)save();};}else save();
   tx.oncomplete=()=>resolve(created);tx.onerror=tx.onabort=()=>reject(new Error('快照未能保存，请检查浏览器可用空间。'));
  });
 },
 async remove(id){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').delete(id);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('快照未能删除。'));});},
 async trim(keep){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots'),request=store.getAll();request.onsuccess=()=>{for(const item of request.result.sort((a,b)=>b.createdAt-a.createdAt).slice(keep))store.delete(item.id);};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('旧快照未能整理，下次保存时会重试。'));});}
};
export function memorySnapshots(){
 const values=new Map();let lastAutoDay='';return {async autoDay(){return lastAutoDay;},async list(){return [...values.values()].map(metadata).sort((a,b)=>b.createdAt-a.createdAt);},async get(id){return values.get(id);},async put(record,keep=5){if(record.reason==='auto'&&lastAutoDay===record.day)return false;values.set(record.id,record);if(record.reason==='auto')lastAutoDay=record.day;await this.trim(keep);return true;},async remove(id){values.delete(id);},async trim(keep){for(const item of [...values.values()].sort((a,b)=>b.createdAt-a.createdAt).slice(keep))values.delete(item.id);}};
}
