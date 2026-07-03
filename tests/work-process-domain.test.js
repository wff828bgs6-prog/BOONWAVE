import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateProcessProgress,
  calculateStageProgress,
  moveTaskToStage,
  normalizeProcessData,
  normalizeStageList,
  reorderById,
} from '../domain/work-process.js';

test('normalizes stages and selects first active stage', () => {
  const process = normalizeProcessData({
    stages: [
      { id: 's2', title: 'Монтаж', order: 4, lifecycleStatus: 'active' },
      { id: 's1', title: 'Проектирование', order: 2, lifecycleStatus: 'archived' },
    ],
  }, 'process_1');

  assert.deepEqual(process.stages.map((stage) => stage.id), ['s1', 's2']);
  assert.deepEqual(process.stages.map((stage) => stage.order), [0, 1]);
  assert.equal(process.selectedStageId, 's2');
  assert.equal(process.stages[0].processId, 'process_1');
});

test('reorders items and normalizes order', () => {
  const items = normalizeStageList([
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B' },
    { id: 'c', title: 'C' },
  ], 'p1');

  const reordered = reorderById(items, 'c', 0);
  assert.deepEqual(reordered.map((item) => item.id), ['c', 'a', 'b']);
  assert.deepEqual(reordered.map((item) => item.order), [0, 1, 2]);
});

test('moves a task between stages without losing task data', () => {
  const tasks = [
    { id: 't1', stageId: 's1', order: 0, title: 'Первая', attachmentIds: ['m1'] },
    { id: 't2', stageId: 's2', order: 0, title: 'Вторая' },
  ];

  const moved = moveTaskToStage(tasks, 't1', 's2', 1);
  const task = moved.find((item) => item.id === 't1');

  assert.equal(task.stageId, 's2');
  assert.equal(task.order, 1);
  assert.deepEqual(task.attachmentIds, ['m1']);
  assert.deepEqual(
    moved.filter((item) => item.stageId === 's2').sort((a, b) => a.order - b.order).map((item) => item.id),
    ['t2', 't1'],
  );
});

test('calculates stage progress only from active tasks', () => {
  const stage = { id: 's1', progressMode: 'from-tasks', status: 'active' };
  const progress = calculateStageProgress(stage, [
    { id: 't1', stageId: 's1', status: 'completed', lifecycleStatus: 'active' },
    { id: 't2', stageId: 's1', status: 'in_progress', progress: 40, lifecycleStatus: 'active' },
    { id: 't3', stageId: 's1', status: 'completed', lifecycleStatus: 'archived' },
  ]);

  assert.equal(progress, 70);
});

test('uses child process progress for delegated stage', () => {
  const progress = calculateStageProgress({
    id: 's1',
    progressMode: 'from-child-process',
  }, [], 63);

  assert.equal(progress, 63);
});

test('calculates process progress from active stages', () => {
  const progress = calculateProcessProgress([
    { id: 's1', lifecycleStatus: 'active' },
    { id: 's2', lifecycleStatus: 'active' },
    { id: 's3', lifecycleStatus: 'archived' },
  ], {
    s1: 20,
    s2: 80,
    s3: 100,
  });

  assert.equal(progress, 50);
});
