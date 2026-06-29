import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCoverMediaId,
  hasCoverMedia,
  collectActiveCoverMediaIds,
  getCoverFallback,
  getCardProgress,
} from '../ui/card-presentation.js';

test('person uses avatar while other cards use cover', () => {
  assert.equal(
    getCoverMediaId({ type: 'person', data: { avatarMediaId: 'avatar', coverMediaId: 'wrong' } }),
    'avatar',
  );
  assert.equal(getCoverMediaId({ type: 'goal', data: { coverMediaId: 'cover' } }), 'cover');
});

test('missing cover is explicit and has intentional fallback', () => {
  assert.equal(hasCoverMedia({ type: 'project', data: {} }), false);
  assert.equal(getCoverFallback({ type: 'project' }), 'П');
  assert.equal(getCoverFallback({ type: 'unknown' }), '•');
});

test('active cover ids are unique and exclude missing values', () => {
  assert.deepEqual(
    collectActiveCoverMediaIds({
      one: { type: 'project', data: { coverMediaId: 'shared' } },
      two: { type: 'goal', data: { coverMediaId: 'shared' } },
      three: { type: 'person', data: { avatarMediaId: 'avatar' } },
      four: { type: 'idea', data: {} },
    }),
    new Set(['shared', 'avatar']),
  );
});

test('progress is clamped and absent values remain absent', () => {
  assert.equal(getCardProgress({ data: { progress: 62 } }), 62);
  assert.equal(getCardProgress({ data: { progress: -5 } }), 0);
  assert.equal(getCardProgress({ data: { progress: 120 } }), 100);
  assert.equal(getCardProgress({ data: {} }), null);
});
