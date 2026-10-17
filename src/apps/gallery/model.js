const text=(value,max)=>typeof value==='string'?value.slice(0,max):'';
const image=value=>typeof value==='string'&&value.length<1200000&&/^data:image\/(jpeg|png|webp);base64,[a-z\d+/=]+$/i.test(value)?value:'';
const date=value=>Number.isFinite(value)&&Math.abs(value)<=8640000000000000?value:Date.now();
export const GALLERY_COLLECTIONS=['all','uploads','chat'];
export const emptyGallery=()=>({albums:[],photos:[]});
export function normalizeGallery(value){
 const gallery=emptyGallery(),albumIds=new Set(),photoIds=new Set();
 for(const item of Array.isArray(value?.albums)?value.albums:[]){
  const id=text(item?.id,100);if(!id||GALLERY_COLLECTIONS.includes(id)||albumIds.has(id))continue;
  albumIds.add(id);gallery.albums.push({id,name:text(item.name,60).trim()||'未命名相册',description:text(item.description,500),coverId:text(item.coverId,100),created:date(item.created)});
 }
 for(const item of Array.isArray(value?.photos)?value.photos:[]){
  const id=text(item?.id,100),data=image(item?.data);if(!id||photoIds.has(id)||!data)continue;
  photoIds.add(id);const source=item.origin==='assistant'?{sessionId:text(item.source?.sessionId,100),messageId:text(item.source?.messageId,100),attachmentId:text(item.source?.attachmentId,100)}:null;
  gallery.photos.push({id,data,name:text(item.name,180)||'照片',caption:text(item.caption,1000),time:date(item.time),addedAt:date(item.addedAt),albumId:albumIds.has(item.albumId)?item.albumId:'',origin:source?'assistant':'upload',source});
 }
 for(const album of gallery.albums)if(!gallery.photos.some(p=>p.id===album.coverId&&p.albumId===album.id))album.coverId='';
 return gallery;
}
export function collection(gallery,id='all'){
 const builtins={all:{id:'all',name:'所有照片',description:'把喜欢的瞬间，慢慢留下。'},uploads:{id:'uploads',name:'我上传的',description:'由你亲手放进相册的画面。'},chat:{id:'chat',name:'对话珍藏',description:'对话中，AI 想替你留下的照片。'}};
 return Object.hasOwn(builtins,id)?builtins[id]:gallery.albums.find(a=>a.id===id);
}
export function albumPhotos(gallery,id='all'){
 return gallery.photos.filter(p=>id==='all'||id==='uploads'&&p.origin==='upload'||id==='chat'&&p.origin==='assistant'||!GALLERY_COLLECTIONS.includes(id)&&p.albumId===id).sort((a,b)=>b.time-a.time||b.addedAt-a.addedAt||a.id.localeCompare(b.id));
}
export function photoDay(time){const d=new Date(time);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function photoGroups(photos){
 const groups=[];for(const photo of photos){const day=photoDay(photo.time);if(groups.at(-1)?.day!==day)groups.push({day,photos:[]});groups.at(-1).photos.push(photo);}return groups;
}
export function saveAlbum(gallery,input){
 const name=text(input.name,60).trim();if(!name)throw new Error('给相册起一个名字吧。');
 const existing=gallery.albums.find(a=>a.id===input.id);
 if(input.id&&!existing)throw new Error('这个相册已不存在。');
 const album={id:existing?.id||crypto.randomUUID(),name,description:text(input.description,500).trim(),created:existing?.created??Date.now(),coverId:existing&&gallery.photos.some(p=>p.albumId===existing.id&&p.id===input.coverId)?input.coverId:''};
 if(existing)Object.assign(existing,album);else gallery.albums.push(album);return existing||album;
}
function targetAlbum(gallery,id){if(id&&!gallery.albums.some(a=>a.id===id))throw new Error('目标相册已不存在。');return id||'';}
export function addUploadedPhotos(gallery,items,albumId=''){
 const target=targetAlbum(gallery,albumId);if(!items.length)throw new Error('请先选择照片。');
 const photos=items.map(item=>{
  const data=image(item.data);if(!data)throw new Error('照片格式无法保存，请选择 JPG、PNG 或 WebP 图片。');
  return {id:crypto.randomUUID(),data,name:text(item.name,180)||'照片',caption:'',time:date(item.time),addedAt:Date.now(),albumId:target,origin:'upload',source:null};
 });gallery.photos.push(...photos);return photos;
}
export function movePhotos(gallery,ids,albumId=''){
 const target=targetAlbum(gallery,albumId),selected=new Set(ids);
 for(const photo of gallery.photos)if(selected.has(photo.id))photo.albumId=target;
 cleanCovers(gallery);
}
function cleanCovers(gallery){for(const album of gallery.albums)if(!gallery.photos.some(p=>p.albumId===album.id&&p.id===album.coverId))album.coverId='';}
export function deletePhotos(gallery,ids){const selected=new Set(ids);gallery.photos=gallery.photos.filter(p=>!selected.has(p.id));cleanCovers(gallery);}
export function deleteAlbum(gallery,id){
 if(!gallery.albums.some(a=>a.id===id))throw new Error('这个相册已不存在。');
 gallery.albums=gallery.albums.filter(a=>a.id!==id);for(const photo of gallery.photos)if(photo.albumId===id)photo.albumId='';
}
export function updatePhoto(gallery,input){
 const photo=gallery.photos.find(p=>p.id===input.id);if(!photo)throw new Error('这张照片已不存在。');
 if(!Number.isFinite(input.time)||Math.abs(input.time)>8640000000000000)throw new Error('请选择有效的照片日期。');
 Object.assign(photo,{name:text(input.name,180).trim()||'照片',caption:text(input.caption,1000).trim(),time:input.time});return photo;
}
// The model may request a save only for an existing user photo, never a sticker,
// wallpaper, avatar, generated image, or arbitrary URL. Saves are idempotent.
export function saveChatPhoto(state,input){
 const session=state.sessions.find(s=>s.id===input.sessionId),message=session?.messages.find(m=>m.id===input.messageId);
 const attachment=message?.attachments?.find(a=>a.id===input.attachmentId);
 if(message?.role!=='user'||!attachment||attachment.kind==='sticker'||attachment.kind==='voice'||!image(attachment.data))throw new Error('只能珍藏你在对话中发出的照片。');
 const duplicate=state.gallery.photos.find(p=>p.source?.sessionId===session.id&&p.source.messageId===message.id&&p.source.attachmentId===attachment.id);
 if(duplicate)return {photo:duplicate,created:false};
 const albumId=targetAlbum(state.gallery,input.albumId);
 const photo={id:crypto.randomUUID(),data:attachment.data,name:text(input.name,180).trim()||attachment.name||'对话照片',caption:text(input.caption,1000).trim(),time:date(message.time),addedAt:Date.now(),albumId,origin:'assistant',source:{sessionId:session.id,messageId:message.id,attachmentId:attachment.id}};
 state.gallery.photos.push(photo);return {photo,created:true};
}
