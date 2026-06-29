export const DATABASE_VERSION = 4;

function ensureStore(db, name, options) {
  if (!db.objectStoreNames.contains(name)) {
    db.createObjectStore(name, options);
  }
}

export function runSchemaMigrations(db, oldVersion) {
  if (oldVersion < 1) {
    ensureStore(db, 'cards', { keyPath: 'id' });
    ensureStore(db, 'links', { keyPath: 'id' });
  }

  if (oldVersion < 2) {
    ensureStore(db, 'settings', { keyPath: 'key' });
  }

  if (oldVersion < 3) {
    ensureStore(db, 'metadata', { keyPath: 'key' });
  }

  if (oldVersion < 4) {
    ensureStore(db, 'media', { keyPath: 'id' });
    ensureStore(db, 'mediaBlobs', { keyPath: 'id' });
  }
}
