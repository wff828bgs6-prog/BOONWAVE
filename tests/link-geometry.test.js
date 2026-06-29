import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCardRect, getAnchor, createPathData } from '../canvas/links.js';

test('measured DOM size overrides stale model size', () => {
  assert.deepEqual(
    resolveCardRect(
      { x: 10, y: 20, width: 230, height: 138 },
      { width: 132, height: 156 },
    ),
    { x: 10, y: 20, width: 132, height: 156 },
  );
});

test('anchor lands on the actual card border', () => {
  const from = { x: 0, y: 0, width: 132, height: 156 };
  const to = { x: 400, y: 40, width: 230, height: 138 };
  const anchor = getAnchor(from, to);

  assert.equal(anchor.x, 132);
  assert.ok(anchor.y >= 0 && anchor.y <= 156);
});

test('path data remains finite and ends at requested anchors', () => {
  const path = createPathData({ x: 10, y: 20 }, { x: 300, y: 200 });

  assert.match(path, /^M 10 20 C /);
  assert.match(path, /, 300 200$/);
  assert.equal(path.includes('NaN'), false);
});
