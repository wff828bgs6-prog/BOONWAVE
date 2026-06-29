import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MEDIA_FILE_LIMITS,
  MAX_MEDIA_FILES_PER_SAVE,
  validatePendingMediaBundle,
  normalizeStorageError,
  getMediaErrorMessage,
} from '../domain/media-policy.js';

const file = (name, type, size) => ({
  name, type, size,
  async arrayBuffer() { return new ArrayBuffer(0); },
});

test('valid cover resolves as image', () => {
  const result = validatePendingMediaBundle('goal', [
    { slot: 'cover', file: file('cover.heic', 'image/heic', 2_000_000) },
  ]);
  assert.equal(result.items[0].kind, 'image');
  assert.equal(result.totalSize, 2_000_000);
});

test('document slot enforces document contract', () => {
  const result = validatePendingMediaBundle('project', [
    { slot: 'documents', file: file('brief.pdf', 'application/pdf', 4_000_000) },
  ]);
  assert.equal(result.items[0].kind, 'document');
});

test('oversized image is rejected before persistence', () => {
  assert.throws(
    () => validatePendingMediaBundle('idea', [
      { slot: 'cover', file: file('huge.png', 'image/png', MEDIA_FILE_LIMITS.image + 1) },
    ]),
    (error) => error.code === 'MEDIA_FILE_TOO_LARGE',
  );
});

test('too many files are rejected', () => {
  const files = Array.from({ length: MAX_MEDIA_FILES_PER_SAVE + 1 }, (_, index) => ({
    slot: 'attachments',
    file: file(`${index}.txt`, 'text/plain', 1),
  }));
  assert.throws(
    () => validatePendingMediaBundle('process', files),
    (error) => error.code === 'TOO_MANY_MEDIA_FILES',
  );
});

test('quota error becomes a stable user message', () => {
  const error = new Error('quota');
  error.name = 'QuotaExceededError';
  const normalized = normalizeStorageError(error);
  assert.equal(normalized.code, 'STORAGE_QUOTA_EXCEEDED');
  assert.match(getMediaErrorMessage(normalized), /Недостаточно свободного места/);
});
