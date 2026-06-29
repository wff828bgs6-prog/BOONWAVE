import store from '../state/store.js';
import storage from '../storage/index.js';
import { createNode } from '../domain/node.js';

export async function createCardNode(input) {
  const node = createNode(input);
  await storage.saveCard(node);

  const state = store.getState();
  store.setState({
    cards: { ...state.cards, [node.id]: node },
    selectedCardId: node.id,
  });

  return node;
}

export async function updateCardNode(cardId, patch = {}) {
  const state = store.getState();
  const card = state.cards[cardId];
  if (!card) throw new Error(`Card not found: ${cardId}`);

  const updatedCard = {
    ...card,
    ...patch,
    id: card.id,
    type: card.type,
    updatedAt: new Date().toISOString(),
  };

  await storage.saveCard(updatedCard);
  store.setState({
    cards: { ...state.cards, [cardId]: updatedCard },
    selectedCardId: cardId,
  });

  return updatedCard;
}

export async function deleteCardNode(cardId) {
  const state = store.getState();
  const card = state.cards[cardId];
  if (!card) return { card: null, deletedLinks: [] };

  const relatedLinks = state.links.filter(
    (link) => link.sourceId === cardId || link.targetId === cardId,
  );

  await Promise.all([
    storage.deleteCard(cardId),
    ...relatedLinks.map((link) => storage.deleteLink(link.id)),
  ]);

  const nextCards = { ...state.cards };
  delete nextCards[cardId];
  const deletedIds = new Set(relatedLinks.map((link) => link.id));

  store.setState({
    cards: nextCards,
    links: state.links.filter((link) => !deletedIds.has(link.id)),
    selectedCardId: state.selectedCardId === cardId ? null : state.selectedCardId,
  });

  return { card, deletedLinks: relatedLinks };
}
