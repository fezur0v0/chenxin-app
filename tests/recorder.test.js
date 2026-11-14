import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoiceRecorder} from '../src/chat-content/recorder.js';

test('cancel during a pending microphone permission releases the eventual stream and creates no voice',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator'),recorder=globalThis.MediaRecorder;
 let grant,stopped=0,saved=0;const states=[];
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>{grant=resolve;})}}});
 globalThis.MediaRecorder=class {};
 try{
  const controller=createVoiceRecorder({onFile:()=>saved++,onState:state=>states.push(state),notify:()=>{}});
  const opening=controller.start();assert(controller.active);controller.cancel();
  grant({getTracks:()=>[{stop:()=>stopped++}]});await opening;
  assert.equal(stopped,1);assert.equal(saved,0);assert.equal(controller.active,false);assert.deepEqual(states,[true,false]);
 }finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;if(recorder)globalThis.MediaRecorder=recorder;else delete globalThis.MediaRecorder;}
});
