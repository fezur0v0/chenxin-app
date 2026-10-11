import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, exportData, loadState, saveState } from '../src/store.js';
import { diaryCalendar, shiftDiaryMonth, validDiaryDate, saveDiaryEntry, diaryMonthEntries } from '../src/apps/diary/model.js';
import { diary, diaryEditor } from '../src/apps/diary/view.js';
test('diary calendar handles leap days, year rollover and supported year limits',()=>{
 assert.equal(diaryCalendar('2024-02').filter(Boolean).length,29);
 assert.equal(diaryCalendar('2026-02').filter(Boolean).length,28);
 assert.equal(diaryCalendar('2026-10').indexOf('2026-10-01'),4);
 assert.equal(diaryCalendar('2026-08').length,42);
 assert.equal(shiftDiaryMonth('2026-12',1),'2027-01');
 assert.equal(shiftDiaryMonth('2026-01',-1),'2025-12');
 assert.equal(shiftDiaryMonth('0001-01',-1),'0001-01');
 assert.equal(shiftDiaryMonth('9999-12',1),'9999-12');
 for(const date of ['2026-02-29','2026-04-31','2026-13-01','0000-01-01','2026-1-1'])assert.equal(validDiaryDate(date),false);
 assert.equal(validDiaryDate('2024-02-29'),true);
});
test('multiple diaries per day sort by date and creation; editing preserves identity and creation time',()=>{
 const state=createState();
 const first=saveDiaryEntry(state,{date:'2026-10-11',title:' first ',content:' text ',mood:'开心'},1000);
 const later=saveDiaryEntry(state,{date:'2026-10-11',content:'later',mood:'平静'},2000);
 saveDiaryEntry(state,{date:'2026-09-30',content:'previous month'},3000);
 const edited=saveDiaryEntry(state,{id:first.id,date:'2026-10-11',title:'edited',content:'changed',mood:'想念'},4000);
 assert.equal(edited.id,first.id);assert.equal(edited.created,1000);assert.equal(edited.updated,4000);
 assert.equal(state.diaryEntries.length,3);
 assert.deepEqual(diaryMonthEntries(state.diaryEntries,'2026-10').map(e=>e.id),[later.id,first.id]);
 const before=structuredClone(state);
 for(const data of [{date:'2026-02-30',content:'bad'},{date:'2026-10-11',content:'  '},{id:'missing',date:'2026-10-11',content:'text'}])assert.throws(()=>saveDiaryEntry(state,data));
 assert.deepEqual(state,before);
});
test('diary backup and reload preserve existing user data; old backups start with no sample entries',()=>{
 const state=createState();state.home.note='保留便签';state.sessions[0].messages.push({id:'m',role:'user',text:'保留聊天',time:1});
 saveDiaryEntry(state,{date:'2026-10-11',title:'我的日记',content:'本机记录',mood:'疲惫'});
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 saveState(storage,state);
 const restored=normalizeState(JSON.parse(exportData(loadState(storage))));
 assert.deepEqual(restored.diaryEntries,state.diaryEntries);assert.equal(restored.home.note,'保留便签');assert.equal(restored.sessions[0].messages[0].text,'保留聊天');assert.deepEqual(restored.home.pages,state.home.pages);
 delete state.diaryEntries;
 for(const version of [1,2])assert.deepEqual(normalizeState({...state,version}).diaryEntries,[]);
 for(const diaryEntries of [null,{},[{id:'bad',date:'2026-02-30',content:'text'}],[...restored.diaryEntries,...restored.diaryEntries]])assert.throws(()=>normalizeState({...state,diaryEntries}),/日记数据损坏/);
});
test('diary and editor render user text safely and expose mood/date labels',()=>{
 const state=createState(),entry=saveDiaryEntry(state,{date:'2026-10-11',title:'<img src=x onerror=alert(1)>',content:'</textarea><script>bad</script>',mood:'开心'});
 const view=diary(state,{month:'2026-10',selected:'2026-10-11'}),editor=diaryEditor(entry,entry.date);
 assert.ok(view.includes('2026-10-11，1 篇日记，开心'));
 for(const html of [view,editor]){assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;'));}
});
