import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode } from '../domain/node.js';
import { createLinkRecord, LINK_SCHEMA_VERSION } from '../domain/link.js';
import { createLink } from '../services/link-service.js';
import { migrateStoredLinks } from '../services/data-migration-service.js';

function createStore(initialState) {
  let state = structuredClone(initialState);
  return {
    getState: () => state,
    setState(patch) { state = { ...state, ...patch }; return state; },
  };
}

test('core relations infer type and canonical direction', () => {
  const self = createNode({ type: 'self' });
  const goal = createNode({ type: 'goal' });
  const project = createNode({ type: 'project' });
  const process = createNode({ type: 'process' });
  const cards = Object.fromEntries([self, goal, project, process].map((card) => [card.id, card]));

  const selfGoal = createLinkRecord({ sourceId: goal.id, targetId: self.id }, cards);
  const goalProject = createLinkRecord({ sourceId: project.id, targetId: goal.id }, cards);
  const projectProcess = createLinkRecord({ sourceId: process.id, targetId: project.id }, cards);

  assert.deepEqual([selfGoal.sourceId, selfGoal.targetId, selfGoal.type], [self.id, goal.id, 'self_goal']);
  assert.deepEqual([goalProject.sourceId, goalProject.targetId, goalProject.type], [goal.id, project.id, 'goal_project']);
  assert.deepEqual([projectProcess.sourceId, projectProcess.targetId, projectProcess.type], [project.id, process.id, 'project_process']);
});

test('legacy link migrates without losing its id', async () => {
  const goal = createNode({ type: 'goal' });
  const project = createNode({ type: 'project' });
  const legacy = { id: 'legacy-link', sourceId: project.id, targetId: goal.id };
  const store = createStore({ cards: { [goal.id]: goal, [project.id]: project }, links: [legacy] });
  const saved = [];

  const result = await migrateStoredLinks({
    stateStore: store,
    storageAdapter: { async saveLink(link) { saved.push(link); } },
  });
  const migrated = store.getState().links[0];

  assert.equal(result.migrated, 1);
  assert.equal(saved.length, 1);
  assert.equal(migrated.id, 'legacy-link');
  assert.equal(migrated.schemaVersion, LINK_SCHEMA_VERSION);
  assert.equal(migrated.type, 'goal_project');
  assert.equal(migrated.sourceId, goal.id);
});

test('service prevents duplicate semantic relations', async () => {
  const goal = createNode({ type: 'goal' });
  const project = createNode({ type: 'project' });
  const store = createStore({
    cards: { [goal.id]: goal, [project.id]: project },
    links: [],
    selectedCardId: null,
  });
  const saved = [];
  const storageAdapter = { async saveLink(link) { saved.push(link); } };

  const first = await createLink(project.id, goal.id, { stateStore: store, storageAdapter });
  const duplicate = await createLink(goal.id, project.id, { stateStore: store, storageAdapter });

  assert.equal(first.type, 'goal_project');
  assert.equal(duplicate.id, first.id);
  assert.equal(store.getState().links.length, 1);
  assert.equal(saved.length, 1);
});
