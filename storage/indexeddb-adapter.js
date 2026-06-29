import StorageAdapter from './storage-adapter.js';
import db from './database.js';

function uniqueIds(values = []) {
  return [...new Set(values.filter(Boolean))];
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
  async saveCard(card) { return db.saveCard(card); }

  async saveCardBundle({ card, mediaEntries = [], removedMediaIds = [] }) {
    const database = await db.initDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(['cards', 'media', 'mediaBlobs'], 'readwrite');
      const cardStore = tx.objectStore('cards');
      const mediaStore = tx.objectStore('media');
      const blobStore = tx.objectStore('mediaBlobs');

      cardStore.put(card);
      for (const entry of mediaEntries) {
        mediaStore.put(entry.record);
        blobStore.put({ id: entry.record.id, blob: entry.blob });
      }
      for (const mediaId of uniqueIds(removedMediaIds)) {
        detachOwnerInTransaction(mediaStore, blobStore, mediaId, card.id);
      }

      tx.oncomplete = () => resolve({ card, mediaEntries, removedMediaIds: uniqueIds(removedMediaIds) });
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB card save transaction aborted.'));
    });
  }

  async deleteCard(id) { return db.deleteCard(id); }
  async deleteCardWithLinks(cardId, linkIds = []) { return db.deleteCardWithLinks(cardId, linkIds); }

  async deleteCardGraph({ cardId, linkIds = [], mediaIds = [] }) {
    const database = await db.initDB();
    const links = uniqueIds(linkIds);
    const media = uniqueIds(mediaIds);
    return new Promise((resolve, reject) => {
      const tx = database.transaction(['cards', 'links', 'media', 'mediaBlobs'], 'readwrite');
      const cardStore = tx.objectStore('cards');
      const linkStore = tx.objectStore('links');
      const mediaStore = tx.objectStore('media');
      const blobStore = tx.objectStore('mediaBlobs');
      cardStore.delete(cardId);
      for (const id of links) linkStore.delete(id);
      for (const id of media) detachOwnerInTransaction(mediaStore, blobStore, id, cardId);
      tx.oncomplete = () => resolve({ cardId, linkIds: links, mediaIds: media });
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB card removal transaction aborted.'));
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
