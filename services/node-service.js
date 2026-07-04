import store from '../state/store.js';
import storage from '../storage/index.js';
import StorageAdapter from '../storage/storage-adapter.js';
import { createNode, normalizeNode } from '../domain/node.js';
import { mergeNodeData } from '../domain/node-schemas.js';
import { getCardMediaIds } from '../domain/card-media.js';
import { normalizeMediaRecord } from '../domain/media-record.js';

export const SELF_NODE_PROTECTED_ERROR = 'SELF_NODE_PROTECTED';
export const SELF_NODE_DUPLICATE_ERROR = 'SELF_NODE_DUPLICATE';

function resolveDependencies(options = {}) {
  return {
    stateStore: options.stateStore ?? store,
    storageAdapter: options.storageAdapter ?? storage,
  };
}

function supportsAtomicCardGraphDelete(storageAdapter) {
  return typeof storageAdapter?.deleteCardGraph === 'function'
    && storageAdapter.deleteCardGraph !== StorageAdapter.prototype.deleteCardGraph;
}

async function detachCardMediaFallback(storageAdapter, cardId, mediaIds) {
  for (const mediaId of mediaIds) {
    const loaded = await storageAdapter.loadMedia(mediaId);
    if (!loaded?.record) continue;
    const ownerIds = loaded.record.ownerIds.filter((id) => id !== cardId);
    if (ownerIds.length === 0) {
      await storageAdapter.deleteMedia(mediaId);
      continue;
    }
    const updated = normalizeMediaRecord({
      ...loaded.record,
      ownerIds,
      updatedAt: new Date().toISOString(),
    });
    await storageAdapter.saveMedia(updated, loaded.blob);
  }
}

export async function createCardNode(input, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const state = stateStore.getState();
  if (input?.type === 'self' && Object.values(state.cards).some((card) => card.type === 'self')) {
    const error = new Error('Only one Моя вселенная card can exist.');
    error.code = SELF_NODE_DUPLICATE_ERROR;
    throw error;
  }
  const node = createNode(input);

  await storageAdapter.saveCard(node);

  stateStore.setState({
    cards: { ...state.cards, [node.id]: node },
    selectedCardId: node.id,
  });

  return node;
}

export async function updateCardNode(cardId, patch = {}, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const state = stateStore.getState();
  const card = state.cards[cardId];
  if (!card) throw new Error(`Card not found: ${cardId}`);

  const updatedCard = normalizeNode({
    ...card,
    ...patch,
    id: card.id,
    type: card.type,
    data: patch.data === undefined
      ? card.data
      : mergeNodeData(card.type, card.data, patch.data),
    createdAt: card.createdAt,
    updatedAt: new Date().toISOString(),
  });

  await storageAdapter.saveCard(updatedCard);
  stateStore.setState({
    cards: { ...state.cards, [cardId]: updatedCard },
    selectedCardId: cardId,
  });

  return updatedCard;
}

export async function archiveCardNode(cardId, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const state = stateStore.getState();
  const card = state.cards[cardId];
  if (!card) return null;
  if (card.type === 'self') {
    const error = new Error('Карточка «Моя вселенная» является системной и не может быть архивирована.');
    error.code = SELF_NODE_PROTECTED_ERROR;
    throw error;
  }
  const archived = normalizeNode({
    ...card,
    lifecycleStatus: 'archived',
    updatedAt: new Date().toISOString(),
  });
  await storageAdapter.saveCard(archived);
  stateStore.setState({
    cards: { ...state.cards, [cardId]: archived },
    selectedCardId: null,
  });
  return archived;
}

export async function deleteCardNode(cardId, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const state = stateStore.getState();
  const card = state.cards[cardId];
  if (!card) return { card: null, deletedLinks: [], mediaIds: [] };
  if (card.type === 'self') {
    const error = new Error('Карточка «Моя вселенная» является системной и не может быть удалена.');
    error.code = SELF_NODE_PROTECTED_ERROR;
    throw error;
  }

  const relatedLinks = state.links.filter(
    (link) => link.sourceId === cardId || link.targetId === cardId,
  );
  const linkIds = relatedLinks.map((link) => link.id);
  const mediaIds = getCardMediaIds(card);

  if (supportsAtomicCardGraphDelete(storageAdapter)) {
    await storageAdapter.deleteCardGraph({ cardId, linkIds, mediaIds });
  } else {
    await storageAdapter.deleteCardWithLinks(cardId, linkIds);
    await detachCardMediaFallback(storageAdapter, cardId, mediaIds);
  }

  const nextCards = { ...state.cards };
  delete nextCards[cardId];
  const deletedIds = new Set(linkIds);

  stateStore.setState({
    cards: nextCards,
    links: state.links.filter((link) => !deletedIds.has(link.id)),
    selectedCardId: state.selectedCardId === cardId ? null : state.selectedCardId,
  });

  return { card, deletedLinks: relatedLinks, mediaIds };
}
