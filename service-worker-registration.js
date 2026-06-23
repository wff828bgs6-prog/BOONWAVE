// Разместить в коде регистрации service worker.
// Слушатель controllerchange важно добавить ДО register().

if ('serviceWorker' in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      console.info('BOONWAVE service worker registered:', registration.scope);
    } catch (error) {
      console.error('BOONWAVE service worker registration failed:', error);
    }
  });
}
