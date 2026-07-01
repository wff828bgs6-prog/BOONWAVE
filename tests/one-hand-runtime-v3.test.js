import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('runtime opens cards with one tap and keeps selection on background taps', () => {
  const workspace = read('controllers/workspace-controller-v2.js');
  const gesture = read('canvas/gesture-machine.js');
  const card = read('canvas/card-controller-v2.js');

  assert.match(workspace, /activateCard\(cardId, element\)/);
  assert.match(workspace, /store\.setState\(\{ selectedCardId: card\.id \}\)/);
  assert.match(workspace, /if\(this\.linkModeProvider\?\.\(\)\)return this\.cardTapHandler\?\.\(card\)/);
  assert.doesNotMatch(workspace, /selectedCardId:null/);
  assert.match(gesture, /onInteractiveTap/);
  assert.doesNotMatch(gesture, /DoubleTap|doubleTap/);
  assert.match(card, /this\.onTap\?\.\(card, drag\.element\)/);
});

test('active rail has no whole-panel transform or backdrop filter', () => {
  const css = read('styles/one-hand-rail-v3.css');
  assert.doesNotMatch(css, /data-mirrored/);
  assert.doesNotMatch(css, /backdrop-filter/);
  assert.doesNotMatch(css, /transform:scale/);
  assert.match(css, /data-position="bottom"/);
});

test('zoom thumb uses numeric pixel geometry in both orientations', () => {
  const controller = read('controllers/zoom-controller.js');
  assert.match(controller, /this\.thumb\.style\.bottom = `\$\{offset\}px`/);
  assert.match(controller, /this\.thumb\.style\.left = `\$\{offset\}px`/);
  assert.match(controller, /this\.fill\.style\.height = `\$\{usable \* progress\}px`/);
  assert.match(controller, /this\.fill\.style\.width = `\$\{usable \* progress\}px`/);
});

test('full-card close button is positioned on the middle edge', () => {
  const css = read('styles/card-detail-overrides.css');
  assert.match(css, /top:50%!important/);
  assert.match(css, /transform:translateY\(-50%\)!important/);
  assert.match(css, /right:-12px!important/);
});
