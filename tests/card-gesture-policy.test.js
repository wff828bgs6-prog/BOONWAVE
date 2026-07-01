import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_DRAG_START_PX, shouldStartCardDrag } from '../canvas/pointer-gesture-policy.js';

test('pointer threshold is stable',()=>{
  assert.equal(CARD_DRAG_START_PX,12);
  assert.equal(shouldStartCardDrag({x:0,y:0},{x:8,y:6}),false);
  assert.equal(shouldStartCardDrag({x:0,y:0},{x:13,y:0}),true);
});
