// app.js
import store from './state/store.js';
import db from './storage/database.js';
import { GestureMachine } from './canvas/gesture-machine.js';
import { createLinksRenderer } from './canvas/links.js';

class BoonwaveApp {
  constructor() {
    this.gestureMachine = null;
    this.linksRenderer = null;
    this.canvasObserver = null;
  }

  async init() {
    console.log('Инициализация ядра BOONWAVE...');

    try {
      await db.initDB();
      console.log('База данных IndexedDB успешно подключена.');

      await db.loadAllData();
      this.mountCanvasCore();

      const currentState = store.getState();
      console.log('Ядро успешно запущено. Текущее состояние:', currentState);

      this.bindGlobalEvents();
    } catch (error) {
      console.error('Критическая ошибка при старте приложения BOONWAVE:', error);
    }
  }

  findCanvasElement() {
    return document.getElementById('canvas') || document.querySelector('[data-boonwave-canvas]');
  }

  mountCanvasCore() {
    const canvasElement = this.findCanvasElement();

    if (canvasElement) {
      if (!this.gestureMachine) {
        this.gestureMachine = new GestureMachine(canvasElement);
      }

      if (!this.linksRenderer) {
        this.linksRenderer = createLinksRenderer(canvasElement);
      }

      if (this.canvasObserver) {
        this.canvasObserver.disconnect();
        this.canvasObserver = null;
      }
      return;
    }

    if (this.canvasObserver) return;

    this.canvasObserver = new MutationObserver(() => this.mountCanvasCore());
    this.canvasObserver.observe(document.body, { childList: true, subtree: true });
  }

  bindGlobalEvents() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.linksRenderer?.scheduleRender();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new BoonwaveApp();
  app.init();
});
