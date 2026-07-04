import store from '../state/store.js';
import storage from '../storage/index.js';
import { getCardMediaIds } from '../domain/card-media.js';

const CONTACT_CARD_TYPES = new Set(['person']);

function isContactCard(card) {
  return card && CONTACT_CARD_TYPES.has(card.type);
}

function hasNativeMethod(adapter, methodName) {
  return typeof adapter?.[methodName] === 'function';
}

async function deleteLinkSafely(storageAdapter, linkId) {
  if (!linkId || !hasNativeMethod(storageAdapter, 'deleteLink')) return;
  try {
    await storageAdapter.deleteLink(linkId);
  } catch (error) {
    console.warn('BOONWAVE card reset: failed to delete legacy link:', linkId, error);
  }
}

async function deleteCardSafely(storageAdapter, card) {
  if (!card?.id) return;
  const mediaIds = getCardMediaIds(card);
  try {
    if (hasNativeMethod(storageAdapter, 'deleteCardGraph')) {
      await storageAdapter.deleteCardGraph({ cardId: card.id, linkIds: [], mediaIds });
      return;
    }
    if (hasNativeMethod(storageAdapter, 'deleteCard')) await storageAdapter.deleteCard(card.id);
  } catch (error) {
    console.warn('BOONWAVE card reset: failed to delete legacy card:', card.id, error);
  }
}

async function hideContactOnCanvas(storageAdapter, card) {
  if (!isContactCard(card)) return card;
  if (card.data?.showOnCanvas === false) return card;
  const updated = {
    ...card,
    data: {
      ...(card.data ?? {}),
      showOnCanvas: false,
    },
    updatedAt: new Date().toISOString(),
  };
  try {
    if (hasNativeMethod(storageAdapter, 'saveCard')) await storageAdapter.saveCard(updated);
  } catch (error) {
    console.warn('BOONWAVE card reset: failed to hide contact on canvas:', card.id, error);
  }
  return updated;
}

export async function resetLegacyCardLayer(options = {}) {
  const stateStore = options.stateStore ?? store;
  const storageAdapter = options.storageAdapter ?? storage;
  const state = stateStore.getState();
  const cards = state.cards ?? {};
  const links = Array.isArray(state.links) ? state.links : [];
  const keptCards = {};
  let deletedCards = 0;

  for (const link of links) await deleteLinkSafely(storageAdapter, link.id);

  for (const card of Object.values(cards)) {
    if (isContactCard(card)) {
      const contact = await hideContactOnCanvas(storageAdapter, card);
      keptCards[contact.id] = contact;
      continue;
    }
    await deleteCardSafely(storageAdapter, card);
    deletedCards += 1;
  }

  stateStore.setState({
    cards: keptCards,
    links: [],
    selectedCardId: null,
  });

  return {
    deletedCards,
    deletedLinks: links.length,
    keptContacts: Object.keys(keptCards).length,
  };
}

export default resetLegacyCardLayer;
