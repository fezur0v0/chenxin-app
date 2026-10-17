import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,exportData,addDraftMessage} from '../src/store.js';
import {parseStickerText,importStickers,saveCategory,deleteCategory,moveStickers,visibleStickers,stickerSource,visibleExpressions,saveKaomoji,moveExpressions} from '../src/expressions/model.js';
import {chat} from '../src/views.js';
import {expressionContents} from '../src/expressions/view.js';

test('text import accepts both colon styles, split lines, BOM and URLs containing colons',()=>{
 const rows=parseStickerText('\uFEFF开心：https://example.com/a.png?next=https://other.test/p\n抱抱:\nhttps://example.com/b.gif\n生气: https://example.com/c.webp');
 assert.deepEqual(rows.map(x=>x.note),['开心','抱抱','生气']);assert.equal(rows[0].value,'https://example.com/a.png?next=https://other.test/p');
 for(const text of ['','没有网址','无效：http://example.com/a.png','有误：javascript:alert(1)','开心：https://example.com/a\n缺失含义'])assert.throws(()=>parseStickerText(text));
});
test('JSON import accepts list, dictionary and exported sticker shapes while invalid records fail atomically',()=>{
 for(const input of ['[{"meaning":"开心","url":"https://example.com/a.png"}]','{"开心":"https://example.com/a.png"}','{"stickers":[{"note":"开心","value":"https://example.com/a.png"}]}'])assert.deepEqual(parseStickerText(input),[{note:'开心',value:'https://example.com/a.png'}]);
 for(const input of ['[]','null','[{"meaning":"缺失网址"}]','[{"url":"https://example.com/a"}]','[{"note":"有效","url":"https://example.com/a"},{"note":"无效","url":"file:///a"}]'])assert.throws(()=>parseStickerText(input));
 const e=createState().expressions,before=structuredClone(e);assert.throws(()=>importStickers(e,[{note:'好',value:'https://example.com/a'},{note:'坏',value:'javascript:alert(1)'}]));assert.deepEqual(e,before);
});
test('deduplication, capacity and destination checks cannot partially import a collection',()=>{
 const e=createState().expressions,rows=parseStickerText('抱抱：https://example.com/a\n抱抱：https://example.com/a');
 assert.deepEqual(importStickers(e,rows),{added:1,skipped:1});assert.deepEqual(importStickers(e,rows),{added:0,skipped:2});
 const before=structuredClone(e);assert.throws(()=>importStickers(e,rows,'missing'));assert.deepEqual(e,before);
 e.stickers=Array.from({length:200},(_,i)=>({id:String(i),note:String(i),value:`https://example.com/${i}`}));const full=structuredClone(e);assert.throws(()=>importStickers(e,[{note:'超限',value:'https://example.com/extra'}]));assert.deepEqual(e,full);
});
test('category rename and batch move preserve notes; deleting a category keeps stickers and sent messages',()=>{
 const state=createState(),e=state.expressions,a=saveCategory(e,'抱抱'),b=saveCategory(e,'开心');importStickers(e,parseStickerText('安慰：https://example.com/a\n想你：https://example.com/b'),a.id);
 assert.throws(()=>saveCategory(e,'开心',a.id));saveCategory(e,'安慰',a.id);const ids=e.stickers.map(s=>s.id);moveStickers(e,ids,b.id);assert(e.stickers.every(s=>s.category===b.id));assert.deepEqual(visibleStickers(e,{category:b.id}).map(s=>s.note),['安慰','想你']);
 addDraftMessage(state,'',[{name:'安慰',note:'安慰',kind:'sticker',data:e.stickers[0].value}]);deleteCategory(e,b.id);assert.equal(e.stickers.length,2);assert(e.stickers.every(s=>s.category===''));assert.equal(state.sessions[0].messages[0].attachments[0].data,'https://example.com/a');assert.equal(e.categories[0].name,'安慰');
});
test('legacy sticker names become notes; category, HTTPS and GIF data survive backup with other data',()=>{
 const state=createState();state.expressions.stickers=[{id:'old',name:'原备注',value:'data:image/png;base64,AAAA',favorite:true,used:45}];state.home.note='旧便签';const old=normalizeState(state);assert.equal(old.expressions.stickers[0].note,'原备注');assert.equal(old.expressions.stickers[0].category,'');
 const category=saveCategory(old.expressions,'新分类');importStickers(old.expressions,parseStickerText('开心：https://example.com/a.gif'),category.id);old.expressions.stickers.push({id:'gif',name:'动图',note:'挥手',value:'data:image/gif;base64,AAAA',category:category.id});addDraftMessage(old,'',[{name:'开心',note:'开心',kind:'sticker',data:'https://example.com/a.gif'},{name:'动画',kind:'sticker',note:'挥手',data:'data:image/gif;base64,AAAA'}]);
 const restored=normalizeState(JSON.parse(exportData(old)));assert.equal(restored.home.note,'旧便签');assert.equal(restored.expressions.stickers.length,3);assert.equal(restored.expressions.stickers[1].category,category.id);assert.equal(restored.sessions[0].messages[0].attachments[0].note,'开心');assert.equal(restored.sessions[0].messages[0].attachments[1].data,'data:image/gif;base64,AAAA');assert.deepEqual(normalizeState(restored),restored);
});
test('image sources reject executable and credential URLs; unrelated attachments stay restricted',()=>{
 for(const src of ['javascript:alert(1)','data:image/svg+xml;base64,AAAA','file:///a','https://user:secret@example.com/a','http://example.com/a','//example.com/a'])assert.equal(stickerSource(src),'');
 const state=createState(),m=addDraftMessage(state,'',[{name:'remote ordinary',data:'https://example.com/a'},{name:'unsafe sticker',kind:'sticker',data:'javascript:alert(1)'}]);assert(m.attachments.every(a=>a.data===''));
});
test('chat image captions are hidden while notes and file names remain accessible and escaped',()=>{
 const s=createState();addDraftMessage(s,'我写的正文',[{name:'不显示的图片名',data:'data:image/png;base64,AAAA'},{name:'<img onerror=evil>',kind:'sticker',note:'抱抱',data:'https://example.com/a'},{name:'保留的文件名.txt'}]);const html=chat(s);
 assert(!html.includes('<span>不显示的图片名'));assert(!html.includes('<span>&lt;img onerror'));assert(html.includes('alt="抱抱"'));assert(html.includes('保留的文件名.txt'));assert(html.includes('我写的正文'));
 importStickers(s.expressions,[{note:'<script>test</script>',value:'https://example.com/a'}]);const panel=expressionContents(s,{tab:'stickers',managing:true,selected:[s.expressions.stickers[0].id]});assert(panel.includes('&lt;script&gt;'));assert(!panel.includes('<script>'));assert(panel.includes('aria-pressed="true"'));assert(panel.includes('移动'));
});

