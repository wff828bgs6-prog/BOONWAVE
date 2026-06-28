import store from “../state/store.js”;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const DEFAULT_PADDING = 48;

const clamp = (value, min, max) =>
Math.min(max, Math.max(min, value));

const getCamera = () => {
const { camera = {} } = store.getState();

return {
x: Number.isFinite(camera.x) ? camera.x : 0,
y: Number.isFinite(camera.y) ? camera.y : 0,
zoom: Number.isFinite(camera.zoom) ? camera.zoom : 1,
};
};

const updateCamera = (x, y, zoom) => {
const camera = {
x,
y,
zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM),
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
const nextZoom = clamp(
camera.zoom * factor,
MIN_ZOOM,
MAX_ZOOM,
);

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

const zoom = clamp(
Math.min(
availableWidth / contentWidth,
availableHeight / contentHeight,
),
MIN_ZOOM,
MAX_ZOOM,
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
};
