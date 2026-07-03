import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode } from '../domain/node.js';
import {
  addProcessExpense,
  updateProcessExpense,
  archiveProcessExpense,
  restoreProcessExpense,
  addProcessParticipant,
  updateProcessParticipant,
  removeProcessParticipant,
  assignProcessMedia,
  unassignProcessMedia,
} from '../services/work-process-resource-service.js';

function createTestStore(initialState) {
  let state = structuredClone(initialState);
  return {
    getState() { return state; },
    setState(patch) { state = { ...state, ...patch }; return state; },
  };
}

function setup() {
  const person = createNode({ type: 'person', title: 'Исполнитель', data: { fullName: 'Иван' } });
  const process = createNode({
    type: 'process',
    title: 'Процесс',
    data: {
      projectId: 'project_1',
      selectedStageId: 'stage_1',
      stages: [{ id: 'stage_1', title: 'Этап', lifecycleStatus: 'active' }],
      tasks: [{ id: 'task_1', title: 'Задача', stageId: 'stage_1' }],
    },
  });
  const stateStore = createTestStore({
    cards: { [process.id]: process, [person.id]: person },
    links: [],
    selectedCardId: null,
  });
  const saved = [];
  const storageAdapter = { async saveCard(card) { saved.push(structuredClone(card)); } };
  return { person, process, stateStore, storageAdapter, saved };
}

test('adds updates archives and restores expense', async () => {
  const { process, stateStore, storageAdapter } = setup();
  let updated = await addProcessExpense(process.id, {
    id: 'expense_1', title: 'Материал', amount: 1200,
  }, { stateStore, storageAdapter });
  assert.equal(updated.data.expenses[0].stageId, 'stage_1');
  assert.equal(updated.data.expenses[0].amount, 1200);

  updated = await updateProcessExpense(process.id, 'expense_1', { amount: 1500 }, { stateStore, storageAdapter });
  assert.equal(updated.data.expenses[0].amount, 1500);

  updated = await archiveProcessExpense(process.id, 'expense_1', { stateStore, storageAdapter });
  assert.equal(updated.data.expenses[0].lifecycleStatus, 'archived');

  updated = await restoreProcessExpense(process.id, 'expense_1', { stateStore, storageAdapter });
  assert.equal(updated.data.expenses[0].lifecycleStatus, 'active');
});

test('rejects invalid expense before persistence', async () => {
  const { process, stateStore, storageAdapter, saved } = setup();
  await assert.rejects(
    addProcessExpense(process.id, { amount: -1 }, { stateStore, storageAdapter }),
    /non-negative/,
  );
  assert.equal(saved.length, 0);
});

test('adds updates and completes participant from BOONWAVE contacts', async () => {
  const { person, process, stateStore, storageAdapter } = setup();
  let updated = await addProcessParticipant(process.id, person.id, {
    id: 'participant_1', role: 'Монтажник', stageIds: ['stage_1'],
  }, { stateStore, storageAdapter });
  assert.equal(updated.data.participants[0].personId, person.id);

  updated = await updateProcessParticipant(process.id, 'participant_1', {
    responsibility: 'Монтаж корпуса',
  }, { stateStore, storageAdapter });
  assert.equal(updated.data.participants[0].responsibility, 'Монтаж корпуса');

  updated = await removeProcessParticipant(process.id, 'participant_1', { stateStore, storageAdapter });
  assert.equal(updated.data.participants[0].participationStatus, 'completed');
});

test('prevents duplicate active participant', async () => {
  const { person, process, stateStore, storageAdapter } = setup();
  await addProcessParticipant(process.id, person.id, {}, { stateStore, storageAdapter });
  await assert.rejects(
    addProcessParticipant(process.id, person.id, {}, { stateStore, storageAdapter }),
    /already an active participant/,
  );
});

test('assigns one project media reference and unassigns without deleting original', async () => {
  const { process, stateStore, storageAdapter } = setup();
  let updated = await assignProcessMedia(
    process.id,
    { stageId: 'stage_1', taskId: 'task_1' },
    'media_1',
    { id: 'assignment_1', purpose: 'Чертёж' },
    { stateStore, storageAdapter },
  );
  assert.equal(updated.data.mediaAssignments.length, 1);
  assert.equal(updated.data.mediaAssignments[0].projectId, 'project_1');

  updated = await assignProcessMedia(
    process.id,
    { stageId: 'stage_1', taskId: 'task_1' },
    'media_1',
    {},
    { stateStore, storageAdapter },
  );
  assert.equal(updated.data.mediaAssignments.length, 1);

  updated = await unassignProcessMedia(process.id, 'assignment_1', { stateStore, storageAdapter });
  assert.equal(updated.data.mediaAssignments.length, 0);
});

test('storage failure does not mutate store', async () => {
  const { process, stateStore } = setup();
  const initial = structuredClone(stateStore.getState());
  const storageAdapter = { async saveCard() { throw new Error('write failed'); } };

  await assert.rejects(
    addProcessExpense(process.id, { amount: 100 }, { stateStore, storageAdapter }),
    /write failed/,
  );
  assert.deepEqual(stateStore.getState(), initial);
});
