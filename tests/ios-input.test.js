import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CARD_DRAG_START_PX, shouldStartCardDrag } from '../canvas/pointer-gesture-policy.js';

const read=(path)=>readFileSync(path,'utf8');

test('touch threshold',()=>{
  assert.equal(CARD_DRAG_START_PX,12);
  assert.equal(shouldStartCardDrag({x:100,y:100},{x:108,y:106}),false);
  assert.equal(shouldStartCardDrag({x:100,y:100},{x:113,y:100}),true);
});

test('workspace input guards',()=>{
  const css=read('styles/production-shell-v2.css');
  const workspace=read('controllers/workspace-controller-v2.js');
  assert.ok(css.includes('-webkit-touch-callout:none'));
  assert.ok(css.includes('-webkit-user-select:none'));
  assert.ok(workspace.includes('selectstart'));
  assert.ok(workspace.includes('dragstart'));
  assert.ok(workspace.includes('removeAllRanges'));
});

test('detail lifecycle guard',()=>{
  const detail=read('controllers/card-detail-controller-v2.js');
  assert.ok(detail.includes("phase = 'scheduled'"));
  assert.ok(detail.includes('BACKDROP_GUARD_MS = 140'));
  assert.ok(detail.includes('pointer-events:none'));
});
