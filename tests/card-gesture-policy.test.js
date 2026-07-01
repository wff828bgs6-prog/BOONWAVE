import test from 'node:test';
import assert from 'node:assert/strict';
import { LONG_PRESS_DELAY_MS, canRemainLongPress, shouldStartCardDrag } from '../canvas/card-interaction-policy.js';

test('edit hold timing is stable', () => {
  assert.equal(LONG_PRESS_DELAY_MS, 500);
});

test('gesture classification separates tap, hold, and drag', () => {
  const start = { x: 100, y: 100 };
  assert.equal(canRemainLongPress(start, { x: 103, y: 102 }), true);
  assert.equal(shouldStartCardDrag(start, { x: 103, y: 102 }), false);
  assert.equal(canRemainLongPress(start, { x: 112, y: 100 }), false);
  assert.equal(shouldStartCardDrag(start, { x: 112, y: 100 }), true);
});
