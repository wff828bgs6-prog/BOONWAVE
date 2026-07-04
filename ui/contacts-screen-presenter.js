import { listContacts } from '../services/contact-service.js';
import { buildContactHistory } from '../services/contact-history-service.js';
import { presentContactDetails, presentContactSummary } from './contact-presenter.js';

export const CONTACTS_SCREEN_MODES = Object.freeze([
  'all',
  'favorites',
  'recent',
  'by-specialization',
]);

export function presentContactsScreen(options = {}) {
  const {
    stateStore,
    query = '',
    mode = 'all',
    category = null,
    kind = null,
    selectedContactId = null,
  } = options;

  const contacts = listContacts({
    stateStore,
    query,
    category,
    kind,
    favorite: mode === 'favorites' ? true : null,
  });

  const items = contacts.map((contact) => {
    const history = buildContactHistory(contact.id, { stateStore });
    return {
      ...presentContactSummary(contact),
      recentActivityAt: history.recentActivity[0]?.updatedAt ?? contact.updatedAt,
      processCount: history.summary.processCount,
      activeTaskCount: history.summary.activeTaskCount,
    };
  });

  if (mode === 'recent') {
    items.sort((a, b) => new Date(b.recentActivityAt ?? 0) - new Date(a.recentActivityAt ?? 0));
  }

  if (mode === 'by-specialization') {
    items.sort((a, b) => (a.subtitle || '').localeCompare(b.subtitle || '', 'ru'));
  }

  const selected = selectedContactId
    ? contacts.find((contact) => contact.id === selectedContactId) ?? null
    : null;

  return {
    title: 'Контакты',
    mode: CONTACTS_SCREEN_MODES.includes(mode) ? mode : 'all',
    query,
    category,
    kind,
    counts: {
      total: contacts.length,
      favorites: contacts.filter((contact) => contact.data.favorite).length,
      people: contacts.filter((contact) => contact.data.kind === 'person').length,
      companies: contacts.filter((contact) => contact.data.kind === 'company').length,
    },
    items,
    selectedContact: selected
      ? presentContactDetails(selected, {
          relationships: buildContactHistory(selected.id, { stateStore }),
        })
      : null,
    emptyState: contacts.length === 0
      ? {
          title: query ? 'Ничего не найдено' : 'Контактов пока нет',
          action: query ? 'Сбросить поиск' : 'Добавить контакт',
        }
      : null,
    actions: {
      addContact: true,
      search: true,
      filter: true,
      assignToProcess: true,
      assignToTask: true,
      showOnCanvas: true,
    },
  };
}
