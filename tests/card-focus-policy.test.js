import test from 'node:test';
import assert from 'node:assert/strict';
import { LONG_PRESS_DELAY_MS, canRemainLongPress, shouldStartCardDrag, isDoubleTap } from '../canvas/card-interaction-policy.js';

test('focus timing is stable', () => {
  assert.equal(LONG_PRESS_DELAY_MS, 500);
});

test('gesture classification separates hold from drag', () => {
  const start = { x: 100, y: 100 };
  assert.equal(canRemainLongPress(start, { x: 103, y: 102 }), true);
  assert.equal(shouldStartCardDrag(start, { x: 103, y: 102 }), false);
  assert.equal(canRemainLongPress(start, { x: 112, y: 100 }), false);
  assert.equal(shouldStartCardDrag(start, { x: 112, y: 100 }), true);
});

test('repeat tap requires same card and short interval', () => {
  const first = { cardId: 'one', time: 1000, x: 120, y: 220 };
  assert.equal(isDoubleTap(first, { cardId: 'one', time: 1250, x: 130, y: 225 }), true);
  assert.equal(isDoubleTap(first, { cardId: 'two', time: 1250, x: 130, y: 225 }), false);
  assert.equal(isDoubleTap(first, { cardId: 'one', time: 1400, x: 130, y: 225 }), false);
});
