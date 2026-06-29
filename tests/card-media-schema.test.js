import test from 'node:test';
import assert from 'node:assert/strict';

import { NODE_TYPES } from '../domain/node-schemas.js';
import {
  CARD_MEDIA_SLOTS as domainSlots,
  getCardMediaIds as domainGetIds,
} from '../domain/card-media.js';
import {
  CARD_MEDIA_SLOTS as serviceSlots,
  getCardMediaIds as serviceGetIds,
} from '../services/card-media-service.js';

test('domain and service use the same immutable media schema', () => {
  assert.equal(serviceSlots, domainSlots);
  assert.equal(serviceGetIds, domainGetIds);
  assert.deepEqual(Object.keys(domainSlots).sort(), [...NODE_TYPES].sort());
});

test('every media slot has a field, mode, and allowed kinds', () => {
  for (const type of NODE_TYPES) {
    for (const config of Object.values(domainSlots[type])) {
      assert.equal(typeof config.field, 'string');
      assert.ok(['single', 'multiple'].includes(config.mode));
      assert.ok(Array.isArray(config.kinds));
      assert.ok(config.kinds.length > 0);
    }
  }
});
