import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PAN_INERTIA_CONFIG,
  PanVelocityTracker,
  stepPanInertia,
} from '../canvas/pan-inertia.js';

test('velocity tracker launches only after a deliberate recent swipe',()=>{
  const tracker=new PanVelocityTracker();
  tracker.reset(0);tracker.add(18,0,16);tracker.add(20,0,32);
  const launch=tracker.getLaunchVelocity(40);
  assert.ok(launch.x>=PAN_INERTIA_CONFIG.minLaunchSpeed);
  assert.equal(launch.y,0);
  assert.deepEqual(tracker.getLaunchVelocity(40+PAN_INERTIA_CONFIG.staleAfterMs+1),{x:0,y:0});
});

test('slow movement does not produce accidental drift',()=>{
  const tracker=new PanVelocityTracker();
  tracker.reset(0);tracker.add(1,0,30);tracker.add(1,0,60);
  assert.deepEqual(tracker.getLaunchVelocity(65),{x:0,y:0});
});

test('launch velocity is capped for predictable iPhone movement',()=>{
  const tracker=new PanVelocityTracker();
  tracker.reset(0);tracker.add(500,500,10);
  assert.ok(Math.hypot(...Object.values(tracker.getLaunchVelocity(12)))<=PAN_INERTIA_CONFIG.maxLaunchSpeed+1e-9);
});

test('inertia decays monotonically and remains frame-rate independent',()=>{
  const velocity={x:1,y:.5};
  const one=stepPanInertia(velocity,16);
  const halfA=stepPanInertia(velocity,8);
  const halfB=stepPanInertia(halfA.velocity,8);
  assert.ok(Math.hypot(one.velocity.x,one.velocity.y)<Math.hypot(velocity.x,velocity.y));
  assert.ok(Math.abs(one.dx-(halfA.dx+halfB.dx))<1e-9);
  assert.ok(Math.abs(one.dy-(halfA.dy+halfB.dy))<1e-9);
});

test('gesture machine keeps frame-synced pan and bounded inertia',()=>{
  const gesture=readFileSync('canvas/gesture-machine.js','utf8');
  assert.ok(gesture.includes('requestAnimationFrame'));
  assert.ok(gesture.includes('queuePan'));
  assert.ok(gesture.includes('cancelInertia'));
  assert.ok(gesture.includes('prefersReducedPanMotion'));
  assert.ok(gesture.includes('maxDurationMs'));
});
