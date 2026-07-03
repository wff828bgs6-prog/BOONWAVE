import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode } from '../domain/node.js';
import { presentWorkProcess } from '../ui/work-process-presenter.js';

function createProcess(data = {}) {
  return createNode({
    type: 'process',
    title: 'Производство объекта',
    description: 'Рабочий процесс',
    data,
  });
}

test('presents a compact process summary for selected stage mode', () => {
  const process = createProcess({
    budget: 100000,
    selectedStageId: 'stage_1',
    taskViewMode: 'selected-stage',
    expenseViewMode: 'selected-stage',
    stages: [
      { id: 'stage_1', title: 'Проектирование', order: 0, lifecycleStatus: 'active', dueDate: '2026-07-10' },
      { id: 'stage_2', title: 'Монтаж', order: 1, lifecycleStatus: 'active', dueDate: '2026-07-20' },
    ],
    tasks: [
      { id: 'task_1', title: 'Чертежи', stageId: 'stage_1', order: 0, status: 'completed' },
      { id: 'task_2', title: 'Раскрой', stageId: 'stage_2', order: 0, status: 'planned' },
    ],
    expenses: [
      { id: 'expense_1', title: 'Материал', stageId: 'stage_1', amount: 20000, currency: 'RUB', lifecycleStatus: 'active' },
      { id: 'expense_2', title: 'Монтаж', stageId: 'stage_2', amount: 10000, currency: 'RUB', lifecycleStatus: 'active' },
    ],
  });

  const view = presentWorkProcess(process);

  assert.equal(view.selectedStageId, 'stage_1');
  assert.equal(view.tasks.length, 1);
  assert.equal(view.tasks[0].id, 'task_1');
  assert.equal(view.expenses.length, 1);
  assert.equal(view.summary.stageCount, 2);
  assert.equal(view.summary.taskCount, 2);
  assert.equal(view.summary.expenses, 30000);
  assert.equal(view.summary.balance, 70000);
  assert.equal(view.summary.nearestDeadlineLabel, '10.07.2026');
});

test('all mode returns tasks and expenses from every active stage', () => {
  const process = createProcess({
    selectedStageId: 'stage_1',
    taskViewMode: 'all',
    expenseViewMode: 'all',
    stages: [
      { id: 'stage_1', title: 'Первый', lifecycleStatus: 'active' },
      { id: 'stage_2', title: 'Второй', lifecycleStatus: 'active' },
    ],
    tasks: [
      { id: 'task_1', title: 'A', stageId: 'stage_1' },
      { id: 'task_2', title: 'B', stageId: 'stage_2' },
      { id: 'task_3', title: 'Архив', stageId: 'stage_1', lifecycleStatus: 'archived' },
    ],
    expenses: [
      { id: 'expense_1', title: 'A', stageId: 'stage_1', amount: 10 },
      { id: 'expense_2', title: 'B', stageId: 'stage_2', amount: 20 },
    ],
  });

  const view = presentWorkProcess(process);

  assert.deepEqual(view.tasks.map((task) => task.id), ['task_1', 'task_2']);
  assert.deepEqual(view.expenses.map((expense) => expense.id), ['expense_1', 'expense_2']);
});

test('presents participants through person cards and counts unique people', () => {
  const process = createProcess({
    participants: [
      { id: 'participant_1', personId: 'person_1', role: 'Инженер', participationStatus: 'active' },
      { id: 'participant_2', personId: 'person_1', role: 'Авторский надзор', participationStatus: 'active' },
      { id: 'participant_3', personId: 'person_2', role: 'Монтажник', participationStatus: 'completed' },
    ],
  });
  const person = createNode({
    type: 'person',
    title: 'Алексей',
    data: { fullName: 'Алексей Воблаго' },
  });
  person.id = 'person_1';

  const view = presentWorkProcess(process, {
    cardsById: { person_1: person },
  });

  assert.equal(view.summary.participantCount, 1);
  assert.equal(view.participants.length, 2);
  assert.equal(view.participants[0].name, 'Алексей Воблаго');
});

test('presents material assignments without duplicating original files', () => {
  const process = createProcess({
    mediaAssignments: [
      { id: 'assignment_1', mediaId: 'media_1', processId: 'process_1', purpose: 'Смета', order: 0 },
      { id: 'assignment_2', mediaId: 'missing', processId: 'process_1', purpose: 'Фото', order: 1 },
    ],
  });

  const view = presentWorkProcess(process, {
    mediaById: {
      media_1: { id: 'media_1', name: 'Смета.pdf', mimeType: 'application/pdf', size: 1024 },
    },
  });

  assert.equal(view.materials[0].name, 'Смета.pdf');
  assert.equal(view.materials[0].isAvailable, true);
  assert.equal(view.materials[1].isAvailable, false);
  assert.equal(view.materials[1].mediaId, 'missing');
});

test('uses child process progress for delegated stage', () => {
  const process = createProcess({
    stages: [
      {
        id: 'stage_1',
        title: 'Производство',
        lifecycleStatus: 'active',
        progressMode: 'from-child-process',
        childProcessId: 'child_1',
      },
    ],
  });

  const view = presentWorkProcess(process, {
    cardsById: {
      child_1: { id: 'child_1', type: 'process', data: { progress: 64 } },
    },
  });

  assert.equal(view.stages[0].progress, 64);
  assert.equal(view.summary.progress, 64);
});

test('returns explicit empty states for a new process', () => {
  const view = presentWorkProcess(createProcess());

  assert.equal(view.selectedStage, null);
  assert.deepEqual(view.emptyStates, {
    stages: true,
    tasks: true,
    expenses: true,
    participants: true,
    materials: true,
  });
});

test('rejects non-process cards', () => {
  const project = createNode({ type: 'project', title: 'Проект' });
  assert.throws(() => presentWorkProcess(project), /requires a process card/);
});
