import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarWindow } from '../src/home-calendar.js';
import { createState,normalizeState,exportData } from '../src/store.js';
test('calendar shows three complete weeks and highlights today across month/year boundaries',()=>{
 for(const today of [new Date(2026,0,1),new Date(2026,9,11),new Date(2028,1,29)]){
  const days=calendarWindow(today);assert.equal(days.length,21);assert.equal(days.filter(d=>d.today).length,1);assert.equal(days[7+today.getDay()].day,today.getDate());
  assert.equal(new Set(days.map(d=>d.date)).size,21);assert.equal(new Date(days[0].date+'T12:00:00').getDay(),0);
 }
 assert.equal(calendarWindow(new Date(2026,0,1))[0].date,'2025-12-21');
});
test('requested anniversary date migrates once and later edits and other data survive',()=>{
 const state=createState();assert.equal(state.home.since,'2026-07-12');delete state.home.dateRevision;state.home.since='2026-10-07';state.home.note='保留便签';
 const migrated=normalizeState(state);assert.equal(migrated.home.since,'2026-07-12');assert.equal(migrated.home.note,'保留便签');migrated.home.since='2026-10-07';assert.equal(normalizeState(JSON.parse(exportData(migrated))).home.since,'2026-10-07');
 state.home.since='2025-01-02';assert.equal(normalizeState(state).home.since,'2025-01-02');
});
