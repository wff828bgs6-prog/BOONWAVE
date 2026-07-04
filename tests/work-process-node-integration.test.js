import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode, normalizeNode, NODE_SCHEMA_VERSION } from '../domain/node.js';

test('new process node receives work process defaults', () => {
  const process = createNode({ type: 'process', title: 'Производство' });

  assert.equal(process.schemaVersion, NODE_SCHEMA_VERSION);
  assert.equal(process.data.progressMode, 'from-stages');
  assert.equal(process.data.taskViewMode, 'selected-stage');
  assert.equal(process.data.expenseViewMode, 'selected-stage');
  assert.deepEqual(process.data.stages, []);
  assert.deepEqual(process.data.expenses, []);
  assert.deepEqual(process.data.participants, []);
  assert.deepEqual(process.data.mediaAssignments, []);
});

test('legacy process tasks are upgraded without data loss', () => {
  const process = normalizeNode({
    id: 'process_legacy',
    type: 'process',
    title: 'Старый процесс',
    x: 10,
    y: 20,
    width: 230,
    height: 138,
    data: {
      progress: 25,
      tasks: [{
        id: 'task_1',
        text: 'Согласовать образец',
        completed: false,
        attachmentIds: ['media_1'],
      }],
    },
  });

  assert.equal(process.data.tasks.length, 1);
  assert.equal(process.data.tasks[0].title, 'Согласовать образец');
  assert.equal(process.data.tasks[0].processId, 'process_legacy');
  assert.equal(process.data.tasks[0].lifecycleStatus, 'active');
  assert.equal(process.data.tasks[0].order, 0);
  assert.deepEqual(process.data.tasks[0].attachmentIds, ['media_1']);
  assert.equal(process.data.progress, 25);
});

test('process normalization keeps selected active stage and task stage assignment', () => {
  const process = normalizeNode({
    id: 'process_1',
    type: 'process',
    title: 'Монтаж',
    x: 0,
    y: 0,
    width: 230,
    height: 138,
    data: {
      selectedStageId: 'stage_2',
      stages: [
        { id: 'stage_1', title: 'Подготовка', lifecycleStatus: 'archived' },
        { id: 'stage_2', title: 'Монтаж', lifecycleStatus: 'active' },
      ],
      tasks: [
        { id: 'task_1', title: 'Установить корпус', stageId: 'stage_2' },
      ],
    },
  });

  assert.equal(process.data.selectedStageId, 'stage_2');
  assert.equal(process.data.tasks[0].processId, 'process_1');
  assert.equal(process.data.tasks[0].stageId, 'stage_2');
});

test('invalid selected stage falls back to first active stage', () => {
  const process = normalizeNode({
    id: 'process_2',
    type: 'process',
    title: 'Проектирование',
    x: 0,
    y: 0,
    width: 230,
    height: 138,
    data: {
      selectedStageId: 'missing',
      stages: [
        { id: 'stage_archived', title: 'Архив', lifecycleStatus: 'archived' },
        { id: 'stage_active', title: 'Работа', lifecycleStatus: 'active' },
      ],
    },
  });

  assert.equal(process.data.selectedStageId, 'stage_active');
});
