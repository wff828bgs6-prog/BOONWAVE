import test from 'node:test';
import assert from 'node:assert/strict';

import StorageAdapter from '../storage/storage-adapter.js';
import { createNode } from '../domain/node.js';
import { getCardMediaIds } from '../domain/card-media.js';
import { deleteCardNode } from '../services/node-service.js';

function createTestStore(initialState) {
  let state = structuredClone(initialState);
  return {
    getState() { return state; },
    setState(patch) { state = { ...state, ...patch }; return state; },
  };
}

test('card media ids include every slot once', () => {
  const card = createNode({
    type: 'project',
    title: 'Project',
    data: {
      coverMediaId: 'cover',
      images: ['cover', 'image'],
      documents: ['document'],
      files: ['file', 'image'],
    },
  });

  assert.deepEqual(getCardMediaIds(card), ['cover', 'image', 'document', 'file']);
});

test('atomic adapter receives card, links, and media in one operation', async () => {
  const card = createNode({
    type: 'person',
    title: 'Alex',
    data: { avatarMediaId: 'avatar', attachments: ['shared', 'solo'] },
  });
  const other = createNode({ type: 'project', title: 'Other' });
  const stateStore = createTestStore({
    cards: { [card.id]: card, [other.id]: other },
    links: [
      { id: 'related', sourceId: card.id, targetId: other.id },
      { id: 'unrelated', sourceId: 'x', targetId: 'y' },
    ],
    selectedCardId: card.id,
  });
  const calls = [];
  const storageAdapter = {
    async deleteCardGraph(input) { calls.push(structuredClone(input)); },
  };

  const result = await deleteCardNode(card.id, { stateStore, storageAdapter });

  assert.deepEqual(calls, [{
    cardId: card.id,
    linkIds: ['related'],
    mediaIds: ['avatar', 'shared', 'solo'],
  }]);
  assert.deepEqual(result.mediaIds, ['avatar', 'shared', 'solo']);
  assert.equal(stateStore.getState().cards[card.id], undefined);
  assert.deepEqual(stateStore.getState().links.map((link) => link.id), ['unrelated']);
  assert.equal(stateStore.getState().selectedCardId, null);
});

test('base adapter method is not mistaken for atomic support', async () => {
  const card = createNode({
    type: 'goal',
    title: 'Goal',
    data: { coverMediaId: 'cover' },
  });
  const stateStore = createTestStore({
    cards: { [card.id]: card },
    links: [],
    selectedCardId: card.id,
  });

  class FallbackAdapter extends StorageAdapter {
    constructor() {
      super();
      this.calls = [];
    }
    async deleteCardWithLinks(cardId, linkIds) {
      this.calls.push(['card', cardId, linkIds]);
    }
    async loadMedia(mediaId) {
      this.calls.push(['load', mediaId]);
      return {
        record: { id: mediaId, kind: 'image', name: 'Cover', mimeType: 'image/png', size: 1, ownerIds: [card.id] },
        blob: new Blob(['x']),
      };
    }
    async deleteMedia(mediaId) {
      this.calls.push(['delete-media', mediaId]);
    }
  }

  const storageAdapter = new FallbackAdapter();
  await deleteCardNode(card.id, { stateStore, storageAdapter });

  assert.deepEqual(storageAdapter.calls, [
    ['card', card.id, []],
    ['load', 'cover'],
    ['delete-media', 'cover'],
  ]);
});

test('failed atomic transaction leaves application state unchanged', async () => {
  const card = createNode({
    type: 'idea',
    title: 'Idea',
    data: { coverMediaId: 'cover' },
  });
  const initialState = {
    cards: { [card.id]: card },
    links: [{ id: 'related', sourceId: card.id, targetId: 'other' }],
    selectedCardId: card.id,
  };
  const stateStore = createTestStore(initialState);
  const storageAdapter = {
    async deleteCardGraph() { throw new Error('transaction aborted'); },
  };

  await assert.rejects(
    deleteCardNode(card.id, { stateStore, storageAdapter }),
    /transaction aborted/,
  );
  assert.deepEqual(stateStore.getState(), initialState);
});
