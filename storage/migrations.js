export const DATABASE_VERSION = 3;

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
}
