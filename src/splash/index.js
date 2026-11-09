import { createWater } from './water.js';

// Presentation only. The app calls this after rendering, never after a provider request.
// Wallpaper is the existing appearance setting, not a second copy in storage.
export function finishSplash({ wallpaper = '' } = {}) {
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  if (!splash) { if (app) app.inert = false; return Promise.resolve(); }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  return new Promise(resolve => {
    let water, fade, disposed = false, leaving = false;
    const entry = document.createElement('button');
    entry.type = 'button';
    entry.className = 'splash-enter';
    entry.textContent = '进入';
    entry.setAttribute('aria-label', '进入尘');
    splash.setAttribute('role', 'dialog');
    splash.setAttribute('aria-modal', 'true');
    splash.setAttribute('aria-label', '水波开屏');
    splash.append(entry);
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      clearTimeout(fade);
      water?.destroy();
      entry.removeEventListener('click', leave);
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
      if (disposed || leaving) return;
      leaving = true;
      entry.disabled = true;
      splash.classList.add('is-leaving');
      fade = setTimeout(dispose, 550);
    };
    entry.addEventListener('click', leave);
    splash.addEventListener('splash:dispose', dispose);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', preference);
    if (motion.matches || document.hidden) { dispose(); return; }
    try {
      water = createWater(splash, { wallpaper, entry });
      // Loading is complete. Play for as long as desired; entry remains usable
      // with or without WebGL. The boot watchdog only covers a broken startup.
      splash.dispatchEvent(new Event('splash:ready'));
    } catch {
      dispose();
    }
  });
}
