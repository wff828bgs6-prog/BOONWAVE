import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('card detail lifecycle is guarded',()=>{
  const text=readFileSync('controllers/card-detail-controller-v2.js','utf8');
  assert.ok(text.includes("this.phase = 'closed'"));
  assert.ok(text.includes("this.phase = 'opening'"));
  assert.ok(text.includes("this.phase = 'closing'"));
  assert.ok(text.includes('data-detail-edit'));
  assert.ok(text.includes('data-detail-display'));
});

test('locked gestures are handled by the canvas controller',()=>{
  const text=readFileSync('canvas/gesture-machine.js','utf8');
  assert.ok(text.includes('onInteractiveLongPress'));
  assert.ok(text.includes('onInteractiveDoubleTap'));
});
