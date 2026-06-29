import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import { createCardWithMedia, updateCardWithMedia } from '../services/card-save-service.js';
import { updateCardView } from '../services/card-view-service.js';
import { deleteCardNode } from '../services/node-service.js';

function createTestStore(initialState) {
  let state = structuredClone(initialState);
  return {
    getState() { return state; },
    setState(patch) { state = { ...state, ...patch }; return state; },
  };
}

function namedBlob(name, type, content) {
  const blob = new Blob([content], { type });
  Object.defineProperty(blob, 'name', { value: name });
  return blob;
}

test('card cover survives reload, replacement, all view modes, and graph deletion without orphan media', async () => {
  globalThis.indexedDB = new IDBFactory();
  const { IndexedDBAdapter } = await import('../storage/indexeddb-adapter.js');
  const adapter = new IndexedDBAdapter();
  await adapter.init();

  const initialStore = createTestStore({ cards: {}, links: [], selectedCardId: null });
  const compactFrame = {
    shape: 'circle',
    scale: 1.45,
    positionX: 22,
    positionY: 68,
  };
  const workingFrame = {
    shape: 'landscape',
    scale: 2.15,
    positionX: 71,
    positionY: 34,
  };

  const created = await createCardWithMedia({
    type: 'goal',
    title: 'Visual goal',
    description: 'Cover lifecycle test',
    data: { progress: 37 },
    view: {
      mode: 'compact',
      compactLabel: 'Цель',
      coverFrames: {
        compact: compactFrame,
        working: workingFrame,
      },
    },
  }, [
    { slot: 'cover', file: namedBlob('first.png', 'image/png', 'first-cover') },
  ], {
    stateStore: initialStore,
    storageAdapter: adapter,
  });

  const cardId = created.card.id;
  const firstCoverId = created.card.data.coverMediaId;
  assert.ok(firstCoverId);
  assert.equal(initialStore.getState().cards[cardId].id, cardId);

  const firstReload = await adapter.loadWorkspace();
  const persisted = firstReload.cards[cardId];
  assert.equal(persisted.view.mode, 'compact');
  assert.equal(persisted.view.compactLabel, 'Цель');
  assert.deepEqual(persisted.view.coverFrames.compact, compactFrame);
  assert.deepEqual(persisted.view.coverFrames.working, workingFrame);

  const firstMedia = await adapter.loadMedia(firstCoverId);
  assert.deepEqual(firstMedia.record.ownerIds, [cardId]);
  assert.equal(await firstMedia.blob.text(), 'first-cover');

  const reloadedStore = createTestStore({
    cards: firstReload.cards,
    links: firstReload.links,
    selectedCardId: cardId,
  });

  for (const mode of ['compact', 'standard', 'full']) {
    await updateCardView(cardId, { mode }, {
      stateStore: reloadedStore,
      storageAdapter: adapter,
    });
    const modeReload = await adapter.loadWorkspace();
    assert.equal(modeReload.cards[cardId].view.mode, mode);
    assert.deepEqual(modeReload.cards[cardId].view.coverFrames.compact, compactFrame);
    assert.deepEqual(modeReload.cards[cardId].view.coverFrames.working, workingFrame);
  }

  const replaced = await updateCardWithMedia(cardId, {
    title: 'Visual goal updated',
  }, [
    { slot: 'cover', file: namedBlob('second.png', 'image/png', 'second-cover') },
  ], {
    stateStore: reloadedStore,
    storageAdapter: adapter,
  });

  const secondCoverId = replaced.card.data.coverMediaId;
  assert.notEqual(secondCoverId, firstCoverId);

  const removedFirstMedia = await adapter.loadMedia(firstCoverId);
  assert.equal(removedFirstMedia.record, null);
  assert.equal(removedFirstMedia.blob, null);

  const secondMedia = await adapter.loadMedia(secondCoverId);
  assert.deepEqual(secondMedia.record.ownerIds, [cardId]);
  assert.equal(await secondMedia.blob.text(), 'second-cover');

  const secondReload = await adapter.loadWorkspace();
  assert.equal(secondReload.cards[cardId].title, 'Visual goal updated');
  assert.equal(secondReload.cards[cardId].data.coverMediaId, secondCoverId);
  assert.equal(secondReload.cards[cardId].view.mode, 'full');
  assert.deepEqual(secondReload.cards[cardId].view.coverFrames.compact, compactFrame);
  assert.deepEqual(secondReload.cards[cardId].view.coverFrames.working, workingFrame);

  const deletionStore = createTestStore({
    cards: secondReload.cards,
    links: secondReload.links,
    selectedCardId: cardId,
  });
  await deleteCardNode(cardId, {
    stateStore: deletionStore,
    storageAdapter: adapter,
  });

  const finalWorkspace = await adapter.loadWorkspace();
  assert.equal(finalWorkspace.cards[cardId], undefined);
  assert.equal(deletionStore.getState().cards[cardId], undefined);
  assert.equal(deletionStore.getState().selectedCardId, null);

  const removedSecondMedia = await adapter.loadMedia(secondCoverId);
  assert.equal(removedSecondMedia.record, null);
  assert.equal(removedSecondMedia.blob, null);
});
