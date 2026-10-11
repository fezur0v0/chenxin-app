export const HOME_TYPES=['anniversary','date','note','mood','memory'];
export function normalizeHomePages(pages,widgets){
 const fallback=['anniversary',...widgets.map(w=>w.type)],seen=new Set();
 const result=(Array.isArray(pages)&&pages.length?pages.slice(0,12):[fallback]).map(page=>(Array.isArray(page)?page:[]).filter(type=>HOME_TYPES.includes(type)&&!seen.has(type)&&seen.add(type)));
 for(const type of fallback)if(!seen.has(type))result[0].push(type);
 return result;
}
export function moveHomeWidget(pages,type,page,index){
 if(!HOME_TYPES.includes(type)||!pages[page])return;
 for(const list of pages){const i=list.indexOf(type);if(i>=0)list.splice(i,1);}
 pages[page].splice(Math.max(0,Math.min(index,pages[page].length)),0,type);
}
export function widgetMenuPosition(r,size,v){
 const gap=10,pad=12,minX=v.left+pad,minY=v.top+pad,maxX=v.left+v.width-size.width-pad,maxY=v.top+v.height-size.height-pad;
 const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
 const above=r.top-gap-size.height,below=r.bottom+gap;
 let y=(r.top+r.bottom)/2<v.top+v.height/2?below:above;
 if(y<minY||y>maxY)y=below<=maxY?below:above;
 return {x:clamp((r.left+r.right-size.width)/2,minX,maxX),y:clamp(y,minY,maxY)};
}

// First-fit packing keeps every widget inside the four-column, six-row desktop.
export function homeGridSlots(types){
 const cells=Array.from({length:6},()=>Array(4).fill(false));
 return types.map(type=>{
  const width=type==='anniversary'?4:2,height=2;
  for(let row=0;row<=6-height;row++)for(let col=0;col<=4-width;col++){
   if(cells.slice(row,row+height).every(line=>line.slice(col,col+width).every(cell=>!cell))){
    for(let y=row;y<row+height;y++)for(let x=col;x<col+width;x++)cells[y][x]=true;
    return {type,row:row+1,col:col+1,width,height};
   }
  }
  throw new RangeError('主页网格已满');
 });
}
