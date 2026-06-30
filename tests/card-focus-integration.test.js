import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('workspace uses long press for edit and double tap for details', () => {
  const workspace = read('controllers/workspace-controller.js');
  assert.match(workspace, /CardDetailController/);
  assert.match(workspace, /onLongPress/);
  assert.match(workspace, /cardEditHandler/);
  assert.match(workspace, /onDoubleTap/);
  assert.match(workspace, /detailController\.open/);
});

test('detail surface contains edit and format actions', () => {
  const controller = read('controllers/card-detail-controller.js');
  assert.match(controller, /data-detail-edit/);
  assert.match(controller, /data-detail-display/);
  assert.match(controller, /Редактировать/);
  assert.match(controller, /Формат отображения/);
  assert.doesNotMatch(controller, /card-view-button|enterFullscreen/);
});

test('detail surface returns to the source geometry', () => {
  const controller = read('controllers/card-detail-controller.js');
  assert.match(controller, /aria-modal="true"/);
  assert.match(controller, /prefers-reduced-motion/);
  assert.match(controller, /getSourceRect\(\)/);
  assert.match(controller, /setTransform\(this\.getSourceRect\(\)\)/);
  assert.match(controller, /--detail-from-scale-x/);
});

test('long press releases capture before edit opens', () => {
  const controller = read('canvas/card-controller.js');
  assert.match(controller, /lostpointercapture/);
  assert.match(controller, /resetInteraction\(\{ setIdle: active\.movable \}\)/);
  assert.match(controller, /Card edit action failed/);
});

test('link mode suppresses edit and detail gestures', () => {
  const workspace = read('controllers/workspace-controller.js');
  assert.match(workspace, /linkModeProvider/);
  assert.match(workspace, /return false/);
});
