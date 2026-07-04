import store from '../state/store.js';
import { updateCardNode } from './node-service.js';

const ARCHIVE_DATA_KEY = 'archive';

export function isArchivedCard(card) {
  return card?.data?.[ARCHIVE_DATA_KEY]?.status === 'archived';
}

export function getArchivedCards(cards = store.getState().cards) {
  return Object.values(cards).filter(isArchivedCard);
}

export async function archiveCard(cardId) {
  const state = store.getState();
  const card = state.cards[cardId];
  if (!card) return null;
  if (card.type === 'self') {
    const error = new Error('Системную карточку нельзя архивировать.');
    error.code = 'SYSTEM_CARD_ARCHIVE_BLOCKED';
    throw error;
  }

  const updated = await updateCardNode(cardId, {
    data: {
      [ARCHIVE_DATA_KEY]: {
        status: 'archived',
        archivedAt: new Date().toISOString(),
      },
    },
  });

  store.setState({ selectedCardId: null });
  return updated;
}

export async function restoreCard(cardId) {
  const state = store.getState();
  const card = state.cards[cardId];
  if (!card) return null;

  const updated = await updateCardNode(cardId, {
    data: {
      [ARCHIVE_DATA_KEY]: {
        status: 'active',
        archivedAt: null,
        restoredAt: new Date().toISOString(),
      },
    },
  });

  store.setState({ selectedCardId: cardId });
  return updated;
}
