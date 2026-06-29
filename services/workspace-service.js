import store from '../state/store.js';
import storage from '../storage/index.js';
import { migrateStoredNodes } from './data-migration-service.js';

const DEFAULT_CAMERA = Object.freeze({ x: 0, y: 0, zoom: 0.82 });

export function isValidCamera(camera) {
  return Boolean(
    camera
    && Number.isFinite(camera.x)
    && Number.isFinite(camera.y)
    && Number.isFinite(camera.zoom)
    && camera.zoom > 0,
  );
}

export async function loadWorkspace() {
  await storage.init();
  await storage.loadWorkspace();
  await migrateStoredNodes();

  const savedCamera = await storage.loadSetting('camera');
  const camera = isValidCamera(savedCamera) ? savedCamera : { ...DEFAULT_CAMERA };
  store.setState({ camera });

  return store.getState();
}

export async function saveCamera(camera = store.getState().camera) {
  if (!isValidCamera(camera)) {
    throw new TypeError('saveCamera expects a valid camera object.');
  }

  await storage.saveSetting('camera', camera);
  return camera;
}

export { DEFAULT_CAMERA };
