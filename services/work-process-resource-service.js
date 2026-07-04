import store from '../state/store.js';
import storage from '../storage/index.js';
import { normalizeNode } from '../domain/node.js';

const makeId = (prefix) => `${prefix}_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;

function resolveDependencies(options = {}) {
  return {
    stateStore: options.stateStore ?? store,
    storageAdapter: options.storageAdapter ?? storage,
  };
}

function getProcess(state, processId) {
  const process = state.cards[processId];
  if (!process || process.type !== 'process') throw new Error(`Process not found: ${processId}`);
  return process;
}

function assertActiveStage(process, stageId) {
  const stage = process.data.stages.find((item) => item.id === stageId && item.lifecycleStatus === 'active');
  if (!stage) throw new Error(`Active stage not found: ${stageId}`);
  return stage;
}

async function commit(processId, transform, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const state = stateStore.getState();
  const process = getProcess(state, processId);
  const updated = normalizeNode({
    ...process,
    data: transform(structuredClone(process.data), process, state),
    updatedAt: new Date().toISOString(),
  });
  await storageAdapter.saveCard(updated);
  stateStore.setState({
    cards: { ...state.cards, [processId]: updated },
    selectedCardId: processId,
  });
  return updated;
}

export async function addProcessExpense(processId, input = {}, options = {}) {
  return commit(processId, (data, process) => {
    const stageId = input.stageId ?? data.selectedStageId;
    if (!stageId) throw new Error('A stage must be selected before creating an expense.');
    assertActiveStage(process, stageId);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 0) throw new TypeError('Expense amount must be a non-negative number.');
    const now = new Date().toISOString();
    const expense = {
      id: String(input.id ?? '').trim() || makeId('expense'),
      processId,
      stageId,
      title: String(input.title ?? '').trim() || 'Новый расход',
      amount,
      currency: String(input.currency ?? 'RUB').trim() || 'RUB',
      expenseDate: input.expenseDate || now.slice(0, 10),
      category: String(input.category ?? '').trim(),
      recipient: String(input.recipient ?? '').trim(),
      comment: String(input.comment ?? '').trim(),
      paymentStatus: input.paymentStatus === 'paid' ? 'paid' : 'expected',
      receiptMediaId: input.receiptMediaId || null,
      lifecycleStatus: 'active',
      archivedAt: null,
      trashedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    return { ...data, expenses: [...data.expenses, expense] };
  }, options);
}

export async function updateProcessExpense(processId, expenseId, patch = {}, options = {}) {
  return commit(processId, (data) => {
    if (!data.expenses.some((item) => item.id === expenseId)) throw new Error(`Expense not found: ${expenseId}`);
    return {
      ...data,
      expenses: data.expenses.map((item) => {
        if (item.id !== expenseId) return item;
        const amount = patch.amount === undefined ? item.amount : Number(patch.amount);
        if (!Number.isFinite(amount) || amount < 0) throw new TypeError('Expense amount must be a non-negative number.');
        return { ...item, ...patch, id: item.id, processId, amount, updatedAt: new Date().toISOString() };
      }),
    };
  }, options);
}

export async function archiveProcessExpense(processId, expenseId, options = {}) {
  return updateProcessExpense(processId, expenseId, {
    lifecycleStatus: 'archived',
    archivedAt: new Date().toISOString(),
    trashedAt: null,
  }, options);
}

export async function restoreProcessExpense(processId, expenseId, options = {}) {
  return updateProcessExpense(processId, expenseId, {
    lifecycleStatus: 'active',
    archivedAt: null,
    trashedAt: null,
  }, options);
}

export async function addProcessParticipant(processId, personId, input = {}, options = {}) {
  return commit(processId, (data, process, state) => {
    const person = state.cards[personId];
    if (!person || person.type !== 'person') throw new Error(`Contact not found: ${personId}`);
    const duplicate = data.participants.find((item) => item.personId === personId && item.participationStatus !== 'completed');
    if (duplicate) throw new Error(`Contact is already an active participant: ${personId}`);
    const stageIds = Array.isArray(input.stageIds) ? [...new Set(input.stageIds)] : [];
    stageIds.forEach((stageId) => assertActiveStage(process, stageId));
    const now = new Date().toISOString();
    const participant = {
      id: String(input.id ?? '').trim() || makeId('participant'),
      processId,
      personId,
      role: String(input.role ?? '').trim(),
      responsibility: String(input.responsibility ?? '').trim(),
      participationStatus: ['invited', 'active', 'paused', 'completed'].includes(input.participationStatus)
        ? input.participationStatus
        : 'active',
      stageIds,
      createdAt: now,
      updatedAt: now,
    };
    return { ...data, participants: [...data.participants, participant] };
  }, options);
}

export async function updateProcessParticipant(processId, participantId, patch = {}, options = {}) {
  return commit(processId, (data, process) => {
    if (!data.participants.some((item) => item.id === participantId)) throw new Error(`Participant not found: ${participantId}`);
    const stageIds = patch.stageIds === undefined ? null : [...new Set(patch.stageIds)];
    stageIds?.forEach((stageId) => assertActiveStage(process, stageId));
    return {
      ...data,
      participants: data.participants.map((item) => item.id === participantId
        ? { ...item, ...patch, id: item.id, processId, stageIds: stageIds ?? item.stageIds, updatedAt: new Date().toISOString() }
        : item),
    };
  }, options);
}

export async function removeProcessParticipant(processId, participantId, options = {}) {
  return updateProcessParticipant(processId, participantId, { participationStatus: 'completed' }, options);
}

export async function assignProcessMedia(processId, target = {}, mediaId, input = {}, options = {}) {
  return commit(processId, (data, process) => {
    if (!mediaId) throw new TypeError('Media id is required.');
    if (target.stageId) assertActiveStage(process, target.stageId);
    if (target.taskId && !data.tasks.some((task) => task.id === target.taskId)) {
      throw new Error(`Task not found: ${target.taskId}`);
    }
    const duplicate = data.mediaAssignments.find((item) => item.mediaId === mediaId
      && (item.stageId ?? null) === (target.stageId ?? null)
      && (item.taskId ?? null) === (target.taskId ?? null));
    if (duplicate) return data;
    const assignment = {
      id: String(input.id ?? '').trim() || makeId('media_assignment'),
      mediaId,
      projectId: input.projectId ?? data.projectId ?? null,
      processId,
      stageId: target.stageId ?? null,
      taskId: target.taskId ?? null,
      purpose: String(input.purpose ?? '').trim(),
      order: Number.isInteger(input.order) ? input.order : data.mediaAssignments.length,
      createdAt: new Date().toISOString(),
    };
    return { ...data, mediaAssignments: [...data.mediaAssignments, assignment] };
  }, options);
}

export async function unassignProcessMedia(processId, assignmentId, options = {}) {
  return commit(processId, (data) => {
    if (!data.mediaAssignments.some((item) => item.id === assignmentId)) {
      throw new Error(`Media assignment not found: ${assignmentId}`);
    }
    return { ...data, mediaAssignments: data.mediaAssignments.filter((item) => item.id !== assignmentId) };
  }, options);
}
