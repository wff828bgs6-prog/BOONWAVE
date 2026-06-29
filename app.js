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
          this.init().catch((error) => console.error('BOONWAVE mount failed:', error));
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

  destroy() {
    this.observer?.disconnect();
    this.runtime?.destroy();
    this.runtime = null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new BoonwaveApp();
  app.init().catch((error) => console.error('BOONWAVE startup failed:', error));
}, { once: true });

export { BoonwaveApp };
