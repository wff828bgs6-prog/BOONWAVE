import StorageAdapter from './storage-adapter.js';
import db from './database.js';

function uniqueIds(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function abortTransaction(transaction, error, reject) {
  try {
    transaction.abort();
  } catch {
    // The transaction may already be inactive. The original error remains authoritative.
  }
  reject(error);
}

function detachOwnerInTransaction(mediaStore, blobStore, mediaId, ownerId) {
  const request = mediaStore.get(mediaId);
  request.onsuccess = () => {
    const record = request.result;
    if (!record) return;
    const owners = (Array.isArray(record.ownerIds) ? record.ownerIds : [])
      .filter((id) => id !== ownerId);
    if (owners.length === 0) {
      mediaStore.delete(mediaId);
      blobStore.delete(mediaId);
    } else {
      mediaStore.put({ ...record, ownerIds: owners, updatedAt: new Date().toISOString() });
    }
  };
}

export class IndexedDBAdapter extends StorageAdapter {
  async init() { return db.initDB(); }
  async loadWorkspace() { return db.loadAllData(); }

  async importWorkspaceBundle({ cards = [], links = [], mediaEntries = [], marker = null } = {}) {
    const database = await db.initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        ['cards', 'links', 'media', 'mediaBlobs', 'settings'],
        'readwrite',
      );
      const cardStore = transaction.objectStore('cards');
      const linkStore = transaction.objectStore('links');
      const mediaStore = transaction.objectStore('media');
      const blobStore = transaction.objectStore('mediaBlobs');
      const settingsStore = transaction.objectStore('settings');

      transaction.oncomplete = () => resolve({
        cards: cards.length,
        links: links.length,
        media: mediaEntries.length,
        marker,
      });
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(
        transaction.error ?? new Error('IndexedDB workspace import transaction aborted.'),
      );

      try {
        for (const card of cards) cardStore.put(card);
        for (const link of links) linkStore.put(link);
        for (const entry of mediaEntries) {
          mediaStore.put(entry.record);
          blobStore.put({ id: entry.record.id, blob: entry.blob });
        }
        if (marker?.key) {
          settingsStore.put({
            key: marker.key,
            value: marker.value,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        abortTransaction(transaction, error, reject);
      }
    });
  }

  async saveCard(card) { return db.saveCard(card); }

  async saveCardBundle({ card, mediaEntries = [], removedMediaIds = [] }) {
    const database = await db.initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['cards', 'media', 'mediaBlobs'], 'readwrite');
      const cardStore = transaction.objectStore('cards');
      const mediaStore = transaction.objectStore('media');
      const blobStore = transaction.objectStore('mediaBlobs');
      const removedIds = uniqueIds(removedMediaIds);

      transaction.oncomplete = () => resolve({ card, mediaEntries, removedMediaIds: removedIds });
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(
        transaction.error ?? new Error('IndexedDB card save transaction aborted.'),
      );

      try {
        cardStore.put(card);
        for (const entry of mediaEntries) {
          mediaStore.put(entry.record);
          blobStore.put({ id: entry.record.id, blob: entry.blob });
        }
        for (const mediaId of removedIds) {
          detachOwnerInTransaction(mediaStore, blobStore, mediaId, card.id);
        }
      } catch (error) {
        abortTransaction(transaction, error, reject);
      }
    });
  }

  async deleteCard(id) { return db.deleteCard(id); }
  async deleteCardWithLinks(cardId, linkIds = []) { return db.deleteCardWithLinks(cardId, linkIds); }

  async deleteCardGraph({ cardId, linkIds = [], mediaIds = [] }) {
    const database = await db.initDB();
    const links = uniqueIds(linkIds);
    const media = uniqueIds(mediaIds);
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['cards', 'links', 'media', 'mediaBlobs'], 'readwrite');
      const cardStore = transaction.objectStore('cards');
      const linkStore = transaction.objectStore('links');
      const mediaStore = transaction.objectStore('media');
      const blobStore = transaction.objectStore('mediaBlobs');

      transaction.oncomplete = () => resolve({ cardId, linkIds: links, mediaIds: media });
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(
        transaction.error ?? new Error('IndexedDB card removal transaction aborted.'),
      );

      try {
        cardStore.delete(cardId);
        for (const id of links) linkStore.delete(id);
        for (const id of media) {
          detachOwnerInTransaction(mediaStore, blobStore, id, cardId);
        }
      } catch (error) {
        abortTransaction(transaction, error, reject);
      }
    });
  }

  async saveLink(link) { return db.saveLink(link); }
  async deleteLink(id) { return db.deleteLink(id); }
  async saveMedia(record, blob) { return db.saveMedia(record, blob); }
  async loadMedia(id) { return db.loadMedia(id); }
  async deleteMedia(id) { return db.deleteMedia(id); }
  async saveSetting(key, value) { return db.saveSetting(key, value); }
  async loadSetting(key) { return db.loadSetting(key); }
}

export default new IndexedDBAdapter();
