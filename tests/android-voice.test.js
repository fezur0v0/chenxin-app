import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareVoiceManifest} from '../scripts/prepare-android-voice.mjs';
const wrap=body=>`<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n<application android:label="尘"/>\n${body}\n</manifest>`;
test('WebView voice setup fills both permissions and remains idempotent',()=>{
 const original=wrap('<uses-permission android:name="android.permission.INTERNET"/>');
 const first=prepareVoiceManifest(original);
 assert.deepEqual(first.added,['RECORD_AUDIO','MODIFY_AUDIO_SETTINGS']);
 assert(first.xml.includes('<application android:label="尘"/>'));
 assert(first.xml.includes('android.permission.INTERNET'));
 const second=prepareVoiceManifest(first.xml);
 assert.deepEqual(second.added,[]);assert.equal(second.xml,first.xml);
});
test('previous setup with microphone allowed still gains missing audio-settings permission',()=>{
 const original=wrap('<uses-permission android:name="android.permission.RECORD_AUDIO"/>');
 const result=prepareVoiceManifest(original);
 assert.deepEqual(result.added,['MODIFY_AUDIO_SETTINGS']);
 assert.equal((result.xml.match(/android\.permission\.RECORD_AUDIO/g)||[]).length,1);
 assert.equal((result.xml.match(/android\.permission\.MODIFY_AUDIO_SETTINGS/g)||[]).length,1);
});
test('commented permissions do not count and single-quoted declarations are preserved',()=>{
 const result=prepareVoiceManifest(wrap(`<!-- <uses-permission android:name="android.permission.RECORD_AUDIO"/> -->\n<uses-permission android:name = 'android.permission.MODIFY_AUDIO_SETTINGS'/>`));
 assert.deepEqual(result.added,['RECORD_AUDIO']);
 assert(result.xml.includes("android:name = 'android.permission.MODIFY_AUDIO_SETTINGS'"));
 assert.equal((result.xml.replace(/<!--[\s\S]*?-->/g,'').match(/android\.permission\.RECORD_AUDIO/g)||[]).length,1);
});
test('malformed manifests fail without producing a replacement',()=>{
 for(const xml of ['', '<manifest></manifest>',wrap('').replace('</manifest>','')])assert.throws(()=>prepareVoiceManifest(xml),/格式无法识别/);
});
