import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHomePages,moveHomeWidget,widgetMenuPosition,homeGridSlots,homeItemVisible,homePageFits} from '../src/home-layout.js';
import { APP_TYPES } from '../src/apps/catalog.js';
import {createState,normalizeState,exportData} from '../src/store.js';
test('old widgets keep their page and hidden state; new apps get their own page',()=>{
 const state=createState();delete state.home.pages;state.home.widgets.reverse();state.home.widgets[0].enabled=false;
 const restored=normalizeState(state);assert.deepEqual(restored.home.pages,[['anniversary','memory','mood','note','date'],APP_TYPES]);assert.equal(restored.home.widgets[0].enabled,false);
});
test('moving between pages keeps one copy of every widget and round trips empty pages',()=>{
 const state=createState();state.home.pages.push([],[]);moveHomeWidget(state.home.pages,'note',2,0);moveHomeWidget(state.home.pages,'anniversary',2,0);
 const restored=normalizeState(JSON.parse(exportData(state)));assert.deepEqual(restored.home.pages,[['date','mood','memory'],APP_TYPES,['anniversary','note'],[]]);assert.equal(new Set(restored.home.pages.flat()).size,12);
 const repaired=normalizeHomePages([['note','note','bad'],['note','memory']],state.home.widgets);assert.equal(repaired.flat().filter(x=>x==='note').length,1);assert.equal(repaired.flat().length,12);
});
test('context menu follows each widget and stays inside small or offset viewports',()=>{
 const size={width:220,height:168},viewport={left:0,top:0,width:390,height:844};
 const upper=widgetMenuPosition({left:28,right:188,top:150,bottom:300},size,viewport),lower=widgetMenuPosition({left:202,right:362,top:620,bottom:770},size,viewport);
 assert.equal(upper.y,310);assert.equal(lower.y,442);assert.notEqual(upper.x,lower.x);
 for(const v of [viewport,{left:10,top:120,width:320,height:390}])for(const r of [{left:0,right:160,top:0,bottom:150},{left:200,right:360,top:700,bottom:850}]){const p=widgetMenuPosition(r,size,v);assert(p.x>=v.left+12&&p.y>=v.top+12);assert(p.x+size.width<=v.left+v.width-12&&p.y+size.height<=v.top+v.height-12);}
});

test('all widget orders pack within 4×6 without overlaps or lost widgets',()=>{
 const permute=items=>items.length?items.flatMap((item,i)=>permute(items.filter((_,j)=>i!==j)).map(rest=>[item,...rest])):[[]];
 for(const order of permute(['anniversary','date','note','mood','memory'])){
  const slots=homeGridSlots(order),occupied=new Set();assert.deepEqual(slots.map(s=>s.type),order);
  for(const s of slots){assert.equal(s.width,s.type==='anniversary'?4:2);assert.equal(s.height,2);assert(s.row+s.height<=7&&s.col+s.width<=5);
   for(let y=s.row;y<s.row+s.height;y++)for(let x=s.col;x<s.col+s.width;x++){const key=`${x},${y}`;assert(!occupied.has(key));occupied.add(key);}
  }
  assert.equal(occupied.size,24);
 }
 assert.deepEqual(homeGridSlots([]),[]);
});

test('apps move between pages; a full destination refuses the move atomically',()=>{
 const state=createState(),before=structuredClone(state.home.pages);
 assert.equal(moveHomeWidget(state.home.pages,'app-diary',0,0),false);
 assert.deepEqual(state.home.pages,before);
 state.home.widgets.find(w=>w.type==='note').enabled=false;
 assert.equal(moveHomeWidget(state.home.pages,'app-diary',0,0,type=>homeItemVisible(state.home,type)),true);
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.deepEqual(restored.home.pages,state.home.pages);
 assert.equal(restored.home.widgets.find(w=>w.type==='note').enabled,false);
 const slots=homeGridSlots(restored.home.pages[0].filter(type=>homeItemVisible(restored.home,type)));
 assert.deepEqual(slots.find(s=>s.type==='app-diary'),{type:'app-diary',row:1,col:1,width:1,height:1});
});

test('hidden app entrances, appearance and mixed layouts round trip without losing data',()=>{
 const state=normalizeState(createState());state.home.hiddenApps=['app-appearance'];state.appearance.accent='#8dc3f0';state.home.pages.push([]);
 moveHomeWidget(state.home.pages,'app-music',2,0);
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.deepEqual(restored.home,state.home);assert.deepEqual(restored.appearance,state.appearance);
 assert.equal(homeItemVisible(restored.home,'app-appearance'),false);
 assert.equal(restored.home.pages.flat().filter(id=>id==='app-appearance').length,1);
 restored.home.hiddenApps='malformed';assert.doesNotThrow(()=>normalizeState(restored));
});

test('overfull imports and twelve-page legacy layouts keep every entrance exactly once',()=>{
 const state=createState();
 for(const pages of [[['anniversary','date','note','mood','memory',...APP_TYPES,...APP_TYPES]],Array.from({length:12},(_,i)=>i?[]:['anniversary','date','note','mood','memory'])]){
  const result=normalizeHomePages(pages,state.home.widgets);
  assert.equal(result.flat().length,12);assert.equal(new Set(result.flat()).size,12);assert(result.length<=12);
  result.forEach(page=>assert(homePageFits(page)));
 }
 const restored=normalizeState(state);assert.deepEqual(normalizeState(restored),restored);
});
