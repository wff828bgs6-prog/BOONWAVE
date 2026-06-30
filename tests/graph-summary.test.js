import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode } from '../domain/node.js';
import { createLinkRecord } from '../domain/link.js';
import {
  buildProcessSummary,
  buildProjectSummary,
  buildGoalSummary,
  buildSelfHierarchy,
} from '../services/graph-summary-service.js';
import { buildSelfSummary } from '../services/self-node-service.js';

function makeHierarchy() {
  const self = createNode({ type: 'self', title: 'Я Есмь' });
  const goal = createNode({ type: 'goal', title: 'Главная цель', data: { progress: 10 } });
  const project = createNode({
    type: 'project',
    title: 'Основной проект',
    data: { status: 'in_progress' },
  });
  const process = createNode({
    type: 'process',
    title: 'Рабочий процесс',
    data: {
      status: 'in_progress',
      progress: 50,
      dueDate: '2026-07-15',
      tasks: [
        { title: 'Готово', status: 'completed' },
        { title: 'Следующий шаг', status: 'in_progress' },
      ],
    },
  });
  const cards = Object.fromEntries([self, goal, project, process].map((card) => [card.id, card]));
  const links = [
    createLinkRecord({ sourceId: self.id, targetId: goal.id }, cards),
    createLinkRecord({ sourceId: goal.id, targetId: project.id }, cards),
    createLinkRecord({ sourceId: project.id, targetId: process.id }, cards),
  ];
  return { self, goal, project, process, cards, links };
}

test('process status propagates through project and goal', () => {
  const { goal, project, process, cards, links } = makeHierarchy();
  const state = { cards, links };
  const now = new Date('2026-06-30T00:00:00Z');

  const processSummary = buildProcessSummary(process, state, now);
  const projectSummary = buildProjectSummary(project, state, now);
  const goalSummary = buildGoalSummary(goal, state, now);

  assert.equal(processSummary.tasksTotal, 2);
  assert.equal(processSummary.tasksCompleted, 1);
  assert.equal(processSummary.nextAction, 'Следующий шаг');
  assert.equal(projectSummary.processes.length, 1);
  assert.equal(projectSummary.progress, 50);
  assert.equal(projectSummary.nextAction, 'Следующий шаг');
  assert.equal(goalSummary.projects.length, 1);
  assert.equal(goalSummary.progress, 50);
  assert.equal(goalSummary.nextAction, 'Следующий шаг');
});

test('Я Есмь reads only its connected hierarchy after semantic links exist', () => {
  const { self, cards, links } = makeHierarchy();
  const unrelated = createNode({ type: 'project', title: 'Чужой проект' });
  cards[unrelated.id] = unrelated;
  const state = { cards, links };
  const now = new Date('2026-06-30T00:00:00Z');

  const hierarchy = buildSelfHierarchy(self, state, now);
  const summary = buildSelfSummary(state, now);

  assert.equal(hierarchy.structured, true);
  assert.equal(hierarchy.goals.length, 1);
  assert.equal(hierarchy.projects.length, 1);
  assert.equal(hierarchy.processes.length, 1);
  assert.equal(summary.activeGoals, 1);
  assert.equal(summary.activeProjects, 1);
  assert.equal(summary.activeProcesses, 1);
  assert.equal(summary.averageGoalProgress, 50);
  assert.equal(summary.nextAction, 'Следующий шаг');
});
