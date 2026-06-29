import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode, normalizeNode, validateNode } from '../domain/node.js';
import { NODE_TYPES } from '../domain/node-schemas.js';
import { MIN_ZOOM, BASE_ZOOM, MAX_ZOOM, clampZoom } from '../canvas/camera.js';
import { createLink, deleteLinksBetween } from '../services/link-service.js';
import { createCardNode, updateCardNode, deleteCardNode } from '../services/node-service.js';

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

test('core modules load and create a valid typed node', () => {
  const node = createNode({
    type: 'project',
    title: 'Test project',
    x: 10.4,
    y: 20.6,
  });

  assert.equal(node.type, 'project');
  assert.equal(node.title, 'Test project');
  assert.equal(node.x, 10);
  assert.equal(node.y, 21);
  assert.equal(validateNode(node).valid, true);
});

test('all supported node types receive valid defaults', () => {
  for (const type of NODE_TYPES) {
    const node = createNode({ type, title: `Test ${type}` });
    assert.equal(node.type, type);
    assert.equal(validateNode(node).valid, true);
    assert.equal(typeof node.data, 'object');
  }
});

test('node normalization restores defaults and rejects unsupported types', () => {
  const node = normalizeNode({
    id: 'goal_test',
    type: 'goal',
    title: 'Goal',
    x: 0,
    y: 0,
    data: { progress: 42 },
  });

  assert.equal(node.data.progress, 42);
  assert.equal(node.data.status, 'active');
  assert.throws(() => createNode({ type: 'unknown' }), /Unsupported BOONWAVE node type/);
});

test('zoom limits keep the working scale centered and bounded', () => {
  assert.equal(MIN_ZOOM, 0.35);
  assert.equal(BASE_ZOOM, 0.85);
  assert.equal(MAX_ZOOM, 1.35);
  assert.equal(clampZoom(-10), MIN_ZOOM);
  assert.equal(clampZoom(BASE_ZOOM), BASE_ZOOM);
  assert.equal(clampZoom(10), MAX_ZOOM);
});

test('node service creates and updates a card only after persistence succeeds', async () => {
  const stateStore = createTestStore({ cards: {}, links: [], selectedCardId: null });
  const saved = [];
  const storageAdapter = {
    async saveCard(card) {
      saved.push(structuredClone(card));
    },
  };

  const created = await createCardNode(
    { type: 'goal', title: 'Launch', data: { progress: 10 } },
    { stateStore, storageAdapter },
  );
  const updated = await updateCardNode(
    created.id,
    { title: 'Launch BOONWAVE', data: { progress: 55 } },
    { stateStore, storageAdapter },
  );

  assert.equal(saved.length, 2);
  assert.equal(updated.title, 'Launch BOONWAVE');
  assert.equal(updated.data.progress, 55);
  assert.equal(updated.data.status, 'active');
  assert.equal(stateStore.getState().cards[created.id].title, 'Launch BOONWAVE');
});

test('failed persistence does not partially mutate card state', async () => {
  const card = createNode({ type: 'idea', title: 'Stable idea' });
  const stateStore = createTestStore({
    cards: { [card.id]: card },
    links: [],
    selectedCardId: null,
  });
  const storageAdapter = {
    async saveCard() {
      throw new Error('disk unavailable');
    },
  };

  await assert.rejects(
    updateCardNode(card.id, { title: 'Broken update' }, { stateStore, storageAdapter }),
    /disk unavailable/,
  );
  assert.equal(stateStore.getState().cards[card.id].title, 'Stable idea');
});

test('link service creates one link and does not duplicate it', async () => {
  const stateStore = createTestStore({
    cards: {
      first: { id: 'first' },
      second: { id: 'second' },
    },
    links: [],
    selectedCardId: null,
  });
  const saved = [];
  const storageAdapter = {
    async saveLink(link) {
      saved.push(link);
    },
    async deleteLink() {},
  };

  const first = await createLink('first', 'second', { stateStore, storageAdapter });
  const duplicate = await createLink('first', 'second', { stateStore, storageAdapter });

  assert.equal(stateStore.getState().links.length, 1);
  assert.equal(saved.length, 1);
  assert.equal(duplicate.id, first.id);
  assert.equal(stateStore.getState().selectedCardId, 'second');
});

test('link service deletes links in either direction', async () => {
  const stateStore = createTestStore({
    cards: {
      first: { id: 'first' },
      second: { id: 'second' },
    },
    links: [
      { id: 'a', sourceId: 'first', targetId: 'second' },
      { id: 'b', sourceId: 'second', targetId: 'first' },
      { id: 'c', sourceId: 'first', targetId: 'other' },
    ],
    selectedCardId: null,
  });
  const deleted = [];
  const storageAdapter = {
    async saveLink() {},
    async deleteLink(id) {
      deleted.push(id);
    },
  };

  const removed = await deleteLinksBetween('first', 'second', { stateStore, storageAdapter });

  assert.equal(removed.length, 2);
  assert.deepEqual(new Set(deleted), new Set(['a', 'b']));
  assert.deepEqual(stateStore.getState().links.map((link) => link.id), ['c']);
});

test('card deletion removes related links atomically from state', async () => {
  const card = createNode({ type: 'person', title: 'Alex' });
  const other = createNode({ type: 'project', title: 'Project' });
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
    async deleteCardWithLinks(cardId, linkIds) {
      calls.push({ cardId, linkIds });
    },
  };

  const result = await deleteCardNode(card.id, { stateStore, storageAdapter });

  assert.equal(result.card.id, card.id);
  assert.deepEqual(result.deletedLinks.map((link) => link.id), ['related']);
  assert.deepEqual(calls, [{ cardId: card.id, linkIds: ['related'] }]);
  assert.equal(stateStore.getState().cards[card.id], undefined);
  assert.deepEqual(stateStore.getState().links.map((link) => link.id), ['unrelated']);
  assert.equal(stateStore.getState().selectedCardId, null);
});

test('failed cascade deletion leaves store untouched', async () => {
  const card = createNode({ type: 'process', title: 'Process' });
  const initialState = {
    cards: { [card.id]: card },
    links: [{ id: 'related', sourceId: card.id, targetId: 'other' }],
    selectedCardId: card.id,
  };
  const stateStore = createTestStore(initialState);
  const storageAdapter = {
    async deleteCardWithLinks() {
      throw new Error('transaction aborted');
    },
  };

  await assert.rejects(
    deleteCardNode(card.id, { stateStore, storageAdapter }),
    /transaction aborted/,
  );
  assert.deepEqual(stateStore.getState(), initialState);
});
