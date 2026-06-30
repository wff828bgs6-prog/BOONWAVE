import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode, normalizeNodeView } from '../domain/node.js';
import { setCoverFraming, updateCardView } from '../services/card-view-service.js';

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
  for (const mode of ['compact', 'working']) {
    assert.equal(view.coverFrames[mode].shape, 'rounded-square');
    assert.equal(view.coverFrames[mode].scale, 1);
    assert.equal(view.coverFrames[mode].positionX, 50);
    assert.equal(view.coverFrames[mode].positionY, 50);
  }
  assert.equal(view.visible.compact.cover, true);
  assert.equal(view.visible.compact.description, false);
  assert.equal(view.visible.standard.description, true);
});

test('legacy single cover settings migrate to both modes', () => {
  const view = normalizeNodeView({
    cover: { shape: 'portrait', scale: 1.8, positionX: 30, positionY: 70 },
  });
  assert.deepEqual(view.coverFrames.compact, view.coverFrames.working);
  assert.equal(view.coverFrames.compact.shape, 'portrait');
});

test('legacy full workspace mode becomes standard', () => {
  assert.equal(normalizeNodeView({ mode: 'full' }).mode, 'standard');
});

test('compact cover framing is clamped without changing working frame', async () => {
  const card = createNode({ type: 'goal', title: 'Goal' });
  const stateStore = createTestStore({ cards: { [card.id]: card }, links: [], selectedCardId: card.id });
  const saved = [];
  const storageAdapter = { async saveCard(value) { saved.push(structuredClone(value)); } };

  const updated = await setCoverFraming(card.id, 'compact', {
    shape: 'circle', scale: 9, positionX: -20, positionY: 140,
  }, { stateStore, storageAdapter });

  assert.equal(updated.view.coverFrames.compact.shape, 'circle');
  assert.equal(updated.view.coverFrames.compact.scale, 3);
  assert.equal(updated.view.coverFrames.compact.positionX, 0);
  assert.equal(updated.view.coverFrames.compact.positionY, 100);
  assert.deepEqual(updated.view.coverFrames.working, card.view.coverFrames.working);
  assert.equal(saved.length, 1);
});

test('partial view update preserves cover frames and other visibility settings', async () => {
  const card = createNode({
    type: 'project',
    title: 'Project',
    view: {
      mode: 'compact',
      coverFrames: {
        compact: { shape: 'circle', scale: 1.4, positionX: 20, positionY: 40 },
        working: { shape: 'landscape', scale: 2.1, positionX: 65, positionY: 35 },
      },
      visible: {
        compact: { description: true },
      },
    },
  });
  const stateStore = createTestStore({ cards: { [card.id]: card }, links: [], selectedCardId: null });
  const storageAdapter = { async saveCard() {} };

  const updated = await updateCardView(card.id, {
    mode: 'standard',
    visible: { standard: { meta: false } },
  }, { stateStore, storageAdapter });

  assert.equal(updated.view.mode, 'standard');
  assert.deepEqual(updated.view.coverFrames, card.view.coverFrames);
  assert.equal(updated.view.visible.compact.description, true);
  assert.equal(updated.view.visible.standard.meta, false);
});
