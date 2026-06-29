import StorageAdapter from './storage-adapter.js';
import db from './database.js';

export class IndexedDBAdapter extends StorageAdapter {
  async init() {
    return db.initDB();
  }

  async loadWorkspace() {
    return db.loadAllData();
  }

  async saveCard(card) {
    return db.saveCard(card);
  }

  async deleteCard(id) {
    return db.deleteCard(id);
  }

  async deleteCardWithLinks(cardId, linkIds = []) {
    return db.deleteCardWithLinks(cardId, linkIds);
  }

  async saveLink(link) {
    return db.saveLink(link);
  }

  async deleteLink(id) {
    return db.deleteLink(id);
  }

  async saveMedia(record, blob) {
    return db.saveMedia(record, blob);
  }

  async loadMedia(id) {
    return db.loadMedia(id);
  }

  async deleteMedia(id) {
    return db.deleteMedia(id);
  }

  async saveSetting(key, value) {
    return db.saveSetting(key, value);
  }

  async loadSetting(key) {
    return db.loadSetting(key);
  }
}

export default new IndexedDBAdapter();
