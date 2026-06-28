// app.js
import store from './state/store.js';
import db from './storage/database.js';
import { GestureMachine } from './canvas/gesture-machine.js';

class BoonwaveApp {
  constructor() {
    this.gestureMachine = null;
  }

  async init() {
    console.log('Инициализация ядра BOONWAVE...');
    
    try {
      // 1. Инициализируем IndexedDB
      await db.initDB();
      console.log('База данных IndexedDB успешно подключена.');

      // 2. Загружаем все карточки и связи в глобальный Store
      await db.loadAllData();
      
      // 3. Инициализируем конечный автомат жестов на холсте
      const canvasElement = document.getElementById('canvas'); // Наш будущий холст
      if (canvasElement) {
        this.gestureMachine = new GestureMachine(canvasElement);
        console.log('Конечный автомат жестов успешно запущен.');
      } else {
        console.warn('DOM-элемент #canvas не найден. Ожидание отрисовки интерфейса...');
      }

      // 4. Проверяем текущее состояние после загрузки
      const currentState = store.getState();
      console.log('Ядро успешно запущено. Текущее состояние:', currentState);

      this.bindGlobalEvents();

    } catch (error) {
      console.error('Критическая ошибка при старте приложения BOONWAVE:', error);
    }
  }

  bindGlobalEvents() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('Приложение вернулось из фонового режима. Проверка обновлений...');
      }
    });
  }
}

// Запуск приложения после полной загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new BoonwaveApp();
  app.init();
});
