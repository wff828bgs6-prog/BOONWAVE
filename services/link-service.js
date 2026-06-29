import store from '../state/store.js';
import storage from '../storage/index.js';

const makeId = (sourceId, targetId) =>
  `link_${sourceId}_${targetId}_${crypto.randomUUID?.() ?? Date.now()}`;

export async function createLink(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) {
    throw new TypeError('createLink expects two different card ids.');
  }

  const state = store.getState();
  if (!state.cards[sourceId] || !state.cards[targetId]) {
    throw new Error('Cannot create a link for missing cards.');
  }

  const duplicate = state.links.find(
    (link) => link.sourceId === sourceId && link.targetId === targetId,
  );
  if (duplicate) return duplicate;

  const link = {
    id: makeId(sourceId, targetId),
    sourceId,
    targetId,
    createdAt: new Date().toISOString(),
  };

  await storage.saveLink(link);
  store.setState({ links: [...state.links, link], selectedCardId: targetId });
  return link;
}

export async function deleteLinksBetween(firstId, secondId) {
  const state = store.getState();
  const matches = state.links.filter((link) =>
    (link.sourceId === firstId && link.targetId === secondId)
    || (link.sourceId === secondId && link.targetId === firstId));

  await Promise.all(matches.map((link) => storage.deleteLink(link.id)));
  const deletedIds = new Set(matches.map((link) => link.id));
  store.setState({
    links: state.links.filter((link) => !deletedIds.has(link.id)),
    selectedCardId: secondId,
  });

  return matches;
}
