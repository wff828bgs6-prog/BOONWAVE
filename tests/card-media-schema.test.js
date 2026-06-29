import test from 'node:test';
import assert from 'node:assert/strict';

import { NODE_TYPES } from '../domain/node-schemas.js';
import { CARD_MEDIA_SLOTS, getCardMediaIds } from '../domain/card-media.js';

test('domain media schema covers every supported node type', () => {
  assert.deepEqual(Object.keys(CARD_MEDIA_SLOTS).sort(), [...NODE_TYPES].sort());
});

test('every media slot has a field, mode, and allowed kinds', () => {
  for (const type of NODE_TYPES) {
    for (const config of Object.values(CARD_MEDIA_SLOTS[type])) {
      assert.equal(typeof config.field, 'string');
      assert.ok(['single', 'multiple'].includes(config.mode));
      assert.ok(Array.isArray(config.kinds));
      assert.ok(config.kinds.length > 0);
    }
  }
});

test('media ids are collected once across all slots', () => {
  const card = {
    type: 'project',
    data: {
      coverMediaId: 'shared',
      images: ['shared', 'image'],
      documents: ['document'],
      files: ['image', 'file'],
    },
  };

  assert.deepEqual(getCardMediaIds(card), ['shared', 'image', 'document', 'file']);
});
