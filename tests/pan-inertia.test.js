import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PAN_INERTIA_CONFIG,
  PanVelocityTracker,
  stepPanInertia,
} from '../canvas/pan-inertia.js';

const ROOT = process.cwd();
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('velocity tracker launches only after a deliberate recent swipe', () => {
  const tracker = new PanVelocityTracker();
  tracker.reset(0);
  tracker.add(18, 0, 16);
  tracker.add(20, 0, 32);

  const launch = tracker.getLaunchVelocity(40);
  assert.ok(launch.x >= PAN_INERTIA_CONFIG.minLaunchSpeed);
  assert.equal(launch.y, 0);

  assert.deepEqual(
    tracker.getLaunchVelocity(40 + PAN_INERTIA_CONFIG.staleAfterMs + 1),
    { x: 0, y: 0 },
  );
});

test('slow movement does not produce accidental drift', () => {
  const tracker = new PanVelocityTracker();
  tracker.reset(0);
  tracker.add(1, 0, 30);
  tracker.add(1, 0, 60);
  assert.deepEqual(tracker.getLaunchVelocity(65), { x: 0, y: 0 });
});

test('launch velocity is capped for predictable iPhone movement', () => {
  const tracker = new PanVelocityTracker();
  tracker.reset(0);
  tracker.add(500, 500, 10);
  const launch = tracker.getLaunchVelocity(12);
  assert.ok(Math.hypot(launch.x, launch.y) <= PAN_INERTIA_CONFIG.maxLaunchSpeed + 1e-9);
});

test('inertia decays monotonically and remains frame-rate independent', () => {
  const velocity = { x: 1, y: 0.5 };
  const oneFrame = stepPanInertia(velocity, 16);
  const twoHalfFramesA = stepPanInertia(velocity, 8);
  const twoHalfFramesB = stepPanInertia(twoHalfFramesA.velocity, 8);

  assert.ok(Math.hypot(oneFrame.velocity.x, oneFrame.velocity.y) < Math.hypot(velocity.x, velocity.y));
  assert.ok(Math.abs(oneFrame.dx - (twoHalfFramesA.dx + twoHalfFramesB.dx)) < 1e-9);
  assert.ok(Math.abs(oneFrame.dy - (twoHalfFramesA.dy + twoHalfFramesB.dy)) < 1e-9);
});

test('gesture machine synchronizes direct pan with animation frames and cancels inertia', () => {
  const gesture = read('canvas/gesture-machine.js');
  assert.match(gesture, /INERTIA/);
  assert.match(gesture, /requestAnimationFrame/);
  assert.match(gesture, /queuePan\(dx, dy\)/);
  assert.match(gesture, /cancelInertia\(\{ setIdle: true \}\)/);
  assert.match(gesture, /prefersReducedPanMotion/);
  assert.match(gesture, /pointer\?\.pointerType !== 'mouse'/);
  assert.match(gesture, /maxDurationMs/);
});
