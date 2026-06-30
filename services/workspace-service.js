import store from '../state/store.js';
import storage from '../storage/index.js';
import { migrateStoredNodes, migrateStoredLinks } from './data-migration-service.js';
import { ensurePrimarySelfNode } from './self-node-service.js';
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

export function normalizeWorkspaceSnapshot(snapshot = {}) {
  const cards = snapshot.cards && typeof snapshot.cards === 'object'
    ? snapshot.cards
    : {};
  const links = Array.isArray(snapshot.links) ? snapshot.links : [];
  return { cards, links };
}

export async function loadWorkspace(options = {}) {
  const stateStore = options.stateStore ?? store;
  const storageAdapter = options.storageAdapter ?? storage;
  const migrateNodes = options.migrateNodes ?? options.migrate ?? migrateStoredNodes;
  const migrateLinks = options.migrateLinks ?? migrateStoredLinks;
  const ensureSelfNode = options.ensureSelfNode ?? ensurePrimarySelfNode;

  await storageAdapter.init();
  const workspace = normalizeWorkspaceSnapshot(await storageAdapter.loadWorkspace());
  stateStore.setState(workspace);
  await migrateNodes({ stateStore, storageAdapter });
  await migrateLinks({ stateStore, storageAdapter });
  await ensureSelfNode({ stateStore, storageAdapter });

  const savedCamera = await storageAdapter.loadSetting('camera');
  const camera = normalizeCamera(savedCamera);
  stateStore.setState({ camera });

  if (!savedCamera || savedCamera.zoom !== camera.zoom) {
    await storageAdapter.saveSetting('camera', camera);
  }

  return stateStore.getState();
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
