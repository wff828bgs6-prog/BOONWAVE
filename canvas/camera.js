import store from '../state/store.js';

export const MIN_ZOOM = 0.18;
export const BASE_ZOOM = 0.85;
export const MAX_ZOOM = 2.4;
const DEFAULT_PADDING = 48;

export const clampZoom = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return BASE_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, numeric));
};

const getCamera = () => {
  const { camera = {} } = store.getState();

  return {
    x: Number.isFinite(camera.x) ? camera.x : 0,
    y: Number.isFinite(camera.y) ? camera.y : 0,
    zoom: clampZoom(Number.isFinite(camera.zoom) ? camera.zoom : BASE_ZOOM),
  };
};

const updateCamera = (x, y, zoom) => {
  const camera = {
    x,
    y,
    zoom: clampZoom(zoom),
  };

  store.setState({ camera });
  return camera;
};

export function pan(dx, dy) {
  const camera = getCamera();

  return updateCamera(
    camera.x + dx,
    camera.y + dy,
    camera.zoom,
  );
}

export function zoomAt(clientX, clientY, factor) {
  const camera = getCamera();
  const safeFactor = Number(factor);
  if (!Number.isFinite(safeFactor) || safeFactor <= 0) return camera;
  const nextZoom = clampZoom(camera.zoom * safeFactor);

  const worldX = (clientX - camera.x) / camera.zoom;
  const worldY = (clientY - camera.y) / camera.zoom;

  return updateCamera(
    clientX - worldX * nextZoom,
    clientY - worldY * nextZoom,
    nextZoom,
  );
}

export function fitToScreen(bounds) {
  const {
    minX,
    minY,
    maxX,
    maxY,
    viewportWidth,
    viewportHeight,
    padding = DEFAULT_PADDING,
  } = bounds;

  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const availableWidth = Math.max(viewportWidth - padding * 2, 1);
  const availableHeight = Math.max(viewportHeight - padding * 2, 1);

  const zoom = clampZoom(
    Math.min(
      availableWidth / contentWidth,
      availableHeight / contentHeight,
    ),
  );

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return updateCamera(
    viewportWidth / 2 - centerX * zoom,
    viewportHeight / 2 - centerY * zoom,
    zoom,
  );
}

export default {
  pan,
  zoomAt,
  fitToScreen,
  clampZoom,
};
