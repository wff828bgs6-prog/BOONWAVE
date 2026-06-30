import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createNode, normalizeNodeView } from '../domain/node.js';
import { updateCardView } from '../services/card-view-service.js';

function createStore(initialState) {
  let state = structuredClone(initialState);
  return {
    getState: () => state,
    setState(patch) {
      state = { ...state, ...patch };
      return state;
    },
  };
}

test('display settings save mode and visible sections per card', async () => {
  const card = createNode({ type: 'project', title: 'Configured project' });
  const stateStore = createStore({ cards: { [card.id]: card } });
  const storageAdapter = { async saveCard() {} };

  const updated = await updateCardView(card.id, {
    mode: 'compact',
    visible: { compact: { description: true, progress: true } },
  }, { stateStore, storageAdapter });

  assert.equal(updated.view.mode, 'compact');
  assert.equal(updated.view.visible.compact.description, true);
  assert.equal(updated.view.visible.compact.progress, true);
  assert.equal(updated.view.visible.standard.title, true);
});

test('legacy full mode migrates to standard thumbnail mode', () => {
  assert.equal(normalizeNodeView({ mode: 'full' }).mode, 'standard');
});

test('workspace cards no longer include an external eye control', () => {
  const workspace = readFileSync('controllers/workspace-controller.js', 'utf8');
  assert.equal(workspace.includes('card-view-button'), false);
  assert.equal(workspace.includes('cycleCardView'), false);
});
