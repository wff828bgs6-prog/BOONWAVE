import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(path,'utf8');

test('one-hand rail supports right left and bottom positions',()=>{
  const index=read('index.html');
  assert.match(index,/class="one-hand-rail"/);
  assert.match(index,/data-rail-position="left"/);
  assert.match(index,/data-rail-position="right"/);
  assert.match(index,/data-rail-position="bottom"/);
  assert.match(index,/id="zoomTouchArea"/);
  assert.match(index,/class="zoom-thumb"/);
  assert.doesNotMatch(index,/class="mobile-dock"/);
});

test('rail is visually thin while preserving touch targets',()=>{
  const css=read('styles/one-hand-rail-v3.css');
  assert.match(css,/--rail-visual-width:40px/);
  assert.match(css,/--rail-hit-size:44px/);
  assert.match(css,/\.zoom-visual\{[^}]*width:22px/);
  assert.match(css,/\.zoom-thumb\{[^}]*width:18px/);
  assert.match(css,/data-position="bottom"/);
});

test('locked card gestures have one pointer owner and one-tap activation',()=>{
  const card=read('canvas/card-controller-v2.js');
  const gesture=read('canvas/gesture-machine.js');
  const workspace=read('controllers/workspace-controller-v2.js');
  assert.match(card,/!this\.canMoveCard\(card\)/);
  assert.match(gesture,/onInteractiveLongPress/);
  assert.match(gesture,/onInteractiveTap/);
  assert.doesNotMatch(gesture,/onInteractiveDoubleTap/);
  assert.match(workspace,/onInteractiveTap:/);
  assert.match(workspace,/activateCard/);
});

test('lock state and rail position are persisted',()=>{
  const controller=read('controllers/utility-rail-controller.js');
  assert.match(controller,/LOCK_SETTING_KEY = 'cardsLocked'/);
  assert.match(controller,/POSITION_SETTING_KEY = 'utilityRailPosition'/);
  assert.match(controller,/storage\.saveSetting\(LOCK_SETTING_KEY, nextLocked\)/);
  assert.match(controller,/storage\.saveSetting\(POSITION_SETTING_KEY, normalized\)/);
  assert.match(controller,/new Set\(\['right', 'left', 'bottom'\]\)/);
});
