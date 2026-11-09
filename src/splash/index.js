import { createWater } from './water.js';

// Presentation only. The app calls this after rendering, never after a provider request.
// Wallpaper is the existing appearance setting, not a second copy in storage.
export function finishSplash({ wallpaper = '' } = {}) {
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  if (!splash) { if (app) app.inert = false; return Promise.resolve(); }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  return new Promise(resolve => {
    let water, hold, fade, disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      clearTimeout(hold);
      clearTimeout(fade);
      water?.destroy();
      document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', preference);
      splash.removeEventListener('splash:dispose', dispose);
      splash.dispatchEvent(new Event('splash:dispose'));
      splash.remove();
      if (app) app.inert = false;
      resolve();
    };
    const visibility = () => { if (document.hidden) dispose(); };
    const preference = () => { if (motion.matches) dispose(); };
    const leave = () => {
      splash.classList.add('is-leaving');
      if (app) app.inert = false;
      fade = setTimeout(dispose, 550);
    };
    splash.addEventListener('splash:dispose', dispose);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', preference);
    if (motion.matches || document.hidden) { dispose(); return; }
    try {
      water = createWater(splash, { wallpaper });
      // Unsupported graphics still get a short, clean transition into the app.
      hold = setTimeout(leave, water ? 1550 : 150);
    } catch {
      dispose();
    }
  });
}
