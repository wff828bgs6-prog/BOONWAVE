export class StorageAdapter {
  async init() { throw new Error('StorageAdapter.init() is not implemented.'); }
  async loadWorkspace() { throw new Error('StorageAdapter.loadWorkspace() is not implemented.'); }
  async saveCard() { throw new Error('StorageAdapter.saveCard() is not implemented.'); }
  async deleteCard() { throw new Error('StorageAdapter.deleteCard() is not implemented.'); }
  async deleteCardWithLinks() { throw new Error('StorageAdapter.deleteCardWithLinks() is not implemented.'); }
  async saveLink() { throw new Error('StorageAdapter.saveLink() is not implemented.'); }
  async deleteLink() { throw new Error('StorageAdapter.deleteLink() is not implemented.'); }
  async saveMedia() { throw new Error('StorageAdapter.saveMedia() is not implemented.'); }
  async loadMedia() { throw new Error('StorageAdapter.loadMedia() is not implemented.'); }
  async deleteMedia() { throw new Error('StorageAdapter.deleteMedia() is not implemented.'); }
  async saveSetting() { throw new Error('StorageAdapter.saveSetting() is not implemented.'); }
  async loadSetting() { throw new Error('StorageAdapter.loadSetting() is not implemented.'); }
}

export default StorageAdapter;
