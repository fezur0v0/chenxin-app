// A presentation layer only: never waits for model or network-provider connections.
export async function finishSplash() {
 const splash=document.querySelector('#splash');if(!splash)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const began=Number(splash.dataset.started)||performance.now();
 const app=document.querySelector('#app');app.inert=true;
 const fog=new Image();fog.src=new URL('../assets/splash-fog.webp',import.meta.url).href;
 const font=document.fonts?.load('80px "Distant Stroke"').catch(()=>[]);
 await Promise.race([Promise.allSettled([font,fog.decode()]),pause(450)]);
 if(!splash.isConnected)return;
 splash.classList.add('is-ready');
 await pause(reduced?0:Math.max(0,700-(performance.now()-began)));
 if(!splash.isConnected)return;
 splash.classList.add('is-leaving');app.inert=false;
 await pause(reduced?40:360);
 splash.remove();
}
