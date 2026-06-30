import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import store from '../state/store.js';
import { BASE_ZOOM, MAX_ZOOM, MIN_ZOOM, zoomAt } from '../canvas/camera.js';

const ROOT = process.cwd();
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

function worldPoint(camera, clientX, clientY) {
  return {
    x: (clientX - camera.x) / camera.zoom,
    y: (clientY - camera.y) / camera.zoom,
  };
}

test('production slider uses calibrated iPhone bounds', () => {
  const index = read('index.html');
  assert.match(index, /min="0\.14"/);
  assert.match(index, /max="1\.5"/);
  assert.match(index, /step="0\.005"/);
  assert.ok(MAX_ZOOM / MIN_ZOOM > 10);
  assert.ok(BASE_ZOOM > MIN_ZOOM && BASE_ZOOM < MAX_ZOOM);
});

test('pinch zoom reaches both limits and preserves its focal point', () => {
  const clientX = 220;
  const clientY = 410;
  store.setState({ camera: { x: 35, y: -20, zoom: BASE_ZOOM } });

  const before = worldPoint(store.getState().camera, clientX, clientY);
  const zoomedIn = zoomAt(clientX, clientY, 100);
  const afterZoomIn = worldPoint(zoomedIn, clientX, clientY);
  assert.equal(zoomedIn.zoom, MAX_ZOOM);
  assert.ok(Math.abs(afterZoomIn.x - before.x) < 1e-9);
  assert.ok(Math.abs(afterZoomIn.y - before.y) < 1e-9);

  const zoomedOut = zoomAt(clientX, clientY, 0.0001);
  const afterZoomOut = worldPoint(zoomedOut, clientX, clientY);
  assert.equal(zoomedOut.zoom, MIN_ZOOM);
  assert.ok(Math.abs(afterZoomOut.x - before.x) < 1e-9);
  assert.ok(Math.abs(afterZoomOut.y - before.y) < 1e-9);
});

test('invalid zoom factor cannot corrupt the camera', () => {
  store.setState({ camera: { x: 12, y: 18, zoom: BASE_ZOOM } });
  const before = structuredClone(store.getState().camera);
  const result = zoomAt(100, 100, Number.NaN);
  assert.deepEqual(result, before);
  assert.deepEqual(store.getState().camera, before);
});
