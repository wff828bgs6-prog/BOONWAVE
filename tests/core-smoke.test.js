import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode, normalizeNode, validateNode } from '../domain/node.js';
import { MIN_ZOOM, BASE_ZOOM, MAX_ZOOM, clampZoom } from '../canvas/camera.js';
import { createLink, deleteLinksBetween } from '../services/link-service.js';

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
