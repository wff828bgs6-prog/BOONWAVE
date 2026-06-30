import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode } from '../domain/node.js';
import { createTask, flattenTasks, validateTask } from '../domain/task.js';

test('task keeps nested subtasks as one tree', () => {
  const task = createTask({
    title: 'Главная задача',
    subtasks: [
      { title: 'Шаг 1', status: 'completed' },
      { title: 'Шаг 2', subtasks: [{ title: 'Подшаг' }] },
    ],
  });
  const flattened = flattenTasks([task]);

  assert.equal(validateTask(task).valid, true);
  assert.equal(flattened.length, 4);
  assert.equal(flattened[0].depth, 0);
  assert.equal(flattened[1].depth, 1);
  assert.equal(flattened[3].depth, 2);
  assert.equal(flattened[3].parentId, flattened[2].id);
});

test('process normalization upgrades legacy task text', () => {
  const process = createNode({
    type: 'process',
    title: 'Рабочий процесс',
    data: {
      tasks: [{ text: 'Собрать документы', completed: false }],
    },
  });

  assert.equal(process.data.tasks.length, 1);
  assert.equal(process.data.tasks[0].title, 'Собрать документы');
  assert.equal(process.data.tasks[0].status, 'planned');
  assert.equal(process.data.tasks[0].subtasks.length, 0);
});
