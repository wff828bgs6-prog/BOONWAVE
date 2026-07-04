import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode } from '../domain/node.js';
import {
  addProcessStage,
  addProcessTask,
  archiveProcessStage,
  archiveProcessTask,
  moveProcessTask,
  reorderProcessTask,
  restoreProcessStage,
  restoreProcessTask,
  selectProcessStage,
} from '../services/work-process-service.js';

function createTestStore(initialState) {
  let state = structuredClone(initialState);
  return {
    getState() { return state; },
    setState(patch) { state = { ...state, ...patch }; return state; },
  };
}

function setupProcess(data = {}) {
  const process = createNode({
    type: 'process',
    title: 'Рабочий процесс',
    data,
  });
  const stateStore = createTestStore({
    cards: { [process.id]: process },
    links: [],
    selectedCardId: null,
  });
  const saved = [];
  const storageAdapter = {
    async saveCard(card) { saved.push(structuredClone(card)); },
  };
  return { process, stateStore, storageAdapter, saved };
}

test('adds a stage and persists before store commit', async () => {
  const { process, stateStore, storageAdapter, saved } = setupProcess();

  const updated = await addProcessStage(
    process.id,
    { id: 'stage_1', title: 'Проектирование' },
    { stateStore, storageAdapter },
  );

  assert.equal(saved.length, 1);
  assert.equal(updated.data.stages.length, 1);
  assert.equal(updated.data.selectedStageId, 'stage_1');
  assert.equal(stateStore.getState().cards[process.id].data.stages[0].title, 'Проектирование');
});

test('failed persistence leaves store unchanged', async () => {
  const { process, stateStore } = setupProcess();
  const initialState = structuredClone(stateStore.getState());
  const storageAdapter = {
    async saveCard() { throw new Error('write failed'); },
  };

  await assert.rejects(
    addProcessStage(process.id, { title: 'Этап' }, { stateStore, storageAdapter }),
    /write failed/,
  );

  assert.deepEqual(stateStore.getState(), initialState);
});

test('selects only an active stage', async () => {
  const { process, stateStore, storageAdapter } = setupProcess({
    stages: [
      { id: 'active', title: 'Активный', lifecycleStatus: 'active' },
      { id: 'archived', title: 'Архивный', lifecycleStatus: 'archived' },
    ],
  });

  const updated = await selectProcessStage(
    process.id,
    'active',
    { stateStore, storageAdapter },
  );
  assert.equal(updated.data.selectedStageId, 'active');

  await assert.rejects(
    selectProcessStage(process.id, 'archived', { stateStore, storageAdapter }),
    (error) => error.code === 'PROCESS_STAGE_NOT_FOUND',
  );
});

test('adds a task to selected stage and preserves process relation', async () => {
  const { process, stateStore, storageAdapter } = setupProcess({
    selectedStageId: 'stage_1',
    stages: [{ id: 'stage_1', title: 'Производство', lifecycleStatus: 'active' }],
  });

  const updated = await addProcessTask(
    process.id,
    { id: 'task_1', title: 'Собрать корпус' },
    { stateStore, storageAdapter },
  );

  const task = updated.data.tasks[0];
  assert.equal(task.processId, process.id);
  assert.equal(task.stageId, 'stage_1');
  assert.equal(task.order, 0);
});

test('moves a task between stages without losing attachments', async () => {
  const { process, stateStore, storageAdapter } = setupProcess({
    stages: [
      { id: 'stage_1', title: 'Подготовка', lifecycleStatus: 'active' },
      { id: 'stage_2', title: 'Монтаж', lifecycleStatus: 'active' },
    ],
    tasks: [
      { id: 'task_1', title: 'Подготовить файл', stageId: 'stage_1', order: 0, attachmentIds: ['media_1'] },
      { id: 'task_2', title: 'Установить', stageId: 'stage_2', order: 0 },
    ],
  });

  const updated = await moveProcessTask(
    process.id,
    'task_1',
    'stage_2',
    1,
    { stateStore, storageAdapter },
  );

  const moved = updated.data.tasks.find((task) => task.id === 'task_1');
  assert.equal(moved.stageId, 'stage_2');
  assert.equal(moved.order, 1);
  assert.deepEqual(moved.attachmentIds, ['media_1']);
});

test('reorders tasks only inside their stage', async () => {
  const { process, stateStore, storageAdapter } = setupProcess({
    stages: [
      { id: 'stage_1', title: 'Первый', lifecycleStatus: 'active' },
      { id: 'stage_2', title: 'Второй', lifecycleStatus: 'active' },
    ],
    tasks: [
      { id: 'a', title: 'A', stageId: 'stage_1', order: 0 },
      { id: 'b', title: 'B', stageId: 'stage_1', order: 1 },
      { id: 'c', title: 'C', stageId: 'stage_2', order: 0 },
    ],
  });

  const updated = await reorderProcessTask(
    process.id,
    'b',
    0,
    { stateStore, storageAdapter },
  );

  const stageOne = updated.data.tasks
    .filter((task) => task.stageId === 'stage_1')
    .sort((a, b) => a.order - b.order);
  const stageTwo = updated.data.tasks.filter((task) => task.stageId === 'stage_2');

  assert.deepEqual(stageOne.map((task) => task.id), ['b', 'a']);
  assert.deepEqual(stageTwo.map((task) => task.id), ['c']);
});

test('archives and restores stage while selected stage falls back safely', async () => {
  const { process, stateStore, storageAdapter } = setupProcess({
    selectedStageId: 'stage_1',
    stages: [
      { id: 'stage_1', title: 'Первый', lifecycleStatus: 'active' },
      { id: 'stage_2', title: 'Второй', lifecycleStatus: 'active' },
    ],
  });

  const archived = await archiveProcessStage(
    process.id,
    'stage_1',
    { stateStore, storageAdapter },
  );
  assert.equal(archived.data.stages.find((stage) => stage.id === 'stage_1').lifecycleStatus, 'archived');
  assert.equal(archived.data.selectedStageId, 'stage_2');

  const restored = await restoreProcessStage(
    process.id,
    'stage_1',
    { stateStore, storageAdapter },
  );
  assert.equal(restored.data.stages.find((stage) => stage.id === 'stage_1').lifecycleStatus, 'active');
});

test('archives current task and clears focus marker', async () => {
  const { process, stateStore, storageAdapter } = setupProcess({
    stages: [{ id: 'stage_1', title: 'Этап', lifecycleStatus: 'active' }],
    tasks: [{ id: 'task_1', title: 'Задача', stageId: 'stage_1', isCurrent: true }],
  });

  const archived = await archiveProcessTask(
    process.id,
    'task_1',
    { stateStore, storageAdapter },
  );
  const task = archived.data.tasks[0];
  assert.equal(task.lifecycleStatus, 'archived');
  assert.equal(task.isCurrent, false);

  const restored = await restoreProcessTask(
    process.id,
    'task_1',
    { stateStore, storageAdapter },
  );
  assert.equal(restored.data.tasks[0].lifecycleStatus, 'active');
});
