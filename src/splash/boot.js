// Classic script: the recovery path must work even if an app module cannot load.
(() => {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const watchdog = setTimeout(() => {
    if (!splash.isConnected) return;
    const app = document.getElementById('app');
    if (app?.children.length) {
      splash.dispatchEvent(new Event('splash:dispose'));
      app.inert = false;
      splash.remove();
      return;
    }
    const error = document.createElement('p');
    error.className = 'splash-error';
    error.append('页面未能加载。', document.createElement('br'));
    const reload = document.createElement('a');
    reload.href = '';
    reload.textContent = '重新打开';
    error.append(reload);
    splash.append(error);
  }, 4000);
  splash.addEventListener('splash:dispose', () => clearTimeout(watchdog), { once: true });
  // Once the interactive entrance is wired, staying on the water is intentional.
  splash.addEventListener('splash:ready', () => clearTimeout(watchdog), { once: true });
})();
