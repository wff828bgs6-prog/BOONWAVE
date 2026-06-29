import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import { createNode, normalizeNode } from '../domain/node.js';
import { createMediaRecord } from '../domain/media-record.js';

function resetIndexedDB() {
  globalThis.indexedDB = new IDBFactory();
}

test('IndexedDB saves card, new cover, and old-cover removal in one transaction', async () => {
  resetIndexedDB();
  const { IndexedDBAdapter } = await import('../storage/indexeddb-adapter.js');
  const adapter = new IndexedDBAdapter();
  await adapter.init();

  const original = createNode({
    type: 'goal',
    title: 'Original',
    data: { coverMediaId: 'old-cover' },
  });
  const oldRecord = createMediaRecord({
    name: 'old.png',
    mimeType: 'image/png',
    size: 3,
    ownerIds: [original.id],
  });
  oldRecord.id = 'old-cover';

  await adapter.saveCard(original);
  await adapter.saveMedia(oldRecord, new Blob(['old']));

  const newRecord = createMediaRecord({
    name: 'new.png',
    mimeType: 'image/png',
    size: 3,
    ownerIds: [original.id],
  });
  const updated = normalizeNode({
    ...original,
    title: 'Updated',
    data: { ...original.data, coverMediaId: newRecord.id },
    updatedAt: new Date().toISOString(),
  });

  await adapter.saveCardBundle({
    card: updated,
    mediaEntries: [{ record: newRecord, blob: new Blob(['new']) }],
    removedMediaIds: [oldRecord.id],
  });

  const workspace = await adapter.loadWorkspace();
  assert.equal(workspace.cards[original.id].title, 'Updated');
  assert.equal(workspace.cards[original.id].data.coverMediaId, newRecord.id);

  const oldMedia = await adapter.loadMedia(oldRecord.id);
  assert.equal(oldMedia.record, null);
  assert.equal(oldMedia.blob, null);

  const newMedia = await adapter.loadMedia(newRecord.id);
  assert.deepEqual(newMedia.record.ownerIds, [original.id]);
  assert.equal(await newMedia.blob.text(), 'new');
});

test('cover replacement preserves an old blob that still has another owner', async () => {
  resetIndexedDB();
  const { IndexedDBAdapter } = await import('../storage/indexeddb-adapter.js');
  const adapter = new IndexedDBAdapter();
  await adapter.init();

  const original = createNode({
    type: 'goal',
    title: 'Shared cover owner',
    data: { coverMediaId: 'shared-old-cover' },
  });
  const other = createNode({ type: 'project', title: 'Other owner' });
  const sharedRecord = createMediaRecord({
    name: 'shared-old.png',
    mimeType: 'image/png',
    size: 10,
    ownerIds: [original.id, other.id],
  });
  sharedRecord.id = 'shared-old-cover';

  await adapter.saveCard(original);
  await adapter.saveCard(other);
  await adapter.saveMedia(sharedRecord, new Blob(['shared-old']));

  const replacement = createMediaRecord({
    name: 'replacement.png',
    mimeType: 'image/png',
    size: 11,
    ownerIds: [original.id],
  });
  const updated = normalizeNode({
    ...original,
    data: { ...original.data, coverMediaId: replacement.id },
    updatedAt: new Date().toISOString(),
  });

  await adapter.saveCardBundle({
    card: updated,
    mediaEntries: [{ record: replacement, blob: new Blob(['replacement']) }],
    removedMediaIds: [sharedRecord.id],
  });

  const oldMedia = await adapter.loadMedia(sharedRecord.id);
  assert.deepEqual(oldMedia.record.ownerIds, [other.id]);
  assert.equal(await oldMedia.blob.text(), 'shared-old');

  const newMedia = await adapter.loadMedia(replacement.id);
  assert.deepEqual(newMedia.record.ownerIds, [original.id]);
  assert.equal(await newMedia.blob.text(), 'replacement');
});

test('failed IndexedDB bundle write rolls back the card update', async () => {
  resetIndexedDB();
  const { IndexedDBAdapter } = await import('../storage/indexeddb-adapter.js');
  const adapter = new IndexedDBAdapter();
  await adapter.init();

  const original = createNode({ type: 'project', title: 'Stable' });
  await adapter.saveCard(original);
  const changed = normalizeNode({ ...original, title: 'Must roll back' });

  await assert.rejects(adapter.saveCardBundle({
    card: changed,
    mediaEntries: [{ record: { name: 'invalid-without-id' }, blob: new Blob(['x']) }],
  }));

  const workspace = await adapter.loadWorkspace();
  assert.equal(workspace.cards[original.id].title, 'Stable');
});
