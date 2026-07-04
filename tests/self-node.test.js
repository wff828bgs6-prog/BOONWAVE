import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode } from '../domain/node.js';
import {
  PRIMARY_SELF_NODE_ID,
  PRIMARY_SELF_TITLE,
  ensurePrimarySelfNode,
  buildSelfSummary,
} from '../services/self-node-service.js';
import {
  deleteCardNode,
  SELF_NODE_PROTECTED_ERROR,
} from '../services/node-service.js';

function createTestStore(initialState = {}) {
  let state = {
    cards: {},
    links: [],
    selectedCardId: null,
    ...structuredClone(initialState),
  };
  return {
    getState() { return state; },
    setState(patch) { state = { ...state, ...patch }; return state; },
  };
}

test('Моя вселенная is a valid typed node with profile and storage defaults', () => {
  const card = createNode({ type: 'self' });
  assert.equal(card.type, 'self');
  assert.equal(card.title, PRIMARY_SELF_TITLE);
  assert.equal(card.data.attentionStatus, 'stable');
  assert.deepEqual(card.data.focusItems, []);
  assert.deepEqual(card.data.documents, []);
  assert.deepEqual(card.data.files, []);
});

test('workspace creates exactly one persistent Моя вселенная card', async () => {
  const stateStore = createTestStore({ selectedCardId: 'existing-selection' });
  const saved = [];
  const storageAdapter = {
    async saveCard(card) { saved.push(structuredClone(card)); },
  };

  const first = await ensurePrimarySelfNode({ stateStore, storageAdapter });
  const second = await ensurePrimarySelfNode({ stateStore, storageAdapter });

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.card.id, PRIMARY_SELF_NODE_ID);
  assert.equal(first.card.title, PRIMARY_SELF_TITLE);
  assert.equal(saved.length, 1);
  assert.equal(Object.values(stateStore.getState().cards).filter((card) => card.type === 'self').length, 1);
  assert.equal(stateStore.getState().selectedCardId, 'existing-selection');
});

test('Моя вселенная aggregates goals, projects, processes and attention signals', () => {
  const self = createNode({ type: 'self', data: { currentFocus: 'Подать документы в суд' } });
  const goal = createNode({ type: 'goal', title: 'Безопасный выезд', data: { progress: 40 } });
  const project = createNode({
    type: 'project',
    title: 'Документы в суд',
    data: { priority: 'high', status: 'in_progress' },
  });
  const process = createNode({
    type: 'process',
    title: 'Подготовка заявления',
    data: { status: 'in_progress', dueDate: '2026-01-01', tasks: [] },
  });
  const state = {
    cards: {
      [self.id]: self,
      [goal.id]: goal,
      [project.id]: project,
      [process.id]: process,
    },
    links: [],
  };

  const summary = buildSelfSummary(state, new Date('2026-06-30T12:00:00Z'));
  assert.equal(summary.activeGoals, 1);
  assert.equal(summary.activeProjects, 1);
  assert.equal(summary.activeProcesses, 1);
  assert.equal(summary.overdueProcesses, 1);
  assert.equal(summary.averageGoalProgress, 40);
  assert.equal(summary.nextAction, 'Подать документы в суд');
  assert.match(summary.attentionItems.join('\n'), /Просрочен процесс/);
  assert.match(summary.attentionItems.join('\n'), /Высокий приоритет/);
});

test('Моя вселенная cannot be deleted', async () => {
  const self = createNode({ type: 'self' });
  const stateStore = createTestStore({
    cards: { [self.id]: self },
    selectedCardId: self.id,
  });

  await assert.rejects(
    deleteCardNode(self.id, { stateStore, storageAdapter: {} }),
    (error) => error.code === SELF_NODE_PROTECTED_ERROR,
  );
  assert.equal(stateStore.getState().cards[self.id].type, 'self');
});
