import test from 'node:test';
import assert from 'node:assert/strict';

import { createNode } from '../domain/node.js';
import { getPrimaryContactActions, matchesContact } from '../domain/contact.js';
import { createContact, listContacts, setContactFavorite } from '../services/contact-service.js';
import { presentContactDetails, presentContactSummary } from '../ui/contact-presenter.js';

function createTestStore(initialState) {
  let state = structuredClone(initialState);
  return {
    getState() { return state; },
    setState(patch) { state = { ...state, ...patch }; return state; },
  };
}

test('upgrades legacy phone and email into BOONWAVE contact channels', () => {
  const contact = createNode({
    type: 'person',
    title: 'Иван',
    data: { fullName: 'Иван Петров', phone: '+79990000000', email: 'ivan@example.com' },
  });

  assert.equal(contact.data.phones[0].value, '+79990000000');
  assert.equal(contact.data.emails[0].value, 'ivan@example.com');
  assert.equal(getPrimaryContactActions(contact.data).phone.value, '+79990000000');
});

test('searches contacts by profession tags and city', () => {
  const contact = createNode({
    type: 'person',
    title: 'Анна',
    data: {
      fullName: 'Анна Орлова',
      profession: 'Графический дизайнер',
      city: 'Москва',
      tags: ['упаковка'],
    },
  });

  assert.equal(matchesContact(contact.data, 'дизайнер'), true);
  assert.equal(matchesContact(contact.data, 'упаковка'), true);
  assert.equal(matchesContact(contact.data, 'Казань'), false);
});

test('creates and favorites contact only after storage succeeds', async () => {
  const stateStore = createTestStore({ cards: {}, links: [], selectedCardId: null });
  const saved = [];
  const storageAdapter = { async saveCard(card) { saved.push(card); } };

  const contact = await createContact({
    fullName: 'Сергей Монтажник',
    profession: 'Монтажник',
    category: 'contractor',
  }, { stateStore, storageAdapter });
  await setContactFavorite(contact.id, true, { stateStore, storageAdapter });

  assert.equal(saved.length, 2);
  assert.equal(stateStore.getState().cards[contact.id].data.favorite, true);
});

test('lists favorites first and filters independently from iOS contacts', () => {
  const first = createNode({ type: 'person', title: 'Первый', data: { fullName: 'Первый', favorite: false } });
  const second = createNode({ type: 'person', title: 'Второй', data: { fullName: 'Второй', favorite: true } });
  const stateStore = createTestStore({
    cards: { [first.id]: first, [second.id]: second },
    links: [],
    selectedCardId: null,
  });

  const contacts = listContacts({ stateStore });
  assert.equal(contacts[0].id, second.id);
});

test('presents compact and expanded contact views', () => {
  const contact = createNode({
    type: 'person',
    title: 'Дизайнер',
    data: {
      fullName: 'Мария',
      profession: 'Графический дизайнер',
      organization: 'Studio M',
      phones: [{ value: '+79991112233', primary: true }],
      legalDetails: { taxId: '1234567890' },
    },
  });

  const compact = presentContactSummary(contact);
  const details = presentContactDetails(contact, { relationships: { tasks: [{ id: 't1' }] } });

  assert.equal(compact.canCall, true);
  assert.match(compact.subtitle, /Графический дизайнер/);
  assert.equal(details.legalDetails.taxId, '1234567890');
  assert.equal(details.history.tasks.length, 1);
  assert.equal(details.actions.showOnCanvas, true);
});
