import store from '../state/store.js';
import storage from '../storage/index.js';
import { createNode, normalizeNode } from '../domain/node.js';

export const PRIMARY_SELF_NODE_ID = 'self_primary';

const COMPLETE_STATUSES = new Set(['completed', 'done', 'cancelled']);

function isActive(card) {
  return card && !COMPLETE_STATUSES.has(card.data?.status);
}

function findIncompleteTask(process) {
  const tasks = Array.isArray(process?.data?.tasks) ? process.data.tasks : [];
  return tasks.find((task) => {
    if (!task || typeof task !== 'object') return false;
    return !COMPLETE_STATUSES.has(task.status) && task.completed !== true;
  }) ?? null;
}

function isOverdue(process, now) {
  if (!isActive(process) || !process.data?.dueDate) return false;
  const due = new Date(process.data.dueDate);
  return Number.isFinite(due.getTime()) && due.getTime() < now.getTime();
}

export function getPrimarySelfNode(cards = store.getState().cards) {
  return Object.values(cards ?? {}).find((card) => card?.type === 'self') ?? null;
}

export async function ensurePrimarySelfNode(options = {}) {
  const stateStore = options.stateStore ?? store;
  const storageAdapter = options.storageAdapter ?? storage;
  const state = stateStore.getState();
  const existing = getPrimarySelfNode(state.cards);
  if (existing) return { card: existing, created: false };

  const generated = createNode({
    type: 'self',
    title: 'Я Есмь',
    description: 'Личный центр управления жизнью и проектами',
    x: 80,
    y: 80,
    data: {
      attentionStatus: 'stable',
      focusItems: [],
    },
    view: {
      mode: 'standard',
      compactLabel: 'Я',
      coverFrames: {
        compact: { shape: 'circle', scale: 1, positionX: 50, positionY: 50 },
        working: { shape: 'circle', scale: 1, positionX: 50, positionY: 50 },
      },
    },
  });
  const card = normalizeNode({ ...generated, id: PRIMARY_SELF_NODE_ID });

  await storageAdapter.saveCard(card);
  stateStore.setState({
    cards: { ...state.cards, [card.id]: card },
    selectedCardId: state.selectedCardId,
  });

  return { card, created: true };
}

export function buildSelfSummary(state = store.getState(), now = new Date()) {
  const cards = Object.values(state.cards ?? {});
  const selfCard = getPrimarySelfNode(state.cards);
  const goals = cards.filter((card) => card.type === 'goal' && isActive(card));
  const projects = cards.filter((card) => card.type === 'project' && isActive(card));
  const processes = cards.filter((card) => card.type === 'process' && isActive(card));
  const overdue = processes.filter((card) => isOverdue(card, now));
  const highPriorityProjects = projects.filter((card) => card.data?.priority === 'high');
  const withoutNextStep = processes.filter((card) => {
    const tasks = Array.isArray(card.data?.tasks) ? card.data.tasks : [];
    return tasks.length === 0 || !findIncompleteTask(card);
  });

  const manualFocus = Array.isArray(selfCard?.data?.focusItems)
    ? selfCard.data.focusItems.filter((item) => typeof item === 'string' && item.trim()).slice(0, 3)
    : [];
  if (manualFocus.length === 0 && selfCard?.data?.currentFocus) {
    manualFocus.push(selfCard.data.currentFocus);
  }

  const attentionItems = [
    ...overdue.map((card) => `Просрочен процесс: ${card.title}`),
    ...highPriorityProjects.map((card) => `Высокий приоритет: ${card.title}`),
    ...withoutNextStep.map((card) => `Нужен следующий шаг: ${card.title}`),
  ].filter((item, index, items) => items.indexOf(item) === index).slice(0, 3);

  const firstTask = processes.map(findIncompleteTask).find(Boolean);
  const nextAction = manualFocus[0]
    || firstTask?.title
    || firstTask?.text
    || attentionItems[0]
    || null;
  const progressValues = goals
    .map((card) => Number(card.data?.progress))
    .filter(Number.isFinite);

  return {
    activeGoals: goals.length,
    activeProjects: projects.length,
    activeProcesses: processes.length,
    overdueProcesses: overdue.length,
    averageGoalProgress: progressValues.length
      ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
      : null,
    focusItems: manualFocus,
    attentionItems,
    nextAction,
  };
}

export function formatSelfSummary(card, state = store.getState()) {
  const summary = buildSelfSummary(state);
  const lines = [];
  if (card?.data?.currentState) lines.push(`Сейчас: ${card.data.currentState}`);
  if (card?.data?.currentFocus) lines.push(`Главный фокус: ${card.data.currentFocus}`);
  lines.push(`Активные цели: ${summary.activeGoals}`);
  lines.push(`Активные проекты: ${summary.activeProjects}`);
  lines.push(`Рабочие процессы: ${summary.activeProcesses}`);
  if (summary.averageGoalProgress !== null) {
    lines.push(`Средний прогресс целей: ${summary.averageGoalProgress}%`);
  }
  if (summary.nextAction) lines.push(`Следующий шаг: ${summary.nextAction}`);
  if (summary.attentionItems.length > 0) {
    lines.push('Требует внимания:');
    lines.push(...summary.attentionItems.map((item, index) => `${index + 1}. ${item}`));
  } else {
    lines.push('Требует внимания: явных критических сигналов нет');
  }
  return lines.join('\n');
}
