import store from '../state/store.js';
import storage from '../storage/index.js';
import { createNode, normalizeNode } from '../domain/node.js';
import { mergeNodeData } from '../domain/node-schemas.js';

function resolveDependencies(options = {}) {
  return {
    stateStore: options.stateStore ?? store,
    storageAdapter: options.storageAdapter ?? storage,
  };
}

export async function createCardNode(input, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const node = createNode(input);

  await storageAdapter.saveCard(node);

  const state = stateStore.getState();
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

export async function deleteCardNode(cardId, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const state = stateStore.getState();
  const card = state.cards[cardId];
  if (!card) return { card: null, deletedLinks: [] };

  const relatedLinks = state.links.filter(
    (link) => link.sourceId === cardId || link.targetId === cardId,
  );
  const linkIds = relatedLinks.map((link) => link.id);

  if (typeof storageAdapter.deleteCardWithLinks === 'function') {
    await storageAdapter.deleteCardWithLinks(cardId, linkIds);
  } else {
    await storageAdapter.deleteCard(cardId);
    await Promise.all(relatedLinks.map((link) => storageAdapter.deleteLink(link.id)));
  }

  const nextCards = { ...state.cards };
  delete nextCards[cardId];
  const deletedIds = new Set(linkIds);

  stateStore.setState({
    cards: nextCards,
    links: state.links.filter((link) => !deletedIds.has(link.id)),
    selectedCardId: state.selectedCardId === cardId ? null : state.selectedCardId,
  });

  return { card, deletedLinks: relatedLinks };
}
