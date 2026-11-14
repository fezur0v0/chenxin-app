// The audio always comes from the microphone. Recognition is optional and may
// use the browser's online service; never substitute a transcript for audio.
export function createVoiceRecorder({onFile,onState,notify}){
 let current=null,revision=0;
 function release(run){run.stream?.getTracks().forEach(track=>track.stop());clearTimeout(run.limit);clearTimeout(run.recognitionLimit);}
 function cancel(){revision++;const run=current;current=null;if(!run)return;run.cancelled=true;run.finishRecognition?.();try{run.recognition?.abort();}catch{}if(run.recorder?.state==='recording')run.recorder.stop();release(run);onState(false);}
 async function start(){
  if(current)return;
  if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder){notify('当前环境不支持录音，请在支持麦克风的浏览器或更新后的手机 App 中使用。');return;}
  const ticket=++revision,run={chunks:[],words:new Map(),cancelled:false,started:0};current=run;onState(true);
  try{
   run.stream=await navigator.mediaDevices.getUserMedia({audio:true});
   if(ticket!==revision){release(run);return;}
   const type=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(value=>MediaRecorder.isTypeSupported(value));
   run.recorder=new MediaRecorder(run.stream,type?{mimeType:type}:undefined);
   const Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
   if(Recognition){
    try{
     const recognition=new Recognition();run.recognition=recognition;recognition.lang='zh-CN';recognition.interimResults=true;recognition.continuous=true;
     recognition.onresult=event=>{if(current!==run||run.cancelled)return;for(let i=event.resultIndex;i<event.results.length;i++)run.words.set(i,{text:event.results[i][0].transcript,final:event.results[i].isFinal});};
     recognition.onend=()=>{run.recognitionEnded=true;run.finishRecognition?.();};
     recognition.onerror=()=>{run.recognitionFailed=true;};recognition.start();
    }catch{run.recognitionFailed=true;}
   }
   run.recorder.ondataavailable=event=>{if(event.data.size)run.chunks.push(event.data);};
   run.recorder.onstop=async()=>{
    run.stopped ||= performance.now();
    release(run);
    if(run.cancelled||ticket!==revision)return;
    try{
     try{run.recognition?.stop();}catch{}
     if(run.recognition&&!run.recognitionEnded)await new Promise(resolve=>{run.finishRecognition=resolve;run.recognitionLimit=setTimeout(resolve,1500);});
     clearTimeout(run.recognitionLimit);try{run.recognition?.abort();}catch{}
     if(run.cancelled||ticket!==revision)return;
     const blob=new Blob(run.chunks,{type:run.recorder.mimeType||'audio/webm'});
     if(!blob.size||blob.size>10*1024*1024)throw new Error(blob.size?'录音超过 10MB，请缩短后重录。':'没有录到声音，请重试。');
     const transcript=[...run.words.entries()].sort((a,b)=>a[0]-b[0]).map(([,word])=>word.text).join('').trim().slice(0,12000);
     const ext=blob.type.includes('mp4')?'m4a':blob.type.includes('ogg')?'ogg':'webm';
     await onFile(new File([blob],`语音-${Date.now()}.${ext}`,{type:blob.type}),transcript,Math.min(600,Math.max(.1,(run.stopped-run.started)/1000)),()=>!run.cancelled&&ticket===revision);
     if(!transcript)notify('录音已保留；当前识别服务未返回文字，可先发送语音。');
    }catch(error){if(!run.cancelled)notify(error.message||'录音未能保存，请重试。');}
    finally{if(current===run){current=null;onState(false);}}
   };
   run.recorder.onerror=()=>{notify('录音中断，请检查麦克风权限后重试。');cancel();};
   run.started=performance.now();run.recorder.start(250);run.limit=setTimeout(stop,600000);
  }catch(error){if(ticket!==revision)return;cancel();notify(error.name==='NotAllowedError'?'请允许麦克风权限后再录音。':error.message||'麦克风暂时无法使用。');}
 }
 function stop(){const run=current;if(!run||run.recorder?.state!=='recording')return;run.stopped=performance.now();run.recorder.stop();onState(true,true);}
 return {start,stop,cancel,get active(){return !!current;},get recording(){return current?.recorder?.state==='recording';}};
}
