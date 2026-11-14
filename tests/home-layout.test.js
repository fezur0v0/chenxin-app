import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHomePages,moveHomeWidget,widgetMenuPosition,homeGridSlots,homeItemVisible,homePageFits} from '../src/home-layout.js';
import { APP_TYPES, DESKTOP_APP_TYPES } from '../src/apps/catalog.js';
import {createState,normalizeState,exportData} from '../src/store.js';
test('old widgets keep their order and hidden state while the wide calendar starts on page two',()=>{
 const state=createState();delete state.home.pages;delete state.home.calendarLayoutRevision;state.home.widgets.reverse();state.home.widgets[0].enabled=false;
 const restored=normalizeState(state);assert.deepEqual(restored.home.pages,[['anniversary','memory','mood','note'],['date',...DESKTOP_APP_TYPES]]);assert.equal(restored.home.widgets[0].enabled,false);
});
test('moving between pages keeps one copy of every widget and round trips empty pages',()=>{
 const state=createState();state.home.pages.push([],[]);moveHomeWidget(state.home.pages,'note',2,0);moveHomeWidget(state.home.pages,'anniversary',2,0);
 const restored=normalizeState(JSON.parse(exportData(state)));assert.deepEqual(restored.home.pages,[['mood','memory'],['date',...DESKTOP_APP_TYPES],['anniversary','note'],[]]);assert.equal(new Set(restored.home.pages.flat()).size,5+DESKTOP_APP_TYPES.length);
 const repaired=normalizeHomePages([['note','note','bad'],['note','memory']],state.home.widgets);assert.equal(repaired.flat().filter(x=>x==='note').length,1);assert.equal(repaired.flat().length,5+DESKTOP_APP_TYPES.length);
});
test('context menu follows each widget and stays inside small or offset viewports',()=>{
 const size={width:220,height:168},viewport={left:0,top:0,width:390,height:844};
 const upper=widgetMenuPosition({left:28,right:188,top:150,bottom:300},size,viewport),lower=widgetMenuPosition({left:202,right:362,top:620,bottom:770},size,viewport);
 assert.equal(upper.y,310);assert.equal(lower.y,442);assert.notEqual(upper.x,lower.x);
 for(const v of [viewport,{left:10,top:120,width:320,height:390}])for(const r of [{left:0,right:160,top:0,bottom:150},{left:200,right:360,top:700,bottom:850}]){const p=widgetMenuPosition(r,size,v);assert(p.x>=v.left+12&&p.y>=v.top+12);assert(p.x+size.width<=v.left+v.width-12&&p.y+size.height<=v.top+v.height-12);}
});

test('every fitting widget order packs within 4×6 without overlaps; five visible widgets refuse overflow',()=>{
 const permute=items=>items.length?items.flatMap((item,i)=>permute(items.filter((_,j)=>i!==j)).map(rest=>[item,...rest])):[[]];
 const types=['anniversary','date','note','mood','memory'];
 for(const omitted of types)for(const order of permute(types.filter(type=>type!==omitted))){
  const slots=homeGridSlots(order),occupied=new Set();assert.deepEqual(slots.map(s=>s.type),order);
  for(const s of slots){assert.equal(s.width,['anniversary','date'].includes(s.type)?4:2);assert.equal(s.height,2);assert(s.row+s.height<=7&&s.col+s.width<=5);
   for(let y=s.row;y<s.row+s.height;y++)for(let x=s.col;x<s.col+s.width;x++){const key=`${x},${y}`;assert(!occupied.has(key));occupied.add(key);}
  }
  assert.equal(occupied.size,slots.reduce((area,s)=>area+s.width*s.height,0));
 }
 assert.throws(()=>homeGridSlots(types),RangeError);assert.equal(homePageFits(types),false);
 assert.deepEqual(homeGridSlots([]),[]);
});

