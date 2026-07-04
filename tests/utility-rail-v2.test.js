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
  assert.doesNotMatch(index,/id="zoomInButton"/);
  assert.doesNotMatch(index,/id="zoomOutButton"/);
  assert.doesNotMatch(index,/class="mobile-dock"/);
});

test('rail keeps every control on one centered axis and contains active states',()=>{
  const css=read('styles/one-hand-rail-v3.css');
  assert.match(css,/--rail-visual-width:54px/);
  assert.match(css,/--rail-hit-size:40px/);
  assert.match(css,/place-items:center/);
  assert.match(css,/justify-self:center/);
  assert.match(css,/align-self:center/);
  assert.match(css,/overflow:hidden/);
  assert.match(css,/\.zoom-visual\{[^}]*left:50%/);
  assert.match(css,/\.zoom-visual\{[^}]*width:24px/);
  assert.match(css,/\.zoom-thumb\{[^}]*width:18px/);
  assert.match(css,/-webkit-touch-callout:none/);
  assert.match(css,/data-position="bottom"/);
});

test('locked card gestures have one pointer owner and no long-press edit path',()=>{
  const card=read('canvas/card-controller-v2.js');
  const gesture=read('canvas/gesture-machine.js');
  const workspace=read('controllers/workspace-controller-v2.js');
  assert.match(card,/!this\.canMoveCard\(card\)/);
  assert.match(gesture,/onInteractiveTap/);
  assert.doesNotMatch(gesture,/onInteractiveLongPress/);
  assert.doesNotMatch(card,/onLongPress/);
  assert.match(workspace,/onInteractiveTap:/);
  assert.doesNotMatch(workspace,/onInteractiveLongPress:/);
  assert.match(workspace,/activateCard/);
});

test('primary rail order is home add contacts zoom lock more and history lives in tools',()=>{
  const index=read('index.html');
  const rail=index.slice(index.indexOf('<aside class="one-hand-rail"'),index.indexOf('</aside>')+8);
  assert.ok(rail.indexOf('rail-home')<rail.indexOf('rail-add'));
  assert.ok(rail.indexOf('rail-add')<rail.indexOf('rail-contacts'));
  assert.ok(rail.indexOf('rail-contacts')<rail.indexOf('rail-zoom'));
  assert.ok(rail.indexOf('rail-zoom')<rail.indexOf('rail-lock'));
  assert.ok(rail.indexOf('rail-lock')<rail.indexOf('rail-more'));
  assert.doesNotMatch(rail,/id="undoButton"|id="redoButton"/);
  assert.match(index,/id="undoButton"/);
  assert.match(index,/id="redoButton"/);
});

test('lock state and rail position are persisted',()=>{
  const controller=read('controllers/utility-rail-controller.js');
  assert.match(controller,/LOCK_SETTING_KEY = 'cardsLocked'/);
  assert.match(controller,/POSITION_SETTING_KEY = 'utilityRailPosition'/);
  assert.match(controller,/storage\.saveSetting\(LOCK_SETTING_KEY, nextLocked\)/);
  assert.match(controller,/storage\.saveSetting\(POSITION_SETTING_KEY, normalized\)/);
  assert.match(controller,/new Set\(\['right', 'left', 'bottom'\]\)/);
});
