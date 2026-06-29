// storage/database.js
import store from '../state/store.js';
import { DATABASE_VERSION, runSchemaMigrations } from './migrations.js';

class BoonwaveDatabase {
  constructor() {
    this.dbName = 'boonwave_db';
    this.version = DATABASE_VERSION;
    this.db = null;
  }

  initDB() {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db);

      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        runSchemaMigrations(db, event.oldVersion);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
        };
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };

      request.onblocked = () => {
        console.warn('IndexedDB upgrade is blocked by another open BOONWAVE tab.');
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

  async deleteCardWithLinks(cardId, linkIds = []) {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cards', 'links'], 'readwrite');
      const cardsStore = transaction.objectStore('cards');
      const linksStore = transaction.objectStore('links');

      cardsStore.delete(cardId);
      for (const linkId of linkIds) linksStore.delete(linkId);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(
        transaction.error ?? new Error('IndexedDB delete transaction aborted.'),
      );
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

  async saveMedia(record, blob) {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['media', 'mediaBlobs'], 'readwrite');
      transaction.objectStore('media').put(record);
      if (blob !== undefined) {
        transaction.objectStore('mediaBlobs').put({ id: record.id, blob });
      }

      transaction.oncomplete = () => resolve(record);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(
        transaction.error ?? new Error('IndexedDB media save transaction aborted.'),
      );
    });
  }

  async loadMedia(id) {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['media', 'mediaBlobs'], 'readonly');
      const recordRequest = transaction.objectStore('media').get(id);
      const blobRequest = transaction.objectStore('mediaBlobs').get(id);

      transaction.oncomplete = () => resolve({
        record: recordRequest.result ?? null,
        blob: blobRequest.result?.blob ?? null,
      });
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(
        transaction.error ?? new Error('IndexedDB media load transaction aborted.'),
      );
    });
  }

  async deleteMedia(id) {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['media', 'mediaBlobs'], 'readwrite');
      transaction.objectStore('media').delete(id);
      transaction.objectStore('mediaBlobs').delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(
        transaction.error ?? new Error('IndexedDB media delete transaction aborted.'),
      );
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
