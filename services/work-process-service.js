import store from '../state/store.js';
import storage from '../storage/index.js';
import { normalizeNode } from '../domain/node.js';
import { createTask } from '../domain/task.js';
import {
  moveTaskToStage as moveTaskCollectionToStage,
  normalizeStage,
  reorderById,
} from '../domain/work-process.js';

export const PROCESS_CARD_REQUIRED_ERROR = 'PROCESS_CARD_REQUIRED';
export const PROCESS_STAGE_NOT_FOUND_ERROR = 'PROCESS_STAGE_NOT_FOUND';
export const PROCESS_TASK_NOT_FOUND_ERROR = 'PROCESS_TASK_NOT_FOUND';
export const PROCESS_STAGE_REQUIRED_ERROR = 'PROCESS_STAGE_REQUIRED';

function resolveDependencies(options = {}) {
  return {
    stateStore: options.stateStore ?? store,
    storageAdapter: options.storageAdapter ?? storage,
  };
}

function getProcessCard(stateStore, processId) {
  const card = stateStore.getState().cards[processId];
  if (!card) throw new Error(`Card not found: ${processId}`);
  if (card.type !== 'process') {
    const error = new Error(`Card is not a process: ${processId}`);
    error.code = PROCESS_CARD_REQUIRED_ERROR;
    throw error;
  }
  return card;
}

function assertStage(card, stageId, { activeOnly = false } = {}) {
  const stage = card.data.stages.find((item) => item.id === stageId);
  if (!stage || (activeOnly && stage.lifecycleStatus !== 'active')) {
    const error = new Error(`Stage not found: ${stageId}`);
    error.code = PROCESS_STAGE_NOT_FOUND_ERROR;
    throw error;
  }
  return stage;
}

function assertTask(card, taskId) {
  const task = card.data.tasks.find((item) => item.id === taskId);
  if (!task) {
    const error = new Error(`Task not found: ${taskId}`);
    error.code = PROCESS_TASK_NOT_FOUND_ERROR;
    throw error;
  }
  return task;
}

async function commitProcessData(processId, transform, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const state = stateStore.getState();
  const card = getProcessCard(stateStore, processId);
  const nextData = transform(structuredClone(card.data), card);
  const updatedCard = normalizeNode({
    ...card,
    data: nextData,
    updatedAt: new Date().toISOString(),
  });

  await storageAdapter.saveCard(updatedCard);

  stateStore.setState({
    cards: { ...state.cards, [processId]: updatedCard },
    selectedCardId: processId,
  });

  return updatedCard;
}

export async function selectProcessStage(processId, stageId, options = {}) {
  return commitProcessData(processId, (data, card) => {
    assertStage(card, stageId, { activeOnly: true });
    return { ...data, selectedStageId: stageId };
  }, options);
}

export async function addProcessStage(processId, input = {}, options = {}) {
  return commitProcessData(processId, (data) => {
    const activeStages = data.stages.filter((stage) => stage.lifecycleStatus === 'active');
    const stage = normalizeStage({
      ...input,
      processId,
      order: input.order ?? data.stages.length,
      lifecycleStatus: 'active',
    }, processId);
    return {
      ...data,
      stages: [...data.stages, stage],
      selectedStageId: data.selectedStageId ?? stage.id,
    };
  }, options);
}

export async function reorderProcessStage(processId, stageId, targetOrder, options = {}) {
  return commitProcessData(processId, (data, card) => {
    assertStage(card, stageId);
    return { ...data, stages: reorderById(data.stages, stageId, targetOrder) };
  }, options);
}

export async function archiveProcessStage(processId, stageId, options = {}) {
  return commitProcessData(processId, (data, card) => {
    assertStage(card, stageId);
    const now = new Date().toISOString();
    return {
      ...data,
      stages: data.stages.map((stage) => stage.id === stageId
        ? { ...stage, lifecycleStatus: 'archived', archivedAt: now, trashedAt: null }
        : stage),
    };
  }, options);
}

export async function restoreProcessStage(processId, stageId, options = {}) {
  return commitProcessData(processId, (data, card) => {
    assertStage(card, stageId);
    return {
      ...data,
      stages: data.stages.map((stage) => stage.id === stageId
        ? { ...stage, lifecycleStatus: 'active', archivedAt: null, trashedAt: null }
        : stage),
    };
  }, options);
}

export async function addProcessTask(processId, input = {}, options = {}) {
  return commitProcessData(processId, (data, card) => {
    const stageId = input.stageId ?? data.selectedStageId;
    if (!stageId) {
      const error = new Error('A stage must be selected before creating a task.');
      error.code = PROCESS_STAGE_REQUIRED_ERROR;
      throw error;
    }
    assertStage(card, stageId, { activeOnly: true });
    const stageTasks = data.tasks.filter((task) => task.stageId === stageId);
    const task = createTask({
      ...input,
      processId,
      stageId,
      order: input.order ?? stageTasks.length,
      lifecycleStatus: 'active',
    }, { processId, stageId });
    return { ...data, tasks: [...data.tasks, task] };
  }, options);
}

export async function reorderProcessTask(processId, taskId, targetOrder, options = {}) {
  return commitProcessData(processId, (data, card) => {
    const task = assertTask(card, taskId);
    const sameStage = data.tasks
      .filter((item) => item.stageId === task.stageId)
      .sort((a, b) => a.order - b.order);
    const reordered = reorderById(sameStage, taskId, targetOrder);
    const byId = new Map(reordered.map((item) => [item.id, item]));
    return {
      ...data,
      tasks: data.tasks.map((item) => byId.get(item.id) ?? item),
    };
  }, options);
}

export async function moveProcessTask(processId, taskId, targetStageId, targetOrder, options = {}) {
  return commitProcessData(processId, (data, card) => {
    assertTask(card, taskId);
    assertStage(card, targetStageId, { activeOnly: true });
    return {
      ...data,
      tasks: moveTaskCollectionToStage(data.tasks, taskId, targetStageId, targetOrder),
    };
  }, options);
}

export async function archiveProcessTask(processId, taskId, options = {}) {
  return commitProcessData(processId, (data, card) => {
    assertTask(card, taskId);
    const now = new Date().toISOString();
    return {
      ...data,
      tasks: data.tasks.map((task) => task.id === taskId
        ? { ...task, lifecycleStatus: 'archived', archivedAt: now, trashedAt: null, isCurrent: false }
        : task),
    };
  }, options);
}

export async function restoreProcessTask(processId, taskId, options = {}) {
  return commitProcessData(processId, (data, card) => {
    assertTask(card, taskId);
    return {
      ...data,
      tasks: data.tasks.map((task) => task.id === taskId
        ? { ...task, lifecycleStatus: 'active', archivedAt: null, trashedAt: null }
        : task),
    };
  }, options);
}