test('apps move between pages; a full destination refuses the move atomically',()=>{
 const state=createState();
 for(const app of DESKTOP_APP_TYPES.filter(type=>type!=='app-diary').slice(0,4))assert.equal(moveHomeWidget(state.home.pages,app,0,state.home.pages[0].length),true);
 const before=structuredClone(state.home.pages);
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
 const state=normalizeState(createState());state.home.pages[1].push('app-appearance');state.home.hiddenApps=['app-appearance'];state.appearance.accent='#8dc3f0';state.home.pages.push([]);
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
  const count=5+(pages.flat().includes('app-appearance')?APP_TYPES.length:DESKTOP_APP_TYPES.length);
  assert.equal(result.flat().length,count);assert.equal(new Set(result.flat()).size,count);assert(result.length<=12);
  result.forEach(page=>assert(homePageFits(page,type=>homeItemVisible(state.home,type))));
 }
 const restored=normalizeState(state);assert.deepEqual(normalizeState(restored),restored);
});

test('appearance is Dock-only for defaults and legacy backups while its data and layout IDs survive',()=>{
 const fresh=normalizeState(createState());
 assert(!fresh.home.pages.flat().includes('app-appearance'));
 const old=structuredClone(fresh);old.home.pages[1].splice(2,0,'app-appearance');
 old.appearance.accent='#f2a7be';old.home.note='保留旧便签';
 const restored=normalizeState(JSON.parse(exportData(old)));
 assert.deepEqual(restored.home,old.home);assert.deepEqual(restored.appearance,old.appearance);
 assert.equal(homeItemVisible(restored.home,'app-appearance'),false);
 assert.deepEqual(restored.home.pages[1].filter(type=>homeItemVisible(restored.home,type)),['date',...DESKTOP_APP_TYPES]);
 assert.deepEqual(normalizeState(restored),restored);
});

test('calendar upgrade runs once, keeps custom pages and content, and preserves later moves through backup',()=>{
 const old=createState();delete old.home.calendarLayoutRevision;
 old.home.pages=[['anniversary','date','note','mood','memory'],[...DESKTOP_APP_TYPES],[]];
 old.home.note='保留便签';old.home.widgetTitles.date='我的日历';old.home.showWeekday=false;old.home.widgets.find(w=>w.type==='date').enabled=false;
 old.home.hiddenApps=['app-gallery'];
 const migrated=normalizeState(old);
 assert.deepEqual(migrated.home.pages,[['anniversary','note','mood','memory'],['date',...DESKTOP_APP_TYPES],[]]);
 assert.equal(migrated.home.calendarLayoutRevision,1);assert.equal(homeItemVisible(migrated.home,'date'),false);
 assert.equal(migrated.home.note,'保留便签');assert.equal(migrated.home.widgetTitles.date,'我的日历');assert.equal(migrated.home.showWeekday,false);
 assert.deepEqual(migrated.home.hiddenApps,old.home.hiddenApps);assert.deepEqual(old.home.pages[0],['anniversary','date','note','mood','memory']);
 migrated.home.widgets.find(w=>w.type==='date').enabled=true;
 assert.equal(moveHomeWidget(migrated.home.pages,'date',2,0,type=>homeItemVisible(migrated.home,type)),true);
 const restored=normalizeState(JSON.parse(exportData(migrated)));
 assert.deepEqual(restored.home,migrated.home);assert.deepEqual(normalizeState(restored),restored);
});

test('a crowded second page retains the migrated calendar and relocates every displaced widget once',()=>{
 const old=createState();delete old.home.calendarLayoutRevision;
 old.home.pages=[[...DESKTOP_APP_TYPES],['anniversary','date','note','mood','memory']];
 const restored=normalizeState(old);
 assert.equal(restored.home.pages[1][0],'date');
 assert.equal(new Set(restored.home.pages.flat()).size,5+DESKTOP_APP_TYPES.length);
 assert.equal(restored.home.pages.flat().length,5+DESKTOP_APP_TYPES.length);
 restored.home.pages.forEach(page=>assert(homePageFits(page,type=>homeItemVisible(restored.home,type))));
 assert.deepEqual(normalizeState(restored),restored);
});
