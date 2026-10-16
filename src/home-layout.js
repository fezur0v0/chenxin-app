import { APP_TYPES, DESKTOP_APP_TYPES } from './apps/catalog.js';
export const HOME_TYPES=['anniversary','date','note','mood','memory',...APP_TYPES];
export function homeItemVisible(home,type){
 return APP_TYPES.includes(type)?DESKTOP_APP_TYPES.includes(type)&&!home.hiddenApps?.includes(type):type==='anniversary'?home.anniversaryVisible!==false:home.widgets.some(w=>w.type===type&&w.enabled);
}
export function normalizeHomePages(pages,widgets,options={}){
 const fallback=['anniversary',...widgets.map(w=>w.type)],seen=new Set();
 const result=(Array.isArray(pages)&&pages.length?pages.slice(0,12):[fallback]).map(page=>(Array.isArray(page)?page:[]).filter(type=>HOME_TYPES.includes(type)&&!seen.has(type)&&seen.add(type)));
 const visible=type=>homeItemVisible({widgets,...options},type),overflow=[];
 // Repair overfull imported pages without discarding entries or empty pages.
 for(const list of result){const accepted=[];for(const type of list){if(homePageFits([...accepted,type],visible))accepted.push(type);else overflow.push(type);}list.splice(0,list.length,...accepted);}
 function place(type,preferred=0){
  let index=homePageFits([...result[preferred],type],visible)?preferred:result.findIndex(list=>homePageFits([...list,type],visible));
  if(index<0&&result.length<12){index=result.length;result.push([]);}
  if(index>=0)result[index].push(type);
 }
 for(const type of fallback)if(!seen.has(type))place(type);
 for(const type of overflow)place(type,result.length-1);
 const missing=DESKTOP_APP_TYPES.filter(type=>!seen.has(type));
 if(missing.length){
  // Existing widget layouts stay intact. New app entrances get an empty/new page.
  let preferred=result.findIndex(list=>!list.length);
  if(preferred<0&&result.length<12){preferred=result.length;result.push([]);}
  for(const type of missing)place(type,preferred<0?result.length-1:preferred);
 }
 return result;
}
export function homePageFits(types,visible=()=>true){
 try{homeGridSlots(types.filter(visible));return true;}catch(error){if(error instanceof RangeError)return false;throw error;}
}
export function moveHomeWidget(pages,type,page,index,visible=()=>true){
 if(!HOME_TYPES.includes(type)||!pages[page])return false;
 const destination=pages[page].filter(item=>item!==type);
 destination.splice(Math.max(0,Math.min(index,destination.length)),0,type);
 if(!homePageFits(destination,visible))return false;
 for(const list of pages){const i=list.indexOf(type);if(i>=0)list.splice(i,1);}
 pages[page].splice(0,pages[page].length,...destination);
 return true;
}
export function widgetMenuPosition(r,size,v){
 const gap=10,pad=12,minX=v.left+pad,minY=v.top+pad,maxX=v.left+v.width-size.width-pad,maxY=v.top+v.height-size.height-pad;
 const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
 const above=r.top-gap-size.height,below=r.bottom+gap;
 let y=(r.top+r.bottom)/2<v.top+v.height/2?below:above;
 if(y<minY||y>maxY)y=below<=maxY?below:above;
 return {x:clamp((r.left+r.right-size.width)/2,minX,maxX),y:clamp(y,minY,maxY)};
}

// First-fit with backtracking avoids holes when 1×1 icons precede large widgets.
export function homeGridSlots(types){
 const sizes=types.map(type=>{const isApp=APP_TYPES.includes(type);return {type,width:isApp?1:type==='anniversary'?4:2,height:isApp?1:2};});
 if(sizes.reduce((area,item)=>area+item.width*item.height,0)>24)throw new RangeError('主页网格已满');
 const failed=new Set();
 function pack(index,occupied){
  if(index===sizes.length)return [];
  const key=`${index}:${occupied}`;if(failed.has(key))return null;
  const {type,width,height}=sizes[index];
  for(let row=0;row<=6-height;row++)for(let col=0;col<=4-width;col++){
   let mask=0;for(let y=row;y<row+height;y++)for(let x=col;x<col+width;x++)mask|=1<<(y*4+x);
   if(occupied&mask)continue;
   const rest=pack(index+1,occupied|mask);
   if(rest)return [{type,row:row+1,col:col+1,width,height},...rest];
  }
  failed.add(key);return null;
 }
 const slots=pack(0,0);if(!slots)throw new RangeError('主页网格已满');return slots;
}
