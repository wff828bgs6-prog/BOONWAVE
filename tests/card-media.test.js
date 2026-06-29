import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode } from '../domain/node.js';
import { createMediaRecord } from '../domain/media-record.js';
import {
  attachMediaToCard,
  detachMediaFromCard,
  getCardMediaIds,
} from '../services/card-media-service.js';

function createTestStore(initialState) {
  let state = structuredClone(initialState);
  return {
    getState() {
      return state;
    },
    setState(patch) {
      state = { ...state, ...patch };
      return state;
    },
  };
}

function createMemoryStorage(cards = [], media = []) {
  const cardMap = new Map(cards.map((card) => [card.id, structuredClone(card)]));
  const mediaMap = new Map(media.map(({ record, blob = null }) => [
    record.id,
    { record: structuredClone(record), blob },
  ]));

  return {
    cardMap,
    mediaMap,
    async saveCard(card) {
      cardMap.set(card.id, structuredClone(card));
    },
    async saveMedia(record, blob) {
      mediaMap.set(record.id, { record: structuredClone(record), blob });
    },
    async loadMedia(id) {
      const item = mediaMap.get(id);
      return item
        ? { record: structuredClone(item.record), blob: item.blob }
        : { record: null, blob: null };
    },
    async deleteMedia(id) {
      mediaMap.delete(id);
    },
  };
}

test('project image is attached to images and media owner list', async () => {
  const card = createNode({ type: 'project', title: 'Project' });
  const media = createMediaRecord({ name: 'photo.jpg', mimeType: 'image/jpeg' });
  const stateStore = createTestStore({ cards: { [card.id]: card }, links: [], selectedCardId: null });
  const storageAdapter = createMemoryStorage([card], [{ record: media }]);

  const updated = await attachMediaToCard(card.id, media.id, 'images', { stateStore, storageAdapter });
  const savedMedia = await storageAdapter.loadMedia(media.id);

  assert.deepEqual(updated.data.images, [media.id]);
  assert.deepEqual(savedMedia.record.ownerIds, [card.id]);
  assert.deepEqual(getCardMediaIds(updated), [media.id]);
});

test('cover replacement detaches previous media when no other card field uses it', async () => {
  const first = createMediaRecord({ name: 'first.png', mimeType: 'image/png', ownerIds: [] });
  const second = createMediaRecord({ name: 'second.png', mimeType: 'image/png', ownerIds: [] });
  const card = createNode({
    type: 'goal',
    title: 'Goal',
    data: { coverMediaId: first.id },
  });
  first.ownerIds = [card.id];

  const stateStore = createTestStore({ cards: { [card.id]: card }, links: [], selectedCardId: null });
  const storageAdapter = createMemoryStorage([card], [{ record: first }, { record: second }]);

  const updated = await attachMediaToCard(card.id, second.id, 'cover', { stateStore, storageAdapter });

  assert.equal(updated.data.coverMediaId, second.id);
  assert.equal(storageAdapter.mediaMap.has(first.id), false);
  assert.deepEqual((await storageAdapter.loadMedia(second.id)).record.ownerIds, [card.id]);
});

test('media stays owned while referenced by another slot on the same card', async () => {
  const media = createMediaRecord({ name: 'shared.png', mimeType: 'image/png' });
  const card = createNode({
    type: 'project',
    title: 'Project',
    data: { coverMediaId: media.id, images: [media.id] },
  });
  media.ownerIds = [card.id];

  const stateStore = createTestStore({ cards: { [card.id]: card }, links: [], selectedCardId: null });
  const storageAdapter = createMemoryStorage([card], [{ record: media }]);

  const updated = await detachMediaFromCard(card.id, media.id, 'cover', { stateStore, storageAdapter });

  assert.equal(updated.data.coverMediaId, null);
  assert.deepEqual(updated.data.images, [media.id]);
  assert.deepEqual((await storageAdapter.loadMedia(media.id)).record.ownerIds, [card.id]);
});

test('final card reference removal deletes unshared media', async () => {
  const media = createMediaRecord({ name: 'brief.pdf', mimeType: 'application/pdf' });
  const card = createNode({
    type: 'project',
    title: 'Project',
    data: { documents: [media.id] },
  });
  media.ownerIds = [card.id];

  const stateStore = createTestStore({ cards: { [card.id]: card }, links: [], selectedCardId: null });
  const storageAdapter = createMemoryStorage([card], [{ record: media }]);

  const updated = await detachMediaFromCard(card.id, media.id, 'documents', { stateStore, storageAdapter });

  assert.deepEqual(updated.data.documents, []);
  assert.equal(storageAdapter.mediaMap.has(media.id), false);
});

test('slot rejects incompatible media kind without changing card or media', async () => {
  const card = createNode({ type: 'person', title: 'Person' });
  const document = createMediaRecord({ name: 'cv.pdf', mimeType: 'application/pdf' });
  const initialState = { cards: { [card.id]: card }, links: [], selectedCardId: null };
  const stateStore = createTestStore(initialState);
  const storageAdapter = createMemoryStorage([card], [{ record: document }]);

  await assert.rejects(
    attachMediaToCard(card.id, document.id, 'avatar', { stateStore, storageAdapter }),
    /not allowed/,
  );

  assert.deepEqual(stateStore.getState(), initialState);
  assert.deepEqual((await storageAdapter.loadMedia(document.id)).record.ownerIds, []);
});
