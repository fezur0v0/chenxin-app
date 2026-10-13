import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, exportData } from '../src/store.js';
import { emptyMusic, musicCollections, normalizeMusic, nextMusicId, trackFromFile, formatMusicTime } from '../src/apps/music/model.js';
import { music, musicSheet } from '../src/apps/music/view.js';
const fixture=()=>{const m=emptyMusic();m.tracks=[['a','第一首'],['b','第二首'],['c','第三首']].map(([id,title],i)=>({id,title,artist:'歌手',cover:'',fileName:title+'.wav',type:'audio/wav',size:100,duration:90,liked:i===0,created:1,lastPlayed:i===2?100:0}));m.queue=['a','b','c'];m.currentId='b';m.playlists=[{id:'my',title:'我的歌单',description:'介绍',cover:'',trackIds:['a','c'],created:1}];return m;};
test('old backups get an empty music library; songs, playlists and existing user data survive backup',()=>{
 const state=createState();delete state.music;assert.deepEqual(normalizeState(state).music,emptyMusic());
 state.music=fixture();state.home.note='保留便签';state.diaryEntries=[{id:'diary',date:'2026-10-11',title:'日记',content:'保留日记',mood:'平静',created:1,updated:1}];
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.deepEqual(restored.music,state.music);assert.equal(restored.home.note,state.home.note);assert.deepEqual(restored.diaryEntries,state.diaryEntries);assert.deepEqual(restored.home.pages,state.home.pages);
 assert.ok(!exportData(state).includes('blob:'));
});
test('music normalization rejects corrupt structures and executable artwork, and filters stale references',()=>{
 for(const value of [null,{}, {tracks:[{id:'a',title:0}],playlists:[]},{tracks:[{id:'a',title:'x'},{id:'a',title:'y'}],playlists:[]}])assert.throws(()=>normalizeMusic(value));
 const m=fixture();m.tracks[0].cover='javascript:alert(1)';m.queue.push('unknown','a');m.playlists[0].trackIds.push('unknown','a');m.currentId='unknown';m.mode='evil';
 const restored=normalizeMusic(m);assert.equal(restored.tracks[0].cover,'');assert.equal(restored.currentId,'');assert.equal(restored.mode,'list');assert.deepEqual(restored.queue,['a','b','c']);assert.deepEqual(restored.playlists[0].trackIds,['a','c']);
});
test('queue advances, loops, repeats one on end, and shuffles without replaying the same song',()=>{
 const m=fixture();assert.equal(nextMusicId(m),'c');assert.equal(nextMusicId(m,-1),'a');m.currentId='c';assert.equal(nextMusicId(m),'a');m.mode='one';assert.equal(nextMusicId(m,1,true),'c');assert.equal(nextMusicId(m,1,false),'a');m.mode='shuffle';assert.equal(nextMusicId(m,1,false,()=>0),'a');assert.equal(nextMusicId(m,1,false,()=>.99),'b');m.queue=['c'];assert.equal(nextMusicId(m),'c');m.queue=[];assert.equal(nextMusicId(m),'');
});
test('collections use real liked/recent records; imports validate files and derive titles',()=>{
 const m=fixture(),lists=musicCollections(m);assert.deepEqual(lists[0].tracks.map(t=>t.id),['a']);assert.deepEqual(lists[2].tracks.map(t=>t.id),['c']);assert.deepEqual(lists[3].tracks.map(t=>t.id),['a','c']);
 const track=trackFromFile({name:'歌手 - 旋律.wav',type:'audio/wav',size:1000});assert.equal(track.title,'旋律');assert.equal(track.artist,'歌手');assert.equal(track.duration,0);assert.equal(track.liked,false);
 for(const file of [{name:'text.txt',type:'text/plain',size:100},{name:'a.wav',type:'audio/wav',size:0},{name:'a.wav',type:'audio/wav',size:81*1024*1024}])assert.throws(()=>trackFromFile(file));
 assert.equal(formatMusicTime(216.7),'03:36');assert.equal(formatMusicTime(NaN),'00:00');
});
test('music pages and edit sheets escape imported names and provide labelled player controls',()=>{
 const state=createState();state.music=fixture();state.music.tracks[1].title='<img src=x onerror=alert(1)>';state.music.playlists[0].title='<script>bad</script>';
 for(const screen of ['home','playlist','player']){const html=music(state,{screen,playlistId:'my'});assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('aria-label='));}
 const sheet=musicSheet('track',state,{},state.music.tracks[1]);assert.ok(sheet.includes('&lt;img'));assert.ok(!sheet.includes('<img src=x'));
});
