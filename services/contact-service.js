import store from '../state/store.js';
import storage from '../storage/index.js';
import { createNode, normalizeNode } from '../domain/node.js';
import { matchesContact } from '../domain/contact.js';

function resolveDependencies(options = {}) {
  return {
    stateStore: options.stateStore ?? store,
    storageAdapter: options.storageAdapter ?? storage,
  };
}

export async function createContact(input = {}, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const state = stateStore.getState();
  const title = String(input.title ?? input.fullName ?? input.organization ?? '').trim() || 'Новый контакт';
  const contact = createNode({
    type: 'person',
    title,
    data: input.data ?? input,
  });

  await storageAdapter.saveCard(contact);
  stateStore.setState({
    cards: { ...state.cards, [contact.id]: contact },
    selectedCardId: contact.id,
  });
  return contact;
}

export async function updateContact(contactId, patch = {}, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const state = stateStore.getState();
  const contact = state.cards[contactId];
  if (!contact || contact.type !== 'person') throw new Error(`Contact not found: ${contactId}`);

  const updated = normalizeNode({
    ...contact,
    ...patch,
    id: contact.id,
    type: 'person',
    data: patch.data === undefined ? contact.data : { ...contact.data, ...patch.data },
    createdAt: contact.createdAt,
    updatedAt: new Date().toISOString(),
  });

  await storageAdapter.saveCard(updated);
  stateStore.setState({
    cards: { ...state.cards, [contactId]: updated },
    selectedCardId: contactId,
  });
  return updated;
}

export function listContacts(options = {}) {
  const stateStore = options.stateStore ?? store;
  const { query = '', category = null, favorite = null, kind = null } = options;
  return Object.values(stateStore.getState().cards)
    .filter((card) => card.type === 'person')
    .filter((card) => matchesContact(card.data, query))
    .filter((card) => category ? card.data.category === category : true)
    .filter((card) => favorite == null ? true : card.data.favorite === favorite)
    .filter((card) => kind ? card.data.kind === kind : true)
    .sort((a, b) => {
      if (a.data.favorite !== b.data.favorite) return a.data.favorite ? -1 : 1;
      return (a.data.fullName || a.title).localeCompare(b.data.fullName || b.title, 'ru');
    });
}

export async function setContactFavorite(contactId, favorite, options = {}) {
  return updateContact(contactId, { data: { favorite: Boolean(favorite) } }, options);
}