test('search matches notes and legacy names together with category and favorite/recent filters without mutating the library',()=>{
 const e=createState().expressions,a=saveCategory(e,'日常'),b=saveCategory(e,'抱抱');
 importStickers(e,parseStickerText('温柔抱抱：https://example.com/a\nGOOD NIGHT：https://example.com/b'),a.id);
 importStickers(e,parseStickerText('抱抱你：https://example.com/c'),b.id);
 e.stickers[0].used=10;e.stickers[1].favorite=false;e.stickers[2].used=20;
 const original=structuredClone(e);
 assert.deepEqual(visibleStickers(e,{search:' 抱抱 ',filter:'recent'}).map(s=>s.note),['抱抱你','温柔抱抱']);
 assert.deepEqual(visibleStickers(e,{search:'抱抱',category:a.id,filter:'favorites'}).map(s=>s.note),['温柔抱抱']);
 assert.deepEqual(visibleStickers(e,{search:'good night'}).map(s=>s.note),['GOOD NIGHT']);
 assert.equal(visibleStickers(e,{search:'good night',filter:'favorites'}).length,0);
 e.stickers[1].name='old-name.png';assert.equal(visibleStickers(e,{search:'OLD-NAME'}).length,1);e.stickers[1].name=original.stickers[1].name;
 assert.deepEqual(e,original);
});


test('kaomoji categories remain independent of sticker categories and survive backups with legacy data',()=>{
 const state=createState(),e=state.expressions;
 e.categories=[{id:'shared-category',name:'表情包分类'}];e.stickers=[{id:'shared-item',note:'抱抱',name:'抱抱',value:'https://example.com/hug',category:'shared-category',favorite:true,used:9}];
 e.kaomoji=[{id:'shared-item',value:'^_^',favorite:true,used:123}];delete e.kaomojiCategories;
 const restored=normalizeState(state);assert.deepEqual(restored.expressions.kaomojiCategories,[]);assert.equal(restored.expressions.kaomoji[0].category,'');
 const cat=saveCategory(restored.expressions,'表情包分类','','kaomoji');
 saveKaomoji(restored.expressions,{id:'shared-item',value:'^ω^',category:cat.id});
 assert.equal(restored.expressions.kaomoji[0].used,123);assert.equal(restored.expressions.kaomoji[0].favorite,true);
 const backup=normalizeState(JSON.parse(exportData(restored)));assert.deepEqual(backup.expressions,restored.expressions);
 deleteCategory(backup.expressions,cat.id,'kaomoji');assert.equal(backup.expressions.kaomoji[0].category,'');assert.deepEqual(backup.expressions.stickers,e.stickers);
 assert.deepEqual(backup.expressions.categories,e.categories);
});
test('kaomoji search and batch moves act only on their collection, preserving identical sticker IDs',()=>{
 const e=createState().expressions,a=saveCategory(e,'开心','','kaomoji'),b=saveCategory(e,'抱抱','','kaomoji');
 e.kaomoji=[{id:'same',value:'^_^',category:a.id,favorite:true,used:7},{id:'two',value:'^ω^',category:b.id,favorite:false,used:0}];
 e.stickers=[{id:'same',name:'图片',note:'图片',value:'https://example.com/a',category:''}];const stickers=structuredClone(e.stickers);
 assert.deepEqual(visibleExpressions(e,{tab:'kaomoji',category:a.id,search:'^'}).map(x=>x.id),['same']);
 moveExpressions(e,['same','two'],b.id,'kaomoji');assert(e.kaomoji.every(x=>x.category===b.id));assert.deepEqual(e.stickers,stickers);
 deleteCategory(e,b.id,'kaomoji');assert.equal(e.kaomoji.length,2);assert(e.kaomoji.every(x=>x.category===''));
});
test('invalid kaomoji edits and wrong collection destinations leave all data untouched',()=>{
 const e=createState().expressions,stickerCategory=saveCategory(e,'图片分类'),before=structuredClone(e);
 for(const entry of [{value:'  '},{value:'x'.repeat(201)},{id:'missing',value:'^_^'},{value:'^_^',category:stickerCategory.id}]){
  assert.throws(()=>saveKaomoji(e,entry));assert.deepEqual(e,before);
 }
});
