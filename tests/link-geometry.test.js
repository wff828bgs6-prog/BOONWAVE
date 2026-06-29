import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCardRect, getAnchor, createPathData } from '../canvas/links.js';

function assertPointOnBorder(point, rect) {
  const onVerticalBorder = (point.x === rect.x || point.x === rect.x + rect.width)
    && point.y >= rect.y
    && point.y <= rect.y + rect.height;
  const onHorizontalBorder = (point.y === rect.y || point.y === rect.y + rect.height)
    && point.x >= rect.x
    && point.x <= rect.x + rect.width;
  assert.equal(onVerticalBorder || onHorizontalBorder, true);
}

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
  assertPointOnBorder(anchor, from);
});

test('compact, standard, and full card sizes keep both endpoints on current borders', () => {
  const sizes = [
    { mode: 'compact', width: 132, height: 156 },
    { mode: 'standard', width: 230, height: 190 },
    { mode: 'full', width: 330, height: 320 },
  ];

  for (const sourceSize of sizes) {
    for (const targetSize of sizes) {
      const source = {
        x: 40,
        y: 80,
        width: sourceSize.width,
        height: sourceSize.height,
      };
      const target = {
        x: 620,
        y: 170,
        width: targetSize.width,
        height: targetSize.height,
      };
      const start = getAnchor(source, target);
      const end = getAnchor(target, source);

      assertPointOnBorder(start, source);
      assertPointOnBorder(end, target);
      assert.equal(start.x, source.x + source.width);
      assert.equal(end.x, target.x);
    }
  }
});

test('anchors use the correct border for left, right, above, and below targets', () => {
  const source = { x: 200, y: 200, width: 230, height: 138 };
  const targets = {
    right: { x: 700, y: 220, width: 132, height: 156 },
    left: { x: -300, y: 220, width: 330, height: 280 },
    below: { x: 230, y: 700, width: 230, height: 138 },
    above: { x: 230, y: -300, width: 230, height: 138 },
  };

  const right = getAnchor(source, targets.right);
  const left = getAnchor(source, targets.left);
  const below = getAnchor(source, targets.below);
  const above = getAnchor(source, targets.above);

  assert.equal(right.x, source.x + source.width);
  assert.equal(left.x, source.x);
  assert.equal(below.y, source.y + source.height);
  assert.equal(above.y, source.y);
  for (const point of [right, left, below, above]) assertPointOnBorder(point, source);
});

test('dragged card coordinates immediately produce new border endpoints', () => {
  const target = { x: 700, y: 160, width: 230, height: 190 };
  const before = { x: 20, y: 40, width: 132, height: 156 };
  const after = { ...before, x: 280, y: 310 };

  const beforeAnchor = getAnchor(before, target);
  const afterAnchor = getAnchor(after, target);

  assertPointOnBorder(beforeAnchor, before);
  assertPointOnBorder(afterAnchor, after);
  assert.notDeepEqual(afterAnchor, beforeAnchor);
});

test('world-space endpoints remain valid under pan and zoom transforms', () => {
  const source = { x: 50, y: 70, width: 230, height: 190 };
  const target = { x: 580, y: 260, width: 330, height: 320 };
  const start = getAnchor(source, target);
  const end = getAnchor(target, source);
  const camera = { x: -240, y: 135, zoom: 1.35 };
  const toScreen = (point) => ({
    x: camera.x + point.x * camera.zoom,
    y: camera.y + point.y * camera.zoom,
  });

  const screenStart = toScreen(start);
  const screenEnd = toScreen(end);
  const screenSource = {
    x: camera.x + source.x * camera.zoom,
    y: camera.y + source.y * camera.zoom,
    width: source.width * camera.zoom,
    height: source.height * camera.zoom,
  };
  const screenTarget = {
    x: camera.x + target.x * camera.zoom,
    y: camera.y + target.y * camera.zoom,
    width: target.width * camera.zoom,
    height: target.height * camera.zoom,
  };

  assertPointOnBorder(screenStart, screenSource);
  assertPointOnBorder(screenEnd, screenTarget);
});

test('path data remains finite and ends at requested anchors', () => {
  const path = createPathData({ x: 10, y: 20 }, { x: 300, y: 200 });

  assert.match(path, /^M 10 20 C /);
  assert.match(path, /, 300 200$/);
  assert.equal(path.includes('NaN'), false);
});
