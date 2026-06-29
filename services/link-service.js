import store from '../state/store.js';
import storage from '../storage/index.js';

const makeId = (sourceId, targetId) =>
  `link_${sourceId}_${targetId}_${crypto.randomUUID?.() ?? Date.now()}`;

function resolveDependencies(options = {}) {
  return {
    stateStore: options.stateStore ?? store,
    storageAdapter: options.storageAdapter ?? storage,
  };
}

export async function createLink(sourceId, targetId, options = {}) {
  if (!sourceId || !targetId || sourceId === targetId) {
    throw new TypeError('createLink expects two different card ids.');
  }

  const { stateStore, storageAdapter } = resolveDependencies(options);
  const state = stateStore.getState();
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

  await storageAdapter.saveLink(link);
  stateStore.setState({ links: [...state.links, link], selectedCardId: targetId });
  return link;
}

export async function deleteLinksBetween(firstId, secondId, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const state = stateStore.getState();
  const matches = state.links.filter((link) =>
    (link.sourceId === firstId && link.targetId === secondId)
    || (link.sourceId === secondId && link.targetId === firstId));

  await Promise.all(matches.map((link) => storageAdapter.deleteLink(link.id)));
  const deletedIds = new Set(matches.map((link) => link.id));
  stateStore.setState({
    links: state.links.filter((link) => !deletedIds.has(link.id)),
    selectedCardId: secondId,
  });

  return matches;
}
