import { escape } from './ui.js';

// Shared sheet heading. Its handle is also a keyboard-accessible close control.
export function drawerHeader({title,heading='',action='close-tray',music=false,actionAttribute='data-action'}) {
 const attribute=music?'data-music-action':actionAttribute;
 return `<button type="button" class="tray-handle drawer-handle" ${attribute}="${escape(action)}" aria-label="收起${escape(title)}，可向下拖动"><span aria-hidden="true"></span></button><header class="tray-heading drawer-heading ${music?'music-sheet-heading':''}">${heading||`<h2>${escape(title)}</h2>`}</header>`;
}
const motionAllowed=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
export async function animateDrawerClose(panel) {
 if(!panel||!motionAllowed())return;
 const from=panel.style.transform||getComputedStyle(panel).transform;
 panel.getAnimations().filter(animation=>animation.effect?.getKeyframes().some(frame=>'transform' in frame)).forEach(animation=>animation.cancel());
 await panel.animate([{transform:from==='none'?'translateY(0)':from},{transform:'translateY(100%)'}],{duration:200,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{});
}
export function bindDrawerDismiss(root,{panel,close,backdrop=false}) {
 let drag=null,suppressClick=false;
 function reset(target) {
  if(!target)return;
  const from=target.style.transform;target.style.transform='';
  if(from&&motionAllowed())target.animate([{transform:from},{transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
 }
 root.addEventListener('pointerdown',event=>{
  const handle=event.target.closest('.drawer-handle'),target=panel();
  if(!handle||!target||event.button!==0)return;
  target.getAnimations().filter(animation=>animation.effect?.getKeyframes().some(frame=>'transform' in frame)).forEach(animation=>animation.cancel());
  drag={id:event.pointerId,y:event.clientY,panel:target,moved:false};suppressClick=false;handle.setPointerCapture(event.pointerId);
 });
 root.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const delta=event.clientY-drag.y;if(Math.abs(delta)>5)drag.moved=true;
  if(drag.moved)drag.panel.style.transform=`translateY(${delta<0?Math.max(-32,delta*.2):delta}px)`;
 });
 root.addEventListener('pointerup',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const active=drag;drag=null;suppressClick=active.moved;
  if(event.clientY-active.y>70)void close();else if(active.moved)reset(active.panel);
 });
 root.addEventListener('pointercancel',()=>{if(drag){suppressClick=drag.moved;reset(drag.panel);}drag=null;});
 root.addEventListener('click',event=>{
  if(event.target.closest('.drawer-handle')&&suppressClick&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;return;}
  if(!backdrop)return;
  const target=panel();if(!target||event.target!==target)return;
  const rect=target.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)void close();
 },true);
}
