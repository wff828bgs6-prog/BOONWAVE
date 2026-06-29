import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode, normalizeNodeView } from '../domain/node.js';
import { getNextCardViewMode, setCoverFraming, updateCardView } from '../services/card-view-service.js';

function createTestStore(initialState) {
  let state = structuredClone(initialState);
  return {
    getState() { return state; },
    setState(patch) { state = { ...state, ...patch }; return state; },
  };
}

test('old cards receive safe standard view defaults', () => {
  const view = normalizeNodeView();
  assert.equal(view.mode, 'standard');
  assert.equal(view.cover.shape, 'rounded-square');
  assert.equal(view.cover.scale, 1);
  assert.equal(view.cover.positionX, 50);
  assert.equal(view.cover.positionY, 50);
});

test('card view cycles compact, standard and full', () => {
  assert.equal(getNextCardViewMode('compact'), 'standard');
  assert.equal(getNextCardViewMode('standard'), 'full');
  assert.equal(getNextCardViewMode('full'), 'compact');
});

test('cover framing is clamped and persisted', async () => {
  const card = createNode({ type: 'goal', title: 'Goal' });
  const stateStore = createTestStore({ cards: { [card.id]: card }, links: [], selectedCardId: card.id });
  const saved = [];
  const storageAdapter = { async saveCard(value) { saved.push(structuredClone(value)); } };

  const updated = await setCoverFraming(card.id, {
    shape: 'circle', scale: 9, positionX: -20, positionY: 140,
  }, { stateStore, storageAdapter });

  assert.equal(updated.view.cover.shape, 'circle');
  assert.equal(updated.view.cover.scale, 3);
  assert.equal(updated.view.cover.positionX, 0);
  assert.equal(updated.view.cover.positionY, 100);
  assert.equal(saved.length, 1);
});

test('partial view update preserves existing framing', async () => {
  const card = createNode({
    type: 'project',
    title: 'Project',
    view: { mode: 'compact', cover: { shape: 'portrait', scale: 1.8, positionX: 30, positionY: 70 } },
  });
  const stateStore = createTestStore({ cards: { [card.id]: card }, links: [], selectedCardId: null });
  const storageAdapter = { async saveCard() {} };

  const updated = await updateCardView(card.id, { mode: 'full' }, { stateStore, storageAdapter });

  assert.equal(updated.view.mode, 'full');
  assert.deepEqual(updated.view.cover, card.view.cover);
});
