// app.js
import store from './state/store.js';
import db from './storage/database.js';

class BoonwaveApp {
  async init() {
    console.log('Инициализация ядра BOONWAVE...');
    
    try {
      // 1. Инициализируем IndexedDB
      await db.initDB();
      console.log('База данных IndexedDB успешно подключена.');

      // 2. Загружаем все карточки и связи в глобальный Store
      await db.loadAllData();
      
      // 3. Проверяем текущее состояние после загрузки
      const currentState = store.getState();
      console.log('Ядро успешно запущено. Текущее состояние:', currentState);

      // Здесь в следующих этапах мы запустим GestureMachine и Canvas Renderer
      this.bindGlobalEvents();

    } catch (error) {
      console.error('Критическая ошибка при старте приложения BOONWAVE:', error);
    }
  }

  bindGlobalEvents() {
    // Слушаем базовые события PWA, например, возвращение из фонового режима
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('Приложение вернулось из фонового режима. Проверка обновлений...');
        // Будущая логика проверки обновлений pwa/update-manager.js
      }
    });
  }
}

// Запуск приложения после полной загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new BoonwaveApp();
  app.init();
});
