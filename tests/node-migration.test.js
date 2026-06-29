import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode, NODE_SCHEMA_VERSION } from '../domain/node.js';
import {
  migrateStoredNodes,
  needsNodeMigration,
} from '../services/data-migration-service.js';

function createTestStore(initialState) {
  let state = structuredClone(initialState);
  return {
    getState() { return state; },
    setState(patch) { state = { ...state, ...patch }; return state; },
  };
}

test('legacy single-cover card migrates into compact and working profiles', async () => {
  const legacy = createNode({ type: 'idea', title: 'Legacy idea' });
  legacy.schemaVersion = 2;
  legacy.view = {
    mode: 'compact',
    compactLabel: 'Идея',
    cover: {
      shape: 'portrait',
      scale: 1.7,
      positionX: 25,
      positionY: 70,
    },
  };

  const stateStore = createTestStore({
    cards: { [legacy.id]: legacy },
    links: [],
    selectedCardId: legacy.id,
  });
  const saved = [];
  const storageAdapter = {
    async saveCard(card) { saved.push(structuredClone(card)); },
  };

  const result = await migrateStoredNodes({ stateStore, storageAdapter });
  const migrated = stateStore.getState().cards[legacy.id];

  assert.equal(result.migrated, 1);
  assert.equal(saved.length, 1);
  assert.equal(migrated.schemaVersion, NODE_SCHEMA_VERSION);
  assert.deepEqual(migrated.view.coverFrames.compact, {
    shape: 'portrait', scale: 1.7, positionX: 25, positionY: 70,
  });
  assert.deepEqual(migrated.view.coverFrames.working, migrated.view.coverFrames.compact);
  assert.equal('cover' in migrated.view, false);
});

test('current card with both cover profiles is not rewritten', async () => {
  const current = createNode({ type: 'project', title: 'Current' });
  const stateStore = createTestStore({
    cards: { [current.id]: current },
    links: [],
    selectedCardId: null,
  });
  let saves = 0;
  const storageAdapter = {
    async saveCard() { saves += 1; },
  };

  assert.equal(needsNodeMigration(current), false);
  const result = await migrateStoredNodes({ stateStore, storageAdapter });
  assert.equal(result.migrated, 0);
  assert.equal(saves, 0);
});

test('failed migration does not publish partially migrated store state', async () => {
  const legacy = createNode({ type: 'goal', title: 'Legacy goal' });
  legacy.schemaVersion = 2;
  delete legacy.view.coverFrames;
  const initialState = {
    cards: { [legacy.id]: legacy },
    links: [],
    selectedCardId: legacy.id,
  };
  const stateStore = createTestStore(initialState);
  const storageAdapter = {
    async saveCard() { throw new Error('migration write failed'); },
  };

  await assert.rejects(
    migrateStoredNodes({ stateStore, storageAdapter }),
    /migration write failed/,
  );
  assert.deepEqual(stateStore.getState(), initialState);
});
