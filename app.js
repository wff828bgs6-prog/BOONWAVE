import { bootstrapBoonwave } from './bootstrap/boonwave-bootstrap.js';

class BoonwaveApp {
  constructor() {
    this.runtime = null;
    this.mounting = null;
    this.observer = null;
  }

  findElements() {
    const canvas = document.getElementById('canvas') || document.querySelector('[data-boonwave-canvas]');
    const world = document.getElementById('world') || canvas?.querySelector('[data-boonwave-world]');
    return { canvas, world };
  }

  async init() {
    const { canvas, world } = this.findElements();

    if (!canvas || !world) {
      if (!this.observer) {
        this.observer = new MutationObserver(() => {
          this.init().catch((error) => this.showStartupError(error));
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
      }
      return null;
    }

    if (!this.runtime && !this.mounting) {
      this.mounting = bootstrapBoonwave({ canvas, world })
        .then((runtime) => {
          this.runtime = runtime;
          return runtime;
        })
        .finally(() => {
          this.mounting = null;
        });
    }

    const runtime = await this.mounting;
    this.observer?.disconnect();
    this.observer = null;
    return runtime;
  }

  showStartupError(error) {
    console.error('BOONWAVE startup failed:', error);
    const hint = document.getElementById('hint');
    if (hint) hint.textContent = 'Ошибка запуска. Старая версия доступна по ссылке Legacy v8.';
    const fallback = document.getElementById('legacyFallback');
    if (fallback) fallback.hidden = false;
  }

  destroy() {
    this.observer?.disconnect();
    this.runtime?.destroy();
    this.runtime = null;
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch (error) {
    console.warn('BOONWAVE service worker registration failed:', error);
  }
}

function startBoonwave() {
  if (window.__boonwaveApp) return window.__boonwaveApp;
  const app = new BoonwaveApp();
  window.__boonwaveApp = app;
  app.init().catch((error) => app.showStartupError(error));
  registerServiceWorker();
  window.addEventListener('beforeunload', () => app.destroy(), { once: true });
  return app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBoonwave, { once: true });
} else {
  startBoonwave();
}

export { BoonwaveApp, startBoonwave };
