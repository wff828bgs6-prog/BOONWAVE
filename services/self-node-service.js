import store from '../state/store.js';
import storage from '../storage/index.js';
import { createNode, normalizeNode } from '../domain/node.js';
import {
  buildProcessSummary,
  buildSelfHierarchy,
} from './graph-summary-service.js';

export const PRIMARY_SELF_NODE_ID = 'self_primary';
export const PRIMARY_SELF_TITLE = 'Моя вселенная';

function getInitialSelfPosition(cards = {}) {
  const existing = Object.values(cards).filter((card) => card && card.type !== 'self');
  if (existing.length === 0) return { x: 80, y: 80 };
  const minX = Math.min(...existing.map((card) => Number.isFinite(card.x) ? card.x : 80));
  const minY = Math.min(...existing.map((card) => Number.isFinite(card.y) ? card.y : 80));
  return { x: minX - 280, y: minY };
}

export function getPrimarySelfNode(cards = store.getState().cards) {
  return Object.values(cards ?? {}).find((card) => card?.type === 'self') ?? null;
}

export async function ensurePrimarySelfNode(options = {}) {
  const stateStore = options.stateStore ?? store;
  const storageAdapter = options.storageAdapter ?? storage;
  const state = stateStore.getState();
  const existing = getPrimarySelfNode(state.cards);
  if (existing) {
    if (existing.title === 'Я Есмь') {
      const renamed = { ...existing, title: PRIMARY_SELF_TITLE, updatedAt: new Date().toISOString() };
      await storageAdapter.saveCard(renamed);
      stateStore.setState({ cards: { ...state.cards, [renamed.id]: renamed } });
      return { card: renamed, created: false, renamed: true };
    }
    return { card: existing, created: false };
  }

  const position = getInitialSelfPosition(state.cards);
  const generated = createNode({
    type: 'self',
    title: PRIMARY_SELF_TITLE,
    description: 'Личный центр управления жизнью, проектами и идеями',
    x: position.x,
    y: position.y,
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
  const selfCard = getPrimarySelfNode(state.cards);
  const hierarchy = buildSelfHierarchy(selfCard, state, now);
  const goals = hierarchy.goals;
  const projects = hierarchy.projects;
  const processes = hierarchy.processes;
  const processSummaries = processes.map((process) => buildProcessSummary(process, state, now));
  const overdue = processSummaries.filter((summary) => summary.overdue);
  const highPriorityProjects = projects.filter((card) => card.data?.priority === 'high');
  const withoutNextStep = processSummaries.filter((summary) => !summary.nextAction);

  const manualFocus = Array.isArray(selfCard?.data?.focusItems)
    ? selfCard.data.focusItems.filter((item) => typeof item === 'string' && item.trim()).slice(0, 3)
    : [];
  if (manualFocus.length === 0 && selfCard?.data?.currentFocus) {
    manualFocus.push(selfCard.data.currentFocus);
  }

  const attentionItems = [
    ...overdue.map((summary) => `Просрочен процесс: ${summary.title}`),
    ...highPriorityProjects.map((card) => `Высокий приоритет: ${card.title}`),
    ...withoutNextStep.map((summary) => `Нужен следующий шаг: ${summary.title}`),
  ].filter((item, index, items) => items.indexOf(item) === index).slice(0, 3);

  const graphNextAction = hierarchy.goalSummaries.find((summary) => summary.nextAction)?.nextAction
    || hierarchy.projectSummaries.find((summary) => summary.nextAction)?.nextAction
    || processSummaries.find((summary) => summary.nextAction)?.nextAction
    || null;
  const nextAction = manualFocus[0] || graphNextAction || attentionItems[0] || null;
  const progressValues = hierarchy.goalSummaries
    .map((summary) => Number(summary.progress))
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
    structured: hierarchy.structured,
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
  if (!summary.structured) lines.push('Структура: свяжи «Моя вселенная» с целями или проектами');
  return lines.join('\n');
}
