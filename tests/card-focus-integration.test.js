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

test('locked gestures use one-tap activation without long-press edit',()=>{
  const gesture=readFileSync('canvas/gesture-machine.js','utf8');
  const workspace=readFileSync('controllers/workspace-controller-v2.js','utf8');
  assert.ok(gesture.includes('onInteractiveTap'));
  assert.equal(gesture.includes('onInteractiveLongPress'),false);
  assert.equal(workspace.includes('onInteractiveLongPress'),false);
  assert.equal(workspace.includes('handleCardEdit'),false);
});
