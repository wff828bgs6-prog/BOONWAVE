import test from 'node:test';
import assert from 'node:assert/strict';

import { createMediaRecord, validateMediaRecord } from '../domain/media-record.js';
import {
  createMedia,
  attachMediaOwner,
  detachMediaOwner,
  deleteMediaIfUnreferenced,
} from '../services/media-service.js';

function createMemoryMediaStorage() {
  const records = new Map();
  const blobs = new Map();
  return {
    records,
    blobs,
    async saveMedia(record, blob) {
      records.set(record.id, structuredClone(record));
      if (blob !== undefined) blobs.set(record.id, blob);
    },
    async loadMedia(id) {
      return {
        record: records.has(id) ? structuredClone(records.get(id)) : null,
        blob: blobs.get(id) ?? null,
      };
    },
    async deleteMedia(id) {
      records.delete(id);
      blobs.delete(id);
    },
  };
}

test('MediaRecord separates metadata from file content', () => {
  const record = createMediaRecord({
    name: 'cover.jpg',
    mimeType: 'image/jpeg',
    size: 2048,
    ownerIds: ['card_1'],
  });

  assert.equal(record.kind, 'image');
  assert.equal(record.size, 2048);
  assert.deepEqual(record.ownerIds, ['card_1']);
  assert.equal('blob' in record, false);
  assert.equal(validateMediaRecord(record).valid, true);
});

test('shared media survives until its final owner is detached', async () => {
  const storageAdapter = createMemoryMediaStorage();
  const blob = new Blob(['image-content'], { type: 'image/png' });
  const record = await createMedia(
    { name: 'shared.png', mimeType: 'image/png', size: blob.size, ownerIds: ['card_a'] },
    blob,
    { storageAdapter },
  );

  await attachMediaOwner(record.id, 'card_b', { storageAdapter });
  const firstDetach = await detachMediaOwner(record.id, 'card_a', { storageAdapter });

  assert.equal(firstDetach.deleted, false);
  assert.deepEqual(firstDetach.record.ownerIds, ['card_b']);
  assert.equal(storageAdapter.blobs.has(record.id), true);

  const finalDetach = await detachMediaOwner(record.id, 'card_b', { storageAdapter });
  assert.equal(finalDetach.deleted, true);
  assert.equal(storageAdapter.records.has(record.id), false);
  assert.equal(storageAdapter.blobs.has(record.id), false);
});

test('referenced media cannot be removed as orphaned', async () => {
  const storageAdapter = createMemoryMediaStorage();
  const record = createMediaRecord({
    name: 'document.pdf',
    mimeType: 'application/pdf',
    ownerIds: ['project_1'],
  });
  await storageAdapter.saveMedia(record, new Blob(['pdf']));

  assert.equal(await deleteMediaIfUnreferenced(record.id, { storageAdapter }), false);
  assert.equal(storageAdapter.records.has(record.id), true);
});

test('unreferenced media is deleted from metadata and blob stores', async () => {
  const storageAdapter = createMemoryMediaStorage();
  const record = createMediaRecord({ name: 'orphan.bin', ownerIds: [] });
  await storageAdapter.saveMedia(record, new Blob(['data']));

  assert.equal(await deleteMediaIfUnreferenced(record.id, { storageAdapter }), true);
  assert.equal(storageAdapter.records.has(record.id), false);
  assert.equal(storageAdapter.blobs.has(record.id), false);
});
