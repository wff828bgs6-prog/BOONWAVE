// storage/database.js
import store from '../state/store.js';

class BoonwaveDatabase {
  constructor() {
    this.dbName = 'boonwave_db';
    this.version = 2;
    this.db = null;
  }

  initDB() {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db);

      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('links')) {
          db.createObjectStore('links', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async _getStore(storeName, mode = 'readonly') {
    const db = await this.initDB();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async saveCard(card) {
    const os = await this._getStore('cards', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = os.put(card);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteCard(id) {
    const os = await this._getStore('cards', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = os.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async saveLink(link) {
    const os = await this._getStore('links', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = os.put(link);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteLink(id) {
    const os = await this._getStore('links', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = os.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async saveSetting(key, value) {
    const os = await this._getStore('settings', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = os.put({ key, value, updatedAt: new Date().toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async loadSetting(key) {
    const os = await this._getStore('settings', 'readonly');
    return new Promise((resolve, reject) => {
      const request = os.get(key);
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async loadAllData() {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cards', 'links'], 'readonly');
      const cardsRequest = transaction.objectStore('cards').getAll();
      const linksRequest = transaction.objectStore('links').getAll();

      transaction.oncomplete = () => {
        const cardsObj = {};
        for (const card of cardsRequest.result ?? []) {
          cardsObj[card.id] = card;
        }

        store.setState({
          cards: cardsObj,
          links: linksRequest.result ?? [],
        });

        resolve({ cards: cardsObj, links: linksRequest.result ?? [] });
      };

      transaction.onerror = () => {
        console.error('Ошибка загрузки данных из БД:', transaction.error);
        reject(transaction.error);
      };

      transaction.onabort = () => {
        reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
      };
    });
  }

  async runMigrationFromV6(legacyData) {
    console.log('Запуск миграции v6...', legacyData);
    return true;
  }
}

const db = new BoonwaveDatabase();
export default db;
