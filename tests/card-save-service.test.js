import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode } from '../domain/node.js';
import {
  createCardWithMedia,
  updateCardWithMedia,
  stageCardMedia,
} from '../services/card-save-service.js';

function createTestStore(initialState) {
  let state = structuredClone(initialState);
  return {
    getState() { return state; },
    setState(patch) { state = { ...state, ...patch }; return state; },
  };
}

function namedBlob(name, type, content = 'data') {
  const blob = new Blob([content], { type });
  Object.defineProperty(blob, 'name', { value: name });
  return blob;
}

test('staging a replacement cover keeps the new blob and identifies the old media', () => {
  const card = createNode({
    type: 'goal',
    title: 'Goal',
    data: { coverMediaId: 'old-cover' },
  });
  const staged = stageCardMedia(card, [
    { slot: 'cover', file: namedBlob('new.png', 'image/png') },
  ]);

  assert.equal(staged.mediaEntries.length, 1);
  assert.equal(staged.mediaEntries[0].record.ownerIds[0], card.id);
  assert.equal(staged.card.data.coverMediaId, staged.mediaEntries[0].record.id);
  assert.deepEqual(staged.removedMediaIds, ['old-cover']);
});

test('create without media saves the card before committing store state', async () => {
  const stateStore = createTestStore({ cards: {}, links: [], selectedCardId: null });
  let savedCard = null;
  const storageAdapter = {
    async saveCard(card) { savedCard = card; },
  };

  const result = await createCardWithMedia(
    { type: 'person', title: 'Person' },
    [],
    { stateStore, storageAdapter },
  );

  assert.equal(savedCard.id, result.card.id);
  assert.equal(stateStore.getState().cards[result.card.id].id, result.card.id);
  assert.equal(stateStore.getState().selectedCardId, result.card.id);
});

test('failed plain card save leaves store untouched', async () => {
  const initialState = { cards: {}, links: [], selectedCardId: null };
  const stateStore = createTestStore(initialState);
  const storageAdapter = {
    async saveCard() { throw new Error('card write failed'); },
  };

  await assert.rejects(
    createCardWithMedia(
      { type: 'person', title: 'Person' },
      [],
      { stateStore, storageAdapter },
    ),
    /card write failed/,
  );
  assert.deepEqual(stateStore.getState(), initialState);
});

test('create commits store only after the bundle transaction succeeds', async () => {
  const stateStore = createTestStore({ cards: {}, links: [], selectedCardId: null });
  const calls = [];
  const storageAdapter = {
    async saveCardBundle(bundle) { calls.push(bundle); },
  };

  const result = await createCardWithMedia(
    { type: 'idea', title: 'Idea' },
    [{ slot: 'cover', file: namedBlob('idea.png', 'image/png') }],
    { stateStore, storageAdapter },
  );

  assert.equal(calls.length, 1);
  assert.equal(stateStore.getState().cards[result.card.id].id, result.card.id);
  assert.equal(stateStore.getState().selectedCardId, result.card.id);
});

test('media save refuses a sequential saveMedia then saveCard fallback', async () => {
  const initialState = { cards: {}, links: [], selectedCardId: null };
  const stateStore = createTestStore(initialState);
  const calls = [];
  const storageAdapter = {
    async saveMedia() { calls.push('saveMedia'); },
    async saveCard() { calls.push('saveCard'); },
  };

  await assert.rejects(
    createCardWithMedia(
      { type: 'idea', title: 'Idea' },
      [{ slot: 'cover', file: namedBlob('idea.png', 'image/png') }],
      { stateStore, storageAdapter },
    ),
    /Atomic card and media save is not implemented/,
  );
  assert.deepEqual(calls, []);
  assert.deepEqual(stateStore.getState(), initialState);
});

test('failed bundle transaction leaves store untouched', async () => {
  const initialState = { cards: {}, links: [], selectedCardId: null };
  const stateStore = createTestStore(initialState);
  const storageAdapter = {
    async saveCardBundle() { throw new Error('transaction aborted'); },
  };

  await assert.rejects(
    createCardWithMedia(
      { type: 'project', title: 'Project' },
      [{ slot: 'cover', file: namedBlob('cover.png', 'image/png') }],
      { stateStore, storageAdapter },
    ),
    /transaction aborted/,
  );
  assert.deepEqual(stateStore.getState(), initialState);
});

test('update replaces cover atomically and reports removed media', async () => {
  const card = createNode({
    type: 'project',
    title: 'Old title',
    data: { coverMediaId: 'old-cover' },
  });
  const stateStore = createTestStore({
    cards: { [card.id]: card },
    links: [],
    selectedCardId: card.id,
  });
  let savedBundle = null;
  const storageAdapter = {
    async saveCardBundle(bundle) { savedBundle = bundle; },
  };

  const result = await updateCardWithMedia(
    card.id,
    { title: 'New title' },
    [{ slot: 'cover', file: namedBlob('new.png', 'image/png') }],
    { stateStore, storageAdapter },
  );

  assert.equal(result.card.title, 'New title');
  assert.deepEqual(savedBundle.removedMediaIds, ['old-cover']);
  assert.notEqual(result.card.data.coverMediaId, 'old-cover');
  assert.equal(stateStore.getState().cards[card.id].title, 'New title');
});

test('invalid media kind is rejected before persistence', () => {
  const card = createNode({ type: 'goal', title: 'Goal' });
  assert.throws(
    () => stageCardMedia(card, [
      { slot: 'cover', file: namedBlob('document.pdf', 'application/pdf') },
    ]),
    (error) => error.code === 'UNSUPPORTED_MEDIA_KIND',
  );
});
