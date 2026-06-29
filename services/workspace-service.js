import store from '../state/store.js';
import storage from '../storage/index.js';
import { migrateStoredNodes } from './data-migration-service.js';
import { BASE_ZOOM, clampZoom } from '../canvas/camera.js';

const DEFAULT_CAMERA = Object.freeze({ x: 0, y: 0, zoom: BASE_ZOOM });

export function isValidCamera(camera) {
  return Boolean(
    camera
    && Number.isFinite(camera.x)
    && Number.isFinite(camera.y)
    && Number.isFinite(camera.zoom)
    && camera.zoom > 0,
  );
}

function normalizeCamera(camera) {
  if (!isValidCamera(camera)) return { ...DEFAULT_CAMERA };
  return {
    x: camera.x,
    y: camera.y,
    zoom: clampZoom(camera.zoom),
  };
}

export async function loadWorkspace() {
  await storage.init();
  await storage.loadWorkspace();
  await migrateStoredNodes();

  const savedCamera = await storage.loadSetting('camera');
  const camera = normalizeCamera(savedCamera);
  store.setState({ camera });

  if (!savedCamera || savedCamera.zoom !== camera.zoom) {
    await storage.saveSetting('camera', camera);
  }

  return store.getState();
}

export async function saveCamera(camera = store.getState().camera) {
  if (!isValidCamera(camera)) {
    throw new TypeError('saveCamera expects a valid camera object.');
  }

  const normalized = normalizeCamera(camera);
  await storage.saveSetting('camera', normalized);
  return normalized;
}

export { DEFAULT_CAMERA };
