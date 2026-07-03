import store from '../state/store.js';
import { updateCardNode } from './node-service.js';

const makeId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;

function uniqueById(items = [], nextItem) {
  const list = Array.isArray(items) ? items : [];
  const exists = list.some((item) => item.id === nextItem.id);
  return exists ? list.map((item) => (item.id === nextItem.id ? nextItem : item)) : [...list, nextItem];
}

function uniqueAssignment(list = [], assignment) {
  const items = Array.isArray(list) ? list : [];
  const duplicate = items.find((item) => item.contactId === assignment.contactId
    && item.targetCardId === assignment.targetCardId
    && item.scope === assignment.scope
    && (item.stageId ?? '') === (assignment.stageId ?? '')
    && (item.taskId ?? '') === (assignment.taskId ?? '')
    && item.status !== 'completed');
  if (duplicate) return items.map((item) => item.id === duplicate.id ? { ...item, ...assignment, id: duplicate.id, updatedAt: assignment.updatedAt } : item);
  return [...items, assignment];
}

function applyTargetAssignment(targetCard, assignment) {
  const data = targetCard.data ?? {};
  const contactAssignments = uniqueAssignment(data.contactAssignments, assignment);
  const patch = { contactAssignments };

  if (targetCard.type === 'process') {
    const participants = Array.isArray(data.participants) ? data.participants : [];
    const existing = participants.find((item) => item.contactId === assignment.contactId || item.personId === assignment.contactId);
    const participantPatch = {
      id: existing?.id ?? makeId('participant'),
      contactId: assignment.contactId,
      personId: assignment.contactId,
      role: assignment.role || 'Участник',
      responsibility: assignment.responsibility || '',
      status: assignment.status || 'active',
      stageIds: assignment.stageId ? [...new Set([...(existing?.stageIds ?? []), assignment.stageId])] : (existing?.stageIds ?? []),
      taskIds: assignment.taskId ? [...new Set([...(existing?.taskIds ?? []), assignment.taskId])] : (existing?.taskIds ?? []),
      assignmentIds: [...new Set([...(existing?.assignmentIds ?? []), assignment.id])],
      updatedAt: assignment.updatedAt,
      createdAt: existing?.createdAt ?? assignment.createdAt,
    };
    patch.participants = uniqueById(participants, participantPatch);
  }

  return patch;
}

export function buildContactAssignment({ contactId, targetCardId, scope = 'card', stageId = '', taskId = '', role = '', responsibility = '', status = 'active', date = '' } = {}) {
  if (!contactId || !targetCardId) throw new TypeError('Contact assignment requires contactId and targetCardId.');
  const now = new Date().toISOString();
  return {
    id: makeId('assignment'),
    contactId,
    targetCardId,
    scope,
    stageId: stageId || null,
    taskId: taskId || null,
    role: role || 'Участник',
    responsibility: responsibility || '',
    status: status || 'active',
    assignedAt: date || now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
  };
}

export async function assignContactToEntity(input = {}, options = {}) {
  const stateStore = options.stateStore ?? store;
  const state = stateStore.getState();
  const contact = state.cards[input.contactId];
  const targetCard = state.cards[input.targetCardId];
  if (!contact || contact.type !== 'person') throw new Error('Contact not found.');
  if (!targetCard || targetCard.type === 'person') throw new Error('Target card for assignment is invalid.');

  const assignment = buildContactAssignment(input);
  const contactData = contact.data ?? {};
  const contactAssignments = uniqueAssignment(contactData.assignments, assignment);

  await updateCardNode(contact.id, { data: { assignments: contactAssignments } });
  await updateCardNode(targetCard.id, { data: applyTargetAssignment(targetCard, assignment) });

  return assignment;
}

export function buildAssignmentTargets(cards = store.getState().cards) {
  const targets = [];
  for (const card of Object.values(cards ?? {})) {
    if (!card || card.type === 'person' || card.type === 'self') continue;
    targets.push({ id: card.id, cardId: card.id, scope: card.type, title: card.title, label: card.title, type: card.type });
    if (card.type === 'process') {
      for (const stage of card.data?.stages ?? []) {
        targets.push({ id: `${card.id}:stage:${stage.id}`, cardId: card.id, scope: 'stage', stageId: stage.id, title: `${card.title} / ${stage.title}`, label: `${card.title} — этап: ${stage.title}`, type: 'stage' });
      }
      for (const task of card.data?.tasks ?? []) {
        targets.push({ id: `${card.id}:task:${task.id}`, cardId: card.id, scope: 'task', taskId: task.id, stageId: task.stageId ?? null, title: `${card.title} / ${task.title}`, label: `${card.title} — задача: ${task.title}`, type: 'task' });
      }
    }
  }
  return targets;
}
