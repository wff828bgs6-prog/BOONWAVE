import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import { createNode } from '../domain/node.js';
import { createMediaRecord } from '../domain/media-record.js';

function resetIndexedDB() {
  globalThis.indexedDB = new IDBFactory();
}

test('IndexedDB atomically removes a card graph and preserves shared media', async () => {
  resetIndexedDB();
  const { IndexedDBAdapter } = await import('../storage/indexeddb-adapter.js');
  const adapter = new IndexedDBAdapter();
  await adapter.init();

  const card = createNode({ type: 'goal', title: 'Goal' });
  const other = createNode({ type: 'project', title: 'Other' });
  const relatedLink = { id: 'related', sourceId: card.id, targetId: other.id };
  const unrelatedLink = { id: 'unrelated', sourceId: 'x', targetId: 'y' };

  const solo = createMediaRecord({
    name: 'solo.png',
    mimeType: 'image/png',
    size: 4,
    ownerIds: [card.id],
  });
  const shared = createMediaRecord({
    name: 'shared.png',
    mimeType: 'image/png',
    size: 6,
    ownerIds: [card.id, other.id],
  });

  await adapter.saveCard(card);
  await adapter.saveCard(other);
  await adapter.saveLink(relatedLink);
  await adapter.saveLink(unrelatedLink);
  await adapter.saveMedia(solo, new Blob(['solo']));
  await adapter.saveMedia(shared, new Blob(['shared']));

  await adapter.deleteCardGraph({
    cardId: card.id,
    linkIds: [relatedLink.id],
    mediaIds: [solo.id, shared.id],
  });

  const workspace = await adapter.loadWorkspace();
  assert.equal(workspace.cards[card.id], undefined);
  assert.equal(workspace.cards[other.id].id, other.id);
  assert.deepEqual(workspace.links.map((link) => link.id), [unrelatedLink.id]);

  const deletedMedia = await adapter.loadMedia(solo.id);
  assert.equal(deletedMedia.record, null);
  assert.equal(deletedMedia.blob, null);

  const remainingMedia = await adapter.loadMedia(shared.id);
  assert.deepEqual(remainingMedia.record.ownerIds, [other.id]);
  assert.equal(await remainingMedia.blob.text(), 'shared');
});
