import store from '../state/store.js';
import storage from '../storage/index.js';
import { createLinkRecord, normalizeLink } from '../domain/link.js';

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

  const link = createLinkRecord({
    sourceId,
    targetId,
    type: options.relationType,
  }, state.cards);

  const duplicate = state.links.find((candidate) => {
    const normalized = normalizeLink(candidate, state.cards);
    return normalized.sourceId === link.sourceId
      && normalized.targetId === link.targetId
      && normalized.type === link.type;
  });
  if (duplicate) return normalizeLink(duplicate, state.cards);

  await storageAdapter.saveLink(link);
  stateStore.setState({ links: [...state.links, link], selectedCardId: link.targetId });
  return link;
}

export async function updateLinkType(linkId, relationType, options = {}) {
  const { stateStore, storageAdapter } = resolveDependencies(options);
  const state = stateStore.getState();
  const existing = state.links.find((link) => link.id === linkId);
  if (!existing) throw new Error(`Link not found: ${linkId}`);

  const updated = normalizeLink({
    ...existing,
    type: relationType,
    updatedAt: new Date().toISOString(),
  }, state.cards);

  await storageAdapter.saveLink(updated);
  stateStore.setState({
    links: state.links.map((link) => link.id === linkId ? updated : link),
  });
  return updated;
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
