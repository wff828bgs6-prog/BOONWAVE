import test from 'node:test';
import assert from 'node:assert/strict';

import { CoverLoadCoordinator } from '../ui/cover-load-coordinator.js';

test('newer cover request invalidates older asynchronous request', () => {
  const coordinator = new CoverLoadCoordinator();
  const first = coordinator.begin('card', 'old');
  const second = coordinator.begin('card', 'new');

  assert.equal(coordinator.isCurrent(first), false);
  assert.equal(coordinator.isCurrent(second), true);
});

test('cancel invalidates pending cover load', () => {
  const coordinator = new CoverLoadCoordinator();
  const request = coordinator.begin('card', 'photo');

  coordinator.cancel('card');
  assert.equal(coordinator.isCurrent(request), false);
});
