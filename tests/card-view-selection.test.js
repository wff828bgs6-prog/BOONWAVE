import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode } from '../domain/node.js';
import { cycleCardView } from '../services/card-view-service.js';

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

test('eye control selects the card before cycling its view', async () => {
  const card = createNode({ type: 'project', title: 'Raised project' });
  const stateStore = createStore({ cards: { [card.id]: card }, selectedCardId: null });
  const saved = [];
  const storageAdapter = {
    async saveCard(nextCard) {
      saved.push(structuredClone(nextCard));
    },
  };

  const updated = await cycleCardView(card.id, { stateStore, storageAdapter });

  assert.equal(stateStore.getState().selectedCardId, card.id);
  assert.equal(updated.view.mode, 'standard');
  assert.equal(saved.length, 1);
});

test('selected cards render above neighbouring cards', () => {
  const styles = require('node:fs').readFileSync('styles/production-shell.css', 'utf8');
  assert.match(styles, /\.card\[data-selected="true"\]\{z-index:12;/);
});
