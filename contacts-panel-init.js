import store from './state/store.js';
import { ContactsPanelController } from './controllers/contacts-panel-controller.js';

const el = (id) => document.getElementById(id);

function createPerson() {
  el('addCardButton')?.click();
  setTimeout(() => el('typeGrid')?.querySelector('[data-node-type="person"]')?.click(), 0);
}

function initContacts() {
  if (!el('contactsButton')) return;
  new ContactsPanelController({
    openButton: el('contactsButton'),
    sheet: el('contactsSheet'),
    closeButton: el('closeContactsButton'),
    list: el('contactsList'),
    empty: el('contactsEmpty'),
    createButton: el('createContactButton'),
    hint: el('hint'),
    onSelect: (cardId) => {
      const card = store.getState().cards[cardId];
      if (!card) return false;
      store.setState({ selectedCardId: card.id });
      return true;
    },
    onCreate: createPerson,
  }).init();
}

initContacts();
