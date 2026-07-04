import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode } from '../domain/node.js';
import { buildContactHistory } from '../services/contact-history-service.js';
import { presentContactsScreen } from '../ui/contacts-screen-presenter.js';

function createTestStore(initialState) {
  let state = structuredClone(initialState);
  return {
    getState() { return state; },
    setState(patch) { state = { ...state, ...patch }; return state; },
  };
}

function setup() {
  const contact = createNode({
    type: 'person',
    title: 'Иван Петров',
    data: {
      fullName: 'Иван Петров',
      profession: 'Монтажник',
      favorite: true,
    },
  });
  const process = createNode({
    type: 'process',
    title: 'Монтаж объекта',
    data: {
      projectId: 'project_1',
      participants: [{
        id: 'participant_1',
        personId: contact.id,
        role: 'Монтажник',
        participationStatus: 'active',
      }],
      tasks: [{
        id: 'task_1',
        title: 'Собрать конструкцию',
        assigneeIds: [contact.id],
        status: 'in_progress',
      }],
      expenses: [{
        id: 'expense_1',
        title: 'Оплата монтажа',
        amount: 15000,
        currency: 'RUB',
        recipientContactId: contact.id,
        paymentStatus: 'paid',
      }],
    },
  });
  const stateStore = createTestStore({
    cards: { [contact.id]: contact, [process.id]: process },
    links: [],
    selectedCardId: null,
  });
  return { contact, process, stateStore };
}

test('aggregates contact process task and expense history', () => {
  const { contact, process, stateStore } = setup();
  const history = buildContactHistory(contact.id, { stateStore });

  assert.equal(history.summary.processCount, 1);
  assert.equal(history.summary.activeTaskCount, 1);
  assert.equal(history.summary.totalPaid, 15000);
  assert.equal(history.processes[0].id, process.id);
  assert.equal(history.tasks[0].title, 'Собрать конструкцию');
});

test('presents contacts screen with selected contact details', () => {
  const { contact, stateStore } = setup();
  const screen = presentContactsScreen({
    stateStore,
    mode: 'favorites',
    selectedContactId: contact.id,
  });

  assert.equal(screen.title, 'Контакты');
  assert.equal(screen.items.length, 1);
  assert.equal(screen.items[0].activeTaskCount, 1);
  assert.equal(screen.selectedContact.id, contact.id);
  assert.equal(screen.selectedContact.history.processes.length, 1);
});

test('returns simple empty state', () => {
  const stateStore = createTestStore({ cards: {}, links: [], selectedCardId: null });
  const screen = presentContactsScreen({ stateStore });

  assert.equal(screen.items.length, 0);
  assert.equal(screen.emptyState.title, 'Контактов пока нет');
  assert.equal(screen.emptyState.action, 'Добавить контакт');
});
