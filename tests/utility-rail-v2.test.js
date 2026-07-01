import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(path,'utf8');

test('one-hand rail uses custom vertical zoom and no bottom dock',()=>{
  const index=read('index.html');
  assert.match(index,/class="one-hand-rail"/);
  assert.match(index,/id="zoomTouchArea"/);
  assert.match(index,/class="zoom-thumb"/);
  assert.match(index,/aria-orientation="vertical"/);
  assert.doesNotMatch(index,/class="mobile-dock"/);
});

test('custom zoom is thinner visually but keeps a wide touch target',()=>{
  const css=read('styles/one-hand-rail-v2.css');
  assert.match(css,/\.zoom-touch-area\{[^}]*width:46px/);
  assert.match(css,/\.zoom-visual\{[^}]*width:32px/);
  assert.match(css,/\.zoom-thumb\{[^}]*width:22px/);
  assert.match(css,/\.zoom-accessible-range/);
});

test('locked card gestures have one pointer owner',()=>{
  const card=read('canvas/card-controller.js');
  const gesture=read('canvas/gesture-machine.js');
  const workspace=read('controllers/workspace-controller.js');
  assert.match(card,/if \(!movable\) return;/);
  assert.doesNotMatch(card,/captured: movable/);
  assert.match(gesture,/onInteractiveLongPress/);
  assert.match(gesture,/onInteractiveDoubleTap/);
  assert.match(workspace,/onInteractiveTap:/);
  assert.match(workspace,/onInteractiveLongPress:/);
  assert.match(workspace,/onInteractiveDoubleTap:/);
});

test('lock state and handedness stay persisted',()=>{
  const controller=read('controllers/utility-rail-controller.js');
  assert.match(controller,/LOCK_SETTING_KEY = 'cardsLocked'/);
  assert.match(controller,/SIDE_SETTING_KEY = 'utilityRailSide'/);
  assert.match(controller,/storage\.saveSetting\(LOCK_SETTING_KEY, nextLocked\)/);
  assert.match(controller,/storage\.saveSetting\(SIDE_SETTING_KEY, normalized\)/);
});
