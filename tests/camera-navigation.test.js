import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HOME_CAMERA_DURATION_MS,
  easeOutCubic,
  getCameraForCard,
  interpolateCamera,
} from '../canvas/camera-navigation.js';

test('home camera centers Я Есмь at the requested visible point', () => {
  const camera = getCameraForCard({
    card: { x: 100, y: 200 },
    cardWidth: 240,
    cardHeight: 160,
    targetX: 195,
    targetY: 360,
    zoom: 0.85,
  });

  assert.equal(camera.zoom, 0.85);
  assert.ok(Math.abs((100 + 120) * camera.zoom + camera.x - 195) < 1e-9);
  assert.ok(Math.abs((200 + 80) * camera.zoom + camera.y - 360) < 1e-9);
});

test('home navigation uses a short non-overshooting animation', () => {
  assert.ok(HOME_CAMERA_DURATION_MS >= 300 && HOME_CAMERA_DURATION_MS <= 420);
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.ok(easeOutCubic(0.5) > 0.5);

  const halfway = interpolateCamera(
    { x: 0, y: 0, zoom: 0.5 },
    { x: 100, y: 200, zoom: 1 },
    0.5,
  );
  assert.ok(halfway.x > 50 && halfway.x < 100);
  assert.ok(halfway.y > 100 && halfway.y < 200);
  assert.ok(halfway.zoom > 0.75 && halfway.zoom < 1);
});

test('invalid cards cannot produce a corrupt camera', () => {
  assert.throws(() => getCameraForCard({ card: null, targetX: 1, targetY: 1 }), /positioned card/);
  assert.throws(() => getCameraForCard({ card: { x: 0, y: 0 }, targetX: NaN, targetY: 1 }), /target point/);
});
