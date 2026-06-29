import StorageAdapter from './storage-adapter.js';

export class SQLiteAdapter extends StorageAdapter {
  constructor(nativeDriver = null) {
    super();
    this.nativeDriver = nativeDriver;
  }

  async init() {
    if (!this.nativeDriver) {
      throw new Error('Native SQLite driver is not configured.');
    }
    return this.nativeDriver;
  }
}

export default SQLiteAdapter;
