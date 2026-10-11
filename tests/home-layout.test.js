import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHomePages,moveHomeWidget,widgetMenuPosition,homeGridSlots} from '../src/home-layout.js';
import {createState,normalizeState,exportData} from '../src/store.js';
test('old home data migrates into one page without changing widget order or hidden state',()=>{
 const state=createState();delete state.home.pages;state.home.widgets.reverse();state.home.widgets[0].enabled=false;
 const restored=normalizeState(state);assert.deepEqual(restored.home.pages,[['anniversary','memory','mood','note','date']]);assert.equal(restored.home.widgets[0].enabled,false);
});
test('moving between pages keeps one copy of every widget and round trips empty pages',()=>{
 const state=createState();state.home.pages.push([],[]);moveHomeWidget(state.home.pages,'note',1,0);moveHomeWidget(state.home.pages,'anniversary',1,0);
 const restored=normalizeState(JSON.parse(exportData(state)));assert.deepEqual(restored.home.pages,[['date','mood','memory'],['anniversary','note'],[]]);assert.equal(new Set(restored.home.pages.flat()).size,5);
 const repaired=normalizeHomePages([['note','note','bad'],['note','memory']],state.home.widgets);assert.equal(repaired.flat().filter(x=>x==='note').length,1);assert.equal(repaired.flat().length,5);
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
