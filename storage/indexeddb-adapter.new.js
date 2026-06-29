import StorageAdapter from './storage-adapter.js';
import db from './database.js';

export class IndexedDBAdapter extends StorageAdapter {
  constructor() {
    super();
    this.supportsAtomicCardGraphDelete = true;
  }
}
