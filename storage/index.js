import indexedDBAdapter from './indexeddb-adapter.js';

function detectPlatform() {
  const capacitor = globalThis.Capacitor;
  if (capacitor?.isNativePlatform?.()) return 'native';
  return 'web';
}

const platform = detectPlatform();

if (platform === 'native') {
  console.warn('Native storage adapter is not connected yet; using IndexedDB fallback.');
}

export const storage = indexedDBAdapter;
export const storagePlatform = platform;
export default storage;
