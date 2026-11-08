const activeWaves=new WeakMap();
const motionAllowed=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;

function showRipple(button,origin){
 if(!button||button.disabled||!motionAllowed())return;
 activeWaves.get(button)?.animation.cancel();
 const bounds=button.getBoundingClientRect();
 const x=origin?Math.max(0,Math.min(bounds.width,origin.clientX-bounds.left)):bounds.width/2;
 const y=origin?Math.max(0,Math.min(bounds.height,origin.clientY-bounds.top)):bounds.height/2;
 const radius=Math.hypot(Math.max(x,bounds.width-x),Math.max(y,bounds.height-y));
 if(!radius)return;
 const wave=document.createElement('span');wave.className='touch-ripple-wave';wave.setAttribute('aria-hidden','true');
 Object.assign(wave.style,{left:x-radius-button.clientLeft+'px',top:y-radius-button.clientTop+'px',width:2*radius+'px',height:2*radius+'px'});
 button.append(wave);
 const animation=wave.animate([{transform:'scale(0)',opacity:.22},{transform:'scale(1)',opacity:0}],{duration:220,easing:'cubic-bezier(.2,.65,.3,1)'});
 const finished=animation.finished.catch(()=>{}).then(()=>{
  wave.remove();
  if(activeWaves.get(button)?.animation===animation)activeWaves.delete(button);
 });
 activeWaves.set(button,{animation,finished});
}
export function bindTouchRipple(root){
 root.addEventListener('pointerdown',event=>{
  if(event.button===0&&event.isPrimary)showRipple(event.target.closest('button.touch-ripple-button'),event);
 },true);
 root.addEventListener('click',event=>{
  if(event.isTrusted&&event.detail===0)showRipple(event.target.closest('button.touch-ripple-button'));
 },true);
}
export function touchRippleFinished(button){return activeWaves.get(button)?.finished;}
